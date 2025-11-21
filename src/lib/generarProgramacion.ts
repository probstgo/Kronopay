import { createClient } from '@supabase/supabase-js'
import type { TipoEventoTrigger } from './evaluarTriggers'

// Cliente con service_role (bypass RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type EstadoProgramacion = 'pendiente' | 'ejecutado' | 'fallido'

interface NodoContextoState {
  programacion_id: string
  estado: EstadoProgramacion
  tipo_evento: TipoEventoTrigger
  fecha_programada: string
  dias_relativos: number | null
  ultima_ejecucion?: string | null
}

interface WorkflowContexto {
  nodos?: Record<string, NodoContextoState>
  programaciones?: Record<string, { nodo_id: string; estado: EstadoProgramacion }>
}

function parseWorkflowContexto(raw: unknown): WorkflowContexto {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const context = raw as WorkflowContexto
  return {
    nodos: context.nodos ? { ...context.nodos } : {},
    programaciones: context.programaciones ? { ...context.programaciones } : {}
  }
}

interface GenerarProgramacionOptions {
  contexto?: WorkflowContexto
  fechaEvento?: Date | null
}

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
  fecha_vencimiento: string,
  opciones: GenerarProgramacionOptions = {}
): Promise<boolean> {
  // Log de identificación: rastrear quién llama a esta función
  const stackTrace = new Error().stack
  const caller = stackTrace?.split('\n')[2]?.trim() || 'unknown'
  console.log(`🔵 [GENERAR_PROGRAMACION] Llamada desde: ${caller}`)
  console.log(`🔵 [GENERAR_PROGRAMACION] Parámetros: nodo_id=${nodo_id}, deuda_id=${deuda_id}, workflow_id=${workflow_id}, tipo_evento=${tipo_evento}`)
  
  try {
    // 0. Obtener estado actual del workflow para esta deuda (deduplicación)
    let contextoActual: WorkflowContexto
    if (opciones.contexto) {
      contextoActual = parseWorkflowContexto(opciones.contexto)
    } else {
      const { data: workflowState } = await supabase
        .from('workflow_deuda_state')
        .select('contexto')
        .eq('workflow_id', workflow_id)
        .eq('deuda_id', deuda_id)
        .maybeSingle()

      contextoActual = parseWorkflowContexto(workflowState?.contexto)
    }
    const estadoNodoExistente = contextoActual.nodos?.[nodo_id]

    if (estadoNodoExistente) {
      if (estadoNodoExistente.estado === 'pendiente' || estadoNodoExistente.estado === 'ejecutado') {
        console.log(`⚠️ Nodo ${nodo_id} ya fue programado para deuda ${deuda_id}. Estado: ${estadoNodoExistente.estado}`)
        return false
      }
      // Si estaba en fallido, permitimos reintentar
      if (estadoNodoExistente.programacion_id && contextoActual.programaciones) {
        delete contextoActual.programaciones[estadoNodoExistente.programacion_id]
      }
    }

    // Verificación de duplicados usando nodo_id directamente (solución definitiva y escalable)
    const { data: programacionDuplicada } = await supabase
      .from('programaciones')
      .select('id, estado')
      .eq('campana_id', workflow_id)
      .eq('deuda_id', deuda_id)
      .eq('nodo_id', nodo_id)
      .in('estado', ['pendiente', 'ejecutando'])
      .maybeSingle()

    if (programacionDuplicada) {
      console.log(`⚠️ Ya existe programación ${programacionDuplicada.id} (${programacionDuplicada.estado}) para nodo ${nodo_id} y deuda ${deuda_id}`)
      return false
    }

    // Verificación adicional: detectar programaciones antiguas sin nodo_id para la misma campaña+deuda
    // Esto previene duplicados cuando hay programaciones creadas antes de agregar el campo nodo_id
    const { data: programacionesSinNodo } = await supabase
      .from('programaciones')
      .select('id, estado')
      .eq('campana_id', workflow_id)
      .eq('deuda_id', deuda_id)
      .is('nodo_id', null)
      .in('estado', ['pendiente', 'ejecutando'])
      .limit(1)

    if (programacionesSinNodo && programacionesSinNodo.length > 0) {
      console.log(`⚠️ Ya existe programación antigua sin nodo_id ${programacionesSinNodo[0].id} (${programacionesSinNodo[0].estado}) para campaña ${workflow_id} y deuda ${deuda_id}. Eliminando duplicado antiguo.`)
      // Eliminar la programación antigua sin nodo_id para evitar duplicados
      await supabase
        .from('programaciones')
        .delete()
        .eq('id', programacionesSinNodo[0].id)
      // Continuar con la creación de la nueva programación con nodo_id
    }

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

    // Verificación de estado: asegurar que el estado de la deuda sea correcto para el tipo de trigger
    // Esto previene crear programaciones para deudas con estados incorrectos
    if (tipo_evento === 'deuda_creada' && deuda.estado !== 'nueva') {
      console.log(`⚠️ Trigger deuda_creada no aplica para deuda ${deuda_id} con estado ${deuda.estado}. Solo aplica para estado "nueva".`)
      return false
    }
    if (tipo_evento === 'dias_despues_vencimiento' && deuda.estado !== 'vencida') {
      console.log(`⚠️ Trigger dias_despues_vencimiento no aplica para deuda ${deuda_id} con estado ${deuda.estado}. Solo aplica para estado "vencida".`)
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

    // Verificación de filtros de estado de deuda en la configuración del nodo
    // Si el nodo tiene filtros de estado configurados, verificar que el estado de la deuda coincida
    const filtros = (configuracion.filtros || {}) as {
      estado_deuda?: string[]
      rango_monto?: { min: number | null; max: number | null }
      dias_vencidos?: { min: number | null; max: number | null }
      tipo_contacto?: string[]
      historial_acciones?: string[]
    }

    if (filtros.estado_deuda && filtros.estado_deuda.length > 0) {
      // Verificar que el estado de la deuda esté en la lista de estados permitidos
      if (!filtros.estado_deuda.includes(deuda.estado)) {
        console.log(`⚠️ Nodo ${nodo_id} tiene filtro de estado_deuda [${filtros.estado_deuda.join(', ')}] pero la deuda ${deuda_id} tiene estado ${deuda.estado}. No se generará programación.`)
        return false
      }
    }

    // 5. Calcular fecha_programada según tipo_evento y dias_relativos
    const diasRelativosNumero = typeof dias_relativos === 'number'
      ? dias_relativos
      : dias_relativos === null || dias_relativos === undefined
        ? null
        : Number(dias_relativos)

    // Validación adicional para dias_despues_vencimiento
    if (tipo_evento === 'dias_despues_vencimiento' && deuda.estado !== 'vencida') {
      console.log(`⚠️ Nodo ${nodo_id} requiere deuda vencida pero estado actual es ${deuda.estado}`)
      return false
    }

    const fechaProgramada = calcularFechaProgramada(
      tipo_evento,
      diasRelativosNumero,
      fecha_vencimiento,
      opciones.fechaEvento
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
    console.log(`🔵 [GENERAR_PROGRAMACION] Insertando programación con nodo_id=${nodo_id} para deuda ${deuda_id}`)
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
        estado: 'pendiente',
        nodo_id: nodo_id
      })
      .select()
      .single()

    if (programacionError || !programacion) {
      console.error('Error creando programación:', programacionError)
      return false
    }

    console.log(`🔵 [GENERAR_PROGRAMACION] Programación creada: id=${programacion.id}, nodo_id=${programacion.nodo_id || 'NULL'}`)

    // 10. Actualizar o crear workflow_deuda_state
    const proximaEvaluacion = calcularProximaEvaluacion(
      tipo_evento,
      dias_relativos,
      fecha_vencimiento
    )

    const contextoActualizado: WorkflowContexto = {
      nodos: {
        ...(contextoActual.nodos || {}),
        [nodo_id]: {
          programacion_id: programacion.id,
          estado: 'pendiente',
          tipo_evento,
          fecha_programada: fechaProgramada.toISOString(),
          dias_relativos: diasRelativosNumero ?? null,
          ultima_ejecucion: null
        }
      },
      programaciones: {
        ...(contextoActual.programaciones || {}),
        [programacion.id]: {
          nodo_id,
          estado: 'pendiente'
        }
      }
    }

    const { error: stateError } = await supabase
      .from('workflow_deuda_state')
      .upsert({
        workflow_id: workflow_id,
        deuda_id: deuda_id,
        ultimo_nodo_id: nodo_id,
        proxima_evaluacion: proximaEvaluacion?.toISOString() || null,
        contexto: contextoActualizado,
        actualizado_at: new Date().toISOString()
      }, {
        onConflict: 'workflow_id,deuda_id'
      })

    if (stateError) {
      console.error('Error actualizando workflow_deuda_state:', stateError)
      // No fallar si esto falla, la programación ya se creó
    }

    console.log('✅ Programación generada', {
      programacion_id: programacion.id,
      workflow_id,
      nodo_id,
      tipo_evento,
      deuda_id,
      estado_deuda: deuda.estado,
      fecha_programada: fechaProgramada.toISOString()
    })
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
  fecha_vencimiento: string,
  fecha_evento?: Date | null
): Date {
  const fechaVenc = new Date(fecha_vencimiento)
  fechaVenc.setHours(9, 0, 0, 0) // Hora por defecto: 9:00 AM

  const hoy = new Date()
  hoy.setHours(9, 0, 0, 0)
  const ahora = new Date()

  switch (tipo_evento) {
    case 'deuda_creada':
      // Programar para hoy mismo (el cron lo ejecutará en la próxima corrida si fecha_programada <= ahora)
      // Si se usa fecha_evento (del trigger), usar esa fecha; sino usar hoy
      if (fecha_evento) {
        const fechaEvento = new Date(fecha_evento)
        fechaEvento.setHours(9, 0, 0, 0)
        return fechaEvento
      }
      // Programar para hoy a las 9:00 AM
      return hoy

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
      if (fecha_evento) {
        const fechaPago = new Date(fecha_evento)
        fechaPago.setHours(9, 0, 0, 0)
        return fechaPago
      }
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

