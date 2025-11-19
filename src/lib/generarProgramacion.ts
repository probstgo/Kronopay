import { createClient } from '@supabase/supabase-js'
import type { TipoEventoTrigger } from './evaluarTriggers'

// Cliente con service_role (bypass RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Genera una programación desde un nodo específico de un workflow
 * 
 * @param nodo_id ID del nodo desde el cual generar la programación
 * @param deuda_id ID de la deuda
 * @param workflow_id ID del workflow
 * @param tipo_evento Tipo de evento que disparó esta programación
 * @param dias_relativos Días relativos al evento (si aplica)
 * @param fecha_vencimiento Fecha de vencimiento de la deuda
 * @returns true si se generó la programación, false en caso contrario
 */
export async function generarProgramacionDesdeNodo(
  nodo_id: string,
  deuda_id: string,
  workflow_id: string,
  tipo_evento: TipoEventoTrigger,
  dias_relativos: number | null,
  fecha_vencimiento: string
): Promise<boolean> {
  try {
    // 1. Obtener información de la deuda y deudor
    const { data: deuda, error: deudaError } = await supabase
      .from('deudas')
      .select(`
        id,
        usuario_id,
        deudor_id,
        rut,
        monto,
        fecha_vencimiento,
        estado,
        deudores!inner(id, nombre)
      `)
      .eq('id', deuda_id)
      .is('eliminada_at', null)
      .single()

    if (deudaError || !deuda) {
      console.error('Error obteniendo deuda:', deudaError)
      return false
    }

    // 2. Obtener el workflow y su canvas_data para encontrar el nodo
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows_cobranza')
      .select('id, canvas_data')
      .eq('id', workflow_id)
      .single()

    if (workflowError || !workflow) {
      console.error('Error obteniendo workflow:', workflowError)
      return false
    }

    const canvasData = workflow.canvas_data as {
      nodes?: Array<{
        id: string
        type: string
        data: Record<string, unknown>
      }>
    }

    // 3. Buscar el nodo en el canvas
    const nodo = canvasData.nodes?.find(n => n.id === nodo_id)
    if (!nodo) {
      console.error(`Nodo ${nodo_id} no encontrado en workflow ${workflow_id}`)
      return false
    }

    // 4. Obtener configuración del nodo
    const configuracion = (nodo.data.configuracion || {}) as Record<string, unknown>

    // 5. Calcular fecha_programada según tipo_evento y dias_relativos
    const fechaProgramada = calcularFechaProgramada(
      tipo_evento,
      dias_relativos,
      fecha_vencimiento
    )

    // 6. Obtener contacto preferido del deudor según el tipo de acción
    const tipoAccion = nodo.type as 'email' | 'llamada' | 'sms' | 'whatsapp'
    const contactoId = await obtenerContactoDeudor(
      deuda.deudor_id,
      tipoAccion
    )

    if (!contactoId && tipoAccion !== 'llamada') {
      // Para llamadas, el contacto puede ser opcional si se usa agente
      console.log(`No se encontró contacto para deudor ${deuda.deudor_id}, tipo: ${tipoAccion}`)
      // Continuamos de todas formas, puede que se use agente
    }

    // 7. Preparar variables para la programación
    // Normalizar deudores: Supabase puede retornar como array o objeto
    const deudoresNormalizado = Array.isArray(deuda.deudores) 
      ? deuda.deudores[0] 
      : deuda.deudores
    const nombreDeudor = (deudoresNormalizado as { nombre?: string })?.nombre || 'Cliente'
    
    const vars: Record<string, string> = {
      nombre: nombreDeudor,
      monto: `$${deuda.monto || 0}`,
      fecha_vencimiento: deuda.fecha_vencimiento
    }

    // Calcular días vencidos si aplica
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const fechaVenc = new Date(deuda.fecha_vencimiento)
    fechaVenc.setHours(0, 0, 0, 0)
    const diasVencidos = Math.max(0, Math.floor((hoy.getTime() - fechaVenc.getTime()) / (1000 * 60 * 60 * 24)))
    vars.dias_vencidos = diasVencidos.toString()

    // 8. Extraer información específica según el tipo de nodo
    let plantillaId: string | null = null
    let agenteId: string | null = null
    let vozConfig: Record<string, unknown> | null = null

    if (tipoAccion === 'email' || tipoAccion === 'sms' || tipoAccion === 'whatsapp') {
      plantillaId = (configuracion.plantilla_id as string) || null
    }

    if (tipoAccion === 'llamada') {
      agenteId = (configuracion.agente_id as string) || null
      vozConfig = (configuracion.configuracion_avanzada as Record<string, unknown>)?.voz_config as Record<string, unknown> || null
    }

    // 9. Crear programación
    const { data: programacion, error: programacionError } = await supabase
      .from('programaciones')
      .insert({
        usuario_id: deuda.usuario_id,
        deuda_id: deuda_id,
        rut: deuda.rut,
        contacto_id: contactoId,
        campana_id: workflow_id,
        tipo_accion: tipoAccion,
        plantilla_id: plantillaId,
        agente_id: agenteId,
        vars: vars,
        voz_config: vozConfig,
        fecha_programada: fechaProgramada.toISOString(),
        estado: 'pendiente'
      })
      .select()
      .single()

    if (programacionError || !programacion) {
      console.error('Error creando programación:', programacionError)
      return false
    }

    // 10. Actualizar o crear workflow_deuda_state
    const proximaEvaluacion = calcularProximaEvaluacion(
      tipo_evento,
      dias_relativos,
      fecha_vencimiento
    )

    const { error: stateError } = await supabase
      .from('workflow_deuda_state')
      .upsert({
        workflow_id: workflow_id,
        deuda_id: deuda_id,
        ultimo_nodo_id: nodo_id,
        proxima_evaluacion: proximaEvaluacion?.toISOString() || null,
        contexto: {
          ultima_programacion_id: programacion.id,
          tipo_evento: tipo_evento,
          fecha_programada: fechaProgramada.toISOString()
        },
        actualizado_at: new Date().toISOString()
      }, {
        onConflict: 'workflow_id,deuda_id'
      })

    if (stateError) {
      console.error('Error actualizando workflow_deuda_state:', stateError)
      // No fallar si esto falla, la programación ya se creó
    }

    console.log(`✅ Programación generada: ${programacion.id} para deuda ${deuda_id}, nodo ${nodo_id}`)
    return true
  } catch (error) {
    console.error('Error en generarProgramacionDesdeNodo:', error)
    return false
  }
}

/**
 * Calcula la fecha programada según el tipo de evento y días relativos
 */
function calcularFechaProgramada(
  tipo_evento: TipoEventoTrigger,
  dias_relativos: number | null,
  fecha_vencimiento: string
): Date {
  const fechaVenc = new Date(fecha_vencimiento)
  fechaVenc.setHours(9, 0, 0, 0) // Hora por defecto: 9:00 AM

  const hoy = new Date()
  hoy.setHours(9, 0, 0, 0)

  switch (tipo_evento) {
    case 'deuda_creada':
      // Programar para hoy o mañana si ya pasó el horario
      if (hoy.getTime() < new Date().getTime()) {
        return hoy
      }
      const manana = new Date(hoy)
      manana.setDate(manana.getDate() + 1)
      return manana

    case 'dias_antes_vencimiento':
      if (dias_relativos === null) return hoy
      const fechaAntes = new Date(fechaVenc)
      fechaAntes.setDate(fechaAntes.getDate() - dias_relativos)
      return fechaAntes

    case 'dia_vencimiento':
      return fechaVenc

    case 'dias_despues_vencimiento':
      if (dias_relativos === null) return hoy
      const fechaDespues = new Date(fechaVenc)
      fechaDespues.setDate(fechaDespues.getDate() + dias_relativos)
      return fechaDespues

    case 'pago_registrado':
      // Programar para hoy
      return hoy

    default:
      return hoy
  }
}

/**
 * Calcula la próxima evaluación para workflow_deuda_state
 */
function calcularProximaEvaluacion(
  tipo_evento: TipoEventoTrigger,
  dias_relativos: number | null,
  fecha_vencimiento: string
): Date | null {
  // Solo calcular próxima evaluación para eventos que pueden repetirse
  if (tipo_evento === 'deuda_creada' || tipo_evento === 'pago_registrado') {
    return null // No hay próxima evaluación para estos eventos
  }

  const fechaVenc = new Date(fecha_vencimiento)
  fechaVenc.setHours(0, 0, 0, 0)

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  switch (tipo_evento) {
    case 'dias_antes_vencimiento':
      if (dias_relativos === null) return null
      const fechaAntes = new Date(fechaVenc)
      fechaAntes.setDate(fechaAntes.getDate() - dias_relativos)
      // Si ya pasó, no hay próxima evaluación
      return fechaAntes >= hoy ? fechaAntes : null

    case 'dia_vencimiento':
      // Si ya pasó, no hay próxima evaluación
      return fechaVenc >= hoy ? fechaVenc : null

    case 'dias_despues_vencimiento':
      if (dias_relativos === null) return null
      const fechaDespues = new Date(fechaVenc)
      fechaDespues.setDate(fechaDespues.getDate() + dias_relativos)
      // Si ya pasó, no hay próxima evaluación
      return fechaDespues >= hoy ? fechaDespues : null

    default:
      return null
  }
}

/**
 * Obtiene el contacto preferido del deudor según el tipo de acción
 */
async function obtenerContactoDeudor(
  deudor_id: string,
  tipoAccion: 'email' | 'llamada' | 'sms' | 'whatsapp'
): Promise<string | null> {
  let tipoContacto: 'email' | 'telefono' | 'sms' | 'whatsapp' | null = null

  switch (tipoAccion) {
    case 'email':
      tipoContacto = 'email'
      break
    case 'llamada':
    case 'sms':
      tipoContacto = 'telefono'
      break
    case 'whatsapp':
      tipoContacto = 'whatsapp'
      break
    default:
      return null
  }

  if (!tipoContacto) {
    return null
  }

  // Buscar contacto preferido primero, luego cualquier contacto del tipo
  const { data: contactos } = await supabase
    .from('contactos')
    .select('id')
    .eq('deudor_id', deudor_id)
    .eq('tipo_contacto', tipoContacto)
    .order('preferido', { ascending: false })
    .limit(1)

  return contactos && contactos.length > 0 ? contactos[0].id : null
}

