import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { ejecutarCampana, NodoCampana, ConexionCampana } from '@/lib/ejecutarCampana'
import { Resend } from 'resend'
import { ProgramaEjecucion, Contacto, Plantilla } from '@/types/programa'
import { registrarLogEjecucion, crearEjecucionWorkflow, actualizarEjecucionWorkflow } from '@/lib/logsEjecucion'
import { enviarSms } from '@/lib/twilio'

// Tipos para ejecución inmediata
interface ResultadoEjecucion {
  exito: boolean
  external_id?: string
  detalles?: unknown
  error?: string
}

interface ProgramacionConRelaciones {
  id: string
  usuario_id: string
  deuda_id: string
  rut?: string
  contacto_id: string | null
  campana_id: string | null
  tipo_accion: string
  plantilla_id: string | null
  agente_id: string | null
  vars: Record<string, string> | null
  voz_config: Record<string, unknown> | null
  contactos?: Contacto | Contacto[]
  plantillas?: Plantilla | Plantilla[]
  deudas?: Array<{
    monto: number
    fecha_vencimiento: string
    deudor_id: string
    rut?: string
  }> | {
    monto: number
    fecha_vencimiento: string
    deudor_id: string
    rut?: string
  }
}

interface DetalleEjecucion {
  programacion_id: string
  tipo_accion: string
  destinatario: string
  exito: boolean
  external_id?: string
  error?: string
}

interface ResultadoEjecucionInmediata {
  exitosas: number
  fallidas: number
  detalles: DetalleEjecucion[]
}

// Cliente con service_role para operaciones del servidor
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Funciones auxiliares para resolver plantillas (necesaria antes de las otras)
function resolverPlantilla(contenido: string, vars: Record<string, string>): string {
  if (!contenido) return ''
  if (!vars || Object.keys(vars).length === 0) return contenido

  const valoresPorDefecto: Record<string, string> = {
    nombre: 'Cliente',
    monto: '$0',
    fecha_vencimiento: 'No especificada',
    dias_vencidos: '0',
    email: '',
    telefono: '',
    empresa: 'Nuestra empresa'
  }
  
  let resultado = contenido
  const regexVariables = /\{\{([^}]+)\}\}/g
  const variablesEncontradas = new Set<string>()
  let match

  while ((match = regexVariables.exec(contenido)) !== null) {
    const nombreVariable = match[1].trim()
    if (nombreVariable) {
      variablesEncontradas.add(nombreVariable)
    }
  }

  for (const variable of variablesEncontradas) {
    const valor = vars[variable] !== undefined && vars[variable] !== null
      ? String(vars[variable])
      : valoresPorDefecto[variable] || ''

    const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g')
    resultado = resultado.replace(regex, valor)
  }

  resultado = resultado.replace(/\{\{[^}]+\}\}/g, '')

  return resultado
}

// Funciones auxiliares para ejecutar comunicaciones
async function enviarEmailPrueba(prog: ProgramaEjecucion): Promise<ResultadoEjecucion> {
  try {
    // Validar que exista la plantilla (datos reales de la BD)
    if (!prog.plantillas || prog.plantillas.length === 0) {
      return { exito: false, error: 'No se encontró la plantilla en la base de datos. Asegúrate de que la plantilla existe y está configurada correctamente.' }
    }
    // Validar que exista el contacto (datos reales de la BD)
    if (!prog.contactos || prog.contactos.length === 0) {
      return { exito: false, error: 'No se encontró el contacto del deudor en la base de datos. Asegúrate de que el deudor tenga un contacto de tipo email registrado.' }
    }

    const plantilla = prog.plantillas[0] as {
      contenido: string
      asunto?: string
      tipo_contenido?: 'texto' | 'html'
    }
    const contacto = prog.contactos[0]
    const vars = prog.vars || {}

    // Validar que el contacto sea de tipo email (datos reales)
    if (contacto.tipo_contacto !== 'email') {
      return { exito: false, error: `El contacto del deudor no es de tipo email (tipo actual: ${contacto.tipo_contacto}). Asegúrate de que el deudor tenga un contacto de tipo email registrado.` }
    }

    const contenidoResuelto = resolverPlantilla(plantilla.contenido, vars)
    const asuntoResuelto = plantilla.asunto
      ? resolverPlantilla(plantilla.asunto, vars)
      : 'Recordatorio de Pago'

    let htmlContent: string
    if (plantilla.tipo_contenido === 'html') {
      htmlContent = contenidoResuelto
    } else {
      const textoFormateado = contenidoResuelto
        .replace(/\n/g, '<br>')
        .replace(/\r/g, '')
      htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="line-height: 1.6; color: #333;">${textoFormateado}</div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #999;">Enviado desde tu sistema de cobranza</p>
      </div>`
    }

    const { fromEmail } = await import('@/lib/resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
  
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: contacto.valor,
      subject: asuntoResuelto,
      html: htmlContent
    })

    if (error) {
      return {
        exito: false,
        error: `Error al enviar el email: ${JSON.stringify(error)}`,
        detalles: error
      }
    }

    return {
      exito: true,
      external_id: data?.id,
      detalles: data
    }
  } catch (error) {
    return {
      exito: false,
      error: error instanceof Error ? error.message : 'Error desconocido al enviar email',
      detalles: error
    }
  }
}

async function ejecutarLlamadaPrueba(prog: ProgramaEjecucion): Promise<ResultadoEjecucion> {
  try {
    // Validar que se haya especificado un agente
    if (!prog.agente_id) {
      return { exito: false, error: 'No se especificó un agente para la llamada. Configura un agente en el nodo de llamada.' }
    }
    // Validar que exista el contacto (datos reales de la BD)
    if (!prog.contactos || prog.contactos.length === 0) {
      return { exito: false, error: 'No se encontró el contacto del deudor en la base de datos. Asegúrate de que el deudor tenga un contacto de tipo teléfono registrado.' }
    }

    const contacto = prog.contactos[0]
    // Validar que el contacto sea de tipo teléfono (datos reales)
    if (contacto.tipo_contacto !== 'telefono') {
      return { exito: false, error: `El contacto del deudor no es de tipo teléfono (tipo actual: ${contacto.tipo_contacto}). Asegúrate de que el deudor tenga un contacto de tipo teléfono registrado.` }
    }

    // Validar que el agente exista en la BD (datos reales)
    // prog.agente_id es el UUID de la tabla llamada_agente
    // Buscar agentes del usuario o agentes globales (usuario_id IS NULL)
    const { data: agenteData, error: agenteError } = await supabaseServiceRole
      .from('llamada_agente')
      .select('id, agent_id, nombre, activo')
      .eq('id', prog.agente_id)
      .or(`usuario_id.eq.${prog.usuario_id},usuario_id.is.null`)
      .single()

    if (agenteError || !agenteData) {
      return { exito: false, error: `No se encontró el agente en la base de datos (ID: ${prog.agente_id}). Asegúrate de que el agente existe y está configurado correctamente.` }
    }

    // Validar que el agente esté activo
    if (!agenteData.activo) {
      return { exito: false, error: 'El agente no está activo. Activa el agente antes de ejecutar la llamada.' }
    }

    const vars = prog.vars || {}
    const dynamicVariables = {
      nombre_deudor: vars.nombre || 'Cliente',
      monto: vars.monto || '$0',
      fecha_vencimiento: vars.fecha_vencimiento || 'No especificada',
      dias_vencidos: vars.dias_vencidos || '0',
      empresa: vars.empresa || 'Nuestra empresa',
      telefono: contacto.valor,
      email: vars.email || ''
    }

    const { startOutboundCall } = await import('@/lib/elevenlabs')

    // Usar agent_id de ElevenLabs (no el UUID de la BD)
    const resultado = await startOutboundCall({
      agentId: agenteData.agent_id,
      toNumber: contacto.valor,
      dynamicVariables
    }) as unknown as { success: boolean; callId?: string; [key: string]: unknown }

    if (!resultado || !resultado.success) {
      return {
        exito: false,
        error: `Error al ejecutar la llamada en ElevenLabs: ${JSON.stringify(resultado)}`,
        detalles: resultado
      }
    }

    return {
      exito: true,
      external_id: resultado.callId,
      detalles: resultado
    }
  } catch (error) {
    return {
      exito: false,
      error: error instanceof Error ? error.message : 'Error desconocido al ejecutar llamada',
      detalles: error
    }
  }
}

async function enviarSMSPrueba(prog: ProgramaEjecucion): Promise<ResultadoEjecucion> {
  try {
    // Validar que exista la plantilla (datos reales de la BD)
    if (!prog.plantillas || prog.plantillas.length === 0) {
      return { exito: false, error: 'No se encontró la plantilla en la base de datos. Asegúrate de que la plantilla existe y está configurada correctamente.' }
    }
    // Validar que exista el contacto (datos reales de la BD)
    if (!prog.contactos || prog.contactos.length === 0) {
      return { exito: false, error: 'No se encontró el contacto del deudor en la base de datos. Asegúrate de que el deudor tenga un contacto de tipo teléfono registrado.' }
    }

    const plantilla = prog.plantillas[0]
    const contacto = prog.contactos[0]
    const vars = prog.vars || {}

    // Validar que el contacto sea de tipo teléfono (datos reales)
    if (contacto.tipo_contacto !== 'telefono') {
      return { exito: false, error: `El contacto del deudor no es de tipo teléfono (tipo actual: ${contacto.tipo_contacto}). Asegúrate de que el deudor tenga un contacto de tipo teléfono registrado.` }
    }

    const contenidoResuelto = resolverPlantilla(plantilla.contenido, vars)

    if (!contenidoResuelto.trim()) {
      return { exito: false, error: 'El contenido del SMS está vacío' }
    }

    if (contenidoResuelto.length > 160) {
      return { exito: false, error: 'El contenido del SMS es demasiado largo (máximo 160 caracteres)' }
    }

    const resultadoTwilio = await enviarSms({
      to: contacto.valor,
      mensaje: contenidoResuelto
    })

    if (!resultadoTwilio.exito && !resultadoTwilio.queued) {
      return {
        exito: false,
        error: resultadoTwilio.error || 'Error desconocido al enviar SMS',
        detalles: {
          tipo_error: resultadoTwilio.error_type || 'destinatario'
        }
      }
    }

    return {
      exito: true,
      external_id: resultadoTwilio.sid,
      detalles: {
        to: contacto.valor,
        message: contenidoResuelto,
        length: contenidoResuelto.length,
        twilio_sid: resultadoTwilio.sid || null,
        enqueued: resultadoTwilio.queued || false,
        tipo_error: resultadoTwilio.error_type || null
      }
    }
  } catch (error) {
    return {
      exito: false,
      error: error instanceof Error ? error.message : 'Error desconocido al enviar SMS',
      detalles: error
    }
  }
}

async function enviarWhatsAppPrueba(prog: ProgramaEjecucion): Promise<ResultadoEjecucion> {
  // TODO: Implementar con Twilio WhatsApp
  return { exito: false, error: 'WhatsApp no implementado aún' }
}

/**
 * Ejecuta las programaciones recién creadas inmediatamente (modo prueba)
 */
async function ejecutarProgramacionesInmediatamente({
  supabase,
  usuario_id,
  campana_id
}: {
  supabase: ReturnType<typeof createServerClient>
  usuario_id: string
  campana_id: string
}): Promise<ResultadoEjecucionInmediata> {
  const detalles: DetalleEjecucion[] = []
  let exitosas = 0
  let fallidas = 0

  try {
    // Obtener programaciones pendientes recién creadas para esta campaña
    const { data: programaciones, error } = await supabaseServiceRole
      .from('programaciones')
      .select(`
        id,
        usuario_id,
        deuda_id,
        rut,
        contacto_id,
        campana_id,
        tipo_accion,
        plantilla_id,
        agente_id,
        vars,
        voz_config,
        contactos(valor, tipo_contacto),
        plantillas(contenido, asunto, tipo_contenido, nombre),
        deudas(monto, fecha_vencimiento, deudor_id)
      `)
      .eq('estado', 'pendiente')
      .eq('campana_id', campana_id)
      .eq('usuario_id', usuario_id)

    if (error) throw error

    if (!programaciones || programaciones.length === 0) {
      return { exitosas: 0, fallidas: 0, detalles: [] }
    }

    // Normalizar relaciones
    const programacionesNormalizadas = (programaciones || []).map((prog: ProgramacionConRelaciones): ProgramaEjecucion => {
      let contactosNormalizados: Contacto[] = []
      if (prog.contactos) {
        contactosNormalizados = Array.isArray(prog.contactos) ? prog.contactos : [prog.contactos]
      }
      
      let plantillasNormalizadas: Plantilla[] = []
      if (prog.plantillas) {
        plantillasNormalizadas = Array.isArray(prog.plantillas) ? prog.plantillas : [prog.plantillas]
      }
      
      let deudasNormalizadas: Array<{
        monto: number
        fecha_vencimiento: string
        deudor_id: string
        rut?: string
      }> = []
      if (prog.deudas) {
        deudasNormalizadas = Array.isArray(prog.deudas) ? prog.deudas : [prog.deudas]
      }
      
      return {
        id: prog.id,
        usuario_id: prog.usuario_id,
        deuda_id: prog.deuda_id,
        contacto_id: prog.contacto_id || null,
        campana_id: prog.campana_id || null,
        tipo_accion: prog.tipo_accion,
        plantilla_id: prog.plantilla_id || null,
        agente_id: prog.agente_id || null,
        vars: prog.vars || {},
        voz_config: prog.voz_config || {},
        contactos: contactosNormalizados,
        plantillas: plantillasNormalizadas,
        deudas: deudasNormalizadas,
        rut: prog.rut || ''
      } as ProgramaEjecucion & { rut?: string }
    })

    // Ejecutar cada programación
    for (const prog of programacionesNormalizadas) {
      const inicioTiempo = Date.now()
      let ejecucionId: string | null = null

      try {
        // Marcar como ejecutando
        await supabaseServiceRole
          .from('programaciones')
          .update({ estado: 'ejecutando' })
          .eq('id', prog.id)
          .eq('estado', 'pendiente')

        // Buscar o crear ejecución_workflow
        if (prog.campana_id && prog.deuda_id) {
          const { data: deudaData } = await supabaseServiceRole
            .from('deudas')
            .select('deudor_id')
            .eq('id', prog.deuda_id)
            .is('eliminada_at', null)  // Solo deudas activas (soft delete)
            .single()

          if (deudaData?.deudor_id) {
            const { data: ejecucionExistente } = await supabaseServiceRole
              .from('ejecuciones_workflow')
              .select('id')
              .eq('workflow_id', prog.campana_id)
              .eq('deudor_id', deudaData.deudor_id)
              .order('iniciado_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (ejecucionExistente?.id) {
              ejecucionId = ejecucionExistente.id
            } else {
              ejecucionId = await crearEjecucionWorkflow({
                workflow_id: prog.campana_id,
                deudor_id: deudaData.deudor_id,
                usuario_id: prog.usuario_id,
                contexto_datos: {
                  programacion_id: prog.id,
                  tipo_accion: prog.tipo_accion,
                  modo_prueba: true
                }
              })
            }
          }
        }

        // Registrar log de inicio
        if (ejecucionId) {
          await registrarLogEjecucion({
            ejecucion_id: ejecucionId,
            nodo_id: `programacion_${prog.id}`,
            paso_numero: 1,
            tipo_accion: prog.tipo_accion as 'email' | 'llamada' | 'sms' | 'whatsapp',
            estado: 'iniciado',
            datos_entrada: {
              programacion_id: prog.id,
              deuda_id: prog.deuda_id,
              contacto_id: prog.contacto_id,
              plantilla_id: prog.plantilla_id,
              agente_id: prog.agente_id,
              vars: prog.vars,
              modo_prueba: true
            }
          })
        }

        // Ejecutar acción según tipo
        let resultado: ResultadoEjecucion = { exito: false, error: 'Tipo de acción no válido' }
        const destinatario = prog.contactos?.[0]?.valor || 'N/A'

        switch (prog.tipo_accion) {
          case 'email':
            resultado = await enviarEmailPrueba(prog as ProgramaEjecucion)
            break
          case 'llamada':
            resultado = await ejecutarLlamadaPrueba(prog as ProgramaEjecucion)
            break
          case 'sms':
            resultado = await enviarSMSPrueba(prog as ProgramaEjecucion)
            break
          case 'whatsapp':
            resultado = await enviarWhatsAppPrueba(prog as ProgramaEjecucion)
            break
        }

        // Registrar log de finalización
        const duracion = Date.now() - inicioTiempo
        if (ejecucionId) {
          await registrarLogEjecucion({
            ejecucion_id: ejecucionId,
            nodo_id: `programacion_${prog.id}`,
            paso_numero: 1,
            tipo_accion: prog.tipo_accion as 'email' | 'llamada' | 'sms' | 'whatsapp',
            estado: resultado.exito ? 'completado' : 'fallido',
            datos_entrada: {
              programacion_id: prog.id,
              deuda_id: prog.deuda_id,
              contacto_id: prog.contacto_id,
              plantilla_id: prog.plantilla_id,
              agente_id: prog.agente_id,
              vars: prog.vars,
              modo_prueba: true
            },
            datos_salida: {
              exito: resultado.exito,
              external_id: resultado.external_id,
              detalles: resultado.detalles
            },
            error_message: resultado.error,
            duracion_ms: duracion
          })

          await actualizarEjecucionWorkflow(ejecucionId, {
            estado: resultado.exito ? 'completado' : 'fallido',
            resultado_final: {
              programacion_id: prog.id,
              exito: resultado.exito,
              external_id: resultado.external_id,
              modo_prueba: true
            }
          })
        }

        // Registrar en historial con flag de prueba
        const progConRut = prog as ProgramaEjecucion & { rut?: string }
        let rutParaHistorial = ''
        if (progConRut.rut) {
          rutParaHistorial = progConRut.rut
        } else if (prog.deudas && prog.deudas.length > 0 && prog.deudas[0]?.rut) {
          rutParaHistorial = prog.deudas[0].rut
        }

        // Preparar detalles completos para historial
        const contacto = prog.contactos?.[0]
        const plantilla = prog.plantillas?.[0] as { asunto?: string; nombre?: string } | undefined
        
        // Obtener asunto resuelto si es email
        let asuntoResuelto: string | undefined
        if (prog.tipo_accion === 'email' && plantilla?.asunto) {
          asuntoResuelto = resolverPlantilla(plantilla.asunto, prog.vars || {})
        }

        // Construir detalles con toda la información necesaria
        const detallesHistorial: Record<string, unknown> = {
          ...resultado,
          modo_prueba: true,
          origen: 'prueba',
          plantilla_id: prog.plantilla_id || null,
          plantilla_nombre: plantilla?.nombre || null
        }

        // Agregar datos específicos según el tipo de acción
        if (prog.tipo_accion === 'email') {
          detallesHistorial.email = contacto?.valor || null
          if (asuntoResuelto) {
            detallesHistorial.asunto = asuntoResuelto
          }
        } else if (prog.tipo_accion === 'llamada' || prog.tipo_accion === 'sms' || prog.tipo_accion === 'whatsapp') {
          detallesHistorial.telefono = contacto?.valor || null
        }

        console.log(`📝 Registrando en historial (RUT: ${rutParaHistorial || 'N/A'}, campana_id: ${prog.campana_id || 'N/A'})`)
        const { error: historialError } = await supabaseServiceRole.from('historial').insert({
          usuario_id: prog.usuario_id,
          deuda_id: prog.deuda_id,
          rut: rutParaHistorial,
          contacto_id: prog.contacto_id || null,
          campana_id: prog.campana_id || null,
          tipo_accion: prog.tipo_accion,
          agente_id: prog.agente_id || null,
          fecha: new Date().toISOString(),
          estado: resultado.exito ? 'iniciado' : 'fallido',
          detalles: detallesHistorial
        })
        
        if (historialError) {
          console.error(`❌ Error al insertar en historial:`, historialError)
          console.error(`   Detalles del error:`, JSON.stringify(historialError, null, 2))
        } else {
          console.log(`✅ Registrado en historial exitosamente`)
        }

        // Marcar programación como ejecutada
        const estadoFinal = resultado.exito ? 'ejecutado' : 'cancelado'
        await supabaseServiceRole
          .from('programaciones')
          .update({ estado: estadoFinal })
          .eq('id', prog.id)

        // Agregar a detalles
        detalles.push({
          programacion_id: prog.id,
          tipo_accion: prog.tipo_accion,
          destinatario,
          exito: resultado.exito,
          external_id: resultado.external_id,
          error: resultado.error
        })

        if (resultado.exito) {
          exitosas++
        } else {
          fallidas++
        }

      } catch (err) {
        console.error(`Error procesando programación ${prog.id}:`, err)
        fallidas++
        detalles.push({
          programacion_id: prog.id,
          tipo_accion: prog.tipo_accion,
          destinatario: prog.contactos?.[0]?.valor || 'N/A',
          exito: false,
          error: err instanceof Error ? err.message : 'Error desconocido'
        })
        // Revertir a pendiente
        await supabaseServiceRole
          .from('programaciones')
          .update({ estado: 'pendiente' })
          .eq('id', prog.id)
      }
    }

    return { exitosas, fallidas, detalles }

  } catch (error) {
    console.error('Error ejecutando programaciones inmediatamente:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    // Crear cliente Supabase autenticado
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignorar errores de setAll en Server Components
            }
          },
        },
      }
    )

    // Verificar autenticación
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { campana_id, nodos, conexiones, deudores_iniciales, modo_prueba } = body

    // Validar datos requeridos
    if (!campana_id || !nodos || !Array.isArray(nodos) || !conexiones || !Array.isArray(conexiones)) {
      return NextResponse.json(
        { error: 'Datos incompletos: se requieren campana_id, nodos y conexiones' },
        { status: 400 }
      )
    }

    // Validar tipos de nodos soportados
    const tiposValidos: NodoCampana['tipo'][] = ['filtro', 'email', 'llamada', 'sms', 'whatsapp', 'espera', 'condicion']
    const nodosInvalidos = nodos.filter((nodo: { type: string }) => !tiposValidos.includes(nodo.type as NodoCampana['tipo']))
    
    if (nodosInvalidos.length > 0) {
      const tiposInvalidos = nodosInvalidos.map((n: { id: string, type: string }) => `${n.id}:${n.type}`).join(', ')
      return NextResponse.json(
        { error: `Tipos de nodos no soportados: ${tiposInvalidos}` },
        { status: 400 }
      )
    }

    // Convertir nodos y conexiones al formato esperado
    const nodosCampana: NodoCampana[] = nodos.map((nodo: { id: string, type: string, data: Record<string, unknown> }) => ({
      id: nodo.id,
      tipo: nodo.type as NodoCampana['tipo'],
      configuracion: (nodo.data.configuracion || {}) as Record<string, unknown>,
      data: nodo.data
    }))

    const conexionesCampana: ConexionCampana[] = conexiones.map((conn: { id: string, source: string, target: string, sourceHandle?: string }) => ({
      id: conn.id,
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourceHandle
    }))

    // Si no se proporcionan deudores iniciales, obtener todos los deudores del usuario
    const deudoresIniciales = deudores_iniciales || []
    
    if (deudoresIniciales.length === 0) {
      // Obtener todos los deudores del usuario (datos reales de la BD)
      const { data: deudoresData, error: deudoresError } = await supabase
        .from('deudores')
        .select('id, rut, nombre')
        .eq('usuario_id', session.user.id)

      if (deudoresError) {
        console.error('Error obteniendo deudores:', deudoresError)
        return NextResponse.json(
          { error: 'Error al obtener deudores de la base de datos. Asegúrate de tener deudores registrados.' },
          { status: 500 }
        )
      }

      if (!deudoresData || deudoresData.length === 0) {
        return NextResponse.json(
          { error: 'No se encontraron deudores en la base de datos. Agrega deudores antes de probar la campaña.' },
          { status: 400 }
        )
      }

      // Obtener deudas activas y contactos para cada deudor (datos reales)
      for (const deudor of deudoresData) {
        const { data: deudas, error: deudasError } = await supabase
          .from('deudas')
          .select('id, monto, fecha_vencimiento')
          .eq('deudor_id', deudor.id)
          .is('eliminada_at', null)  // Solo deudas activas (soft delete)
          .limit(1)

        if (deudasError) {
          console.error(`Error obteniendo deudas para deudor ${deudor.id}:`, deudasError)
          continue
        }

        const { data: contactos, error: contactosError } = await supabase
          .from('contactos')
          .select('id, valor, tipo_contacto')
          .eq('deudor_id', deudor.id)
          .limit(1)

        if (contactosError) {
          console.error(`Error obteniendo contactos para deudor ${deudor.id}:`, contactosError)
          continue
        }

        // Solo incluir deudores que tengan deuda (requisito mínimo)
        if (deudas && deudas.length > 0) {
          const deuda = deudas[0]
          const contacto = contactos && contactos.length > 0 ? contactos[0] : null

          deudoresIniciales.push({
            deuda_id: deuda.id,
            rut: deudor.rut || '',
            contacto_id: contacto?.id,
            vars: {
              nombre: deudor.nombre || 'Deudor',
              monto: `$${deuda.monto || 0}`,
              fecha_vencimiento: deuda.fecha_vencimiento || new Date().toISOString().split('T')[0]
            }
          })
        }
      }

      // Validar que se encontraron deudores con deudas
      if (deudoresIniciales.length === 0) {
        return NextResponse.json(
          { error: 'No se encontraron deudores con deudas registradas. Asegúrate de tener deudores con deudas antes de probar la campaña.' },
          { status: 400 }
        )
      }
    }

    // Ejecutar la campaña
    const resultado = await ejecutarCampana({
      usuario_id: session.user.id,
      campana_id,
      nodos: nodosCampana,
      conexiones: conexionesCampana,
      deudores_iniciales: deudoresIniciales
    })

    // Si está en modo prueba, ejecutar las programaciones inmediatamente
    if (modo_prueba) {
      const resultadosDetallados = await ejecutarProgramacionesInmediatamente({
        supabase,
        usuario_id: session.user.id,
        campana_id
      })

      return NextResponse.json({
        exito: true,
        modo_prueba: true,
        resultado: {
          programaciones_creadas: resultado.programaciones_creadas,
          exitosas: resultadosDetallados.exitosas,
          fallidas: resultadosDetallados.fallidas,
          detalles: resultadosDetallados.detalles
        },
        mensaje: `Prueba ejecutada: ${resultadosDetallados.exitosas} exitosas, ${resultadosDetallados.fallidas} fallidas`
      })
    }

    return NextResponse.json({
      exito: true,
      resultado: {
        programaciones_creadas: resultado.programaciones_creadas,
        exitosas: resultado.exitosas,
        fallidas: resultado.fallidas
      },
      mensaje: `Campaña ejecutada: ${resultado.programaciones_creadas} programaciones creadas`
    })

  } catch (error) {
    console.error('Error ejecutando campaña:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error ejecutando campaña', detalles: errorMessage },
      { status: 500 }
    )
  }
}

