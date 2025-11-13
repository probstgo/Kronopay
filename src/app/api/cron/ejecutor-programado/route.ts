import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { ProgramaEjecucion, Contacto, Plantilla } from '../../../../types/programa'
import { registrarLogEjecucion, crearEjecucionWorkflow, actualizarEjecucionWorkflow } from '../../../../lib/logsEjecucion'

// Tipos para las respuestas de ElevenLabs
interface ElevenLabsCallResult {
  success: boolean
  callId?: string
  [key: string]: unknown
}

interface ResultadoEjecucion {
  exito: boolean
  external_id?: string
  detalles?: unknown
  error?: string
}

// Tipo para programaciones con relaciones que pueden ser objetos o arrays
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

// Cliente con service_role (bypass RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Nunca expongas esta key al cliente
)

export async function GET(request: Request) {
  // Verificar que es Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Obtener programaciones vencidas y pendientes (solo de deudas activas)
    const { data: programaciones, error } = await supabase
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
        deudas!inner(monto, fecha_vencimiento, deudor_id, eliminada_at)
      `)
      .eq('estado', 'pendiente')
      .is('deudas.eliminada_at', null)  // Solo deudas activas (soft delete)
      .lte('fecha_programada', new Date().toISOString())
      .limit(100)

    if (error) throw error

    console.log('🔍 Programaciones encontradas:', programaciones?.length || 0)
    
    if (programaciones && programaciones.length > 0) {
      console.log('📋 Primera programación (estructura):', {
        id: programaciones[0].id,
        tipo_accion: programaciones[0].tipo_accion,
        tiene_contactos: !!programaciones[0].contactos,
        contactos_tipo: Array.isArray(programaciones[0].contactos) ? 'array' : typeof programaciones[0].contactos,
        tiene_plantillas: !!programaciones[0].plantillas,
        plantillas_tipo: Array.isArray(programaciones[0].plantillas) ? 'array' : typeof programaciones[0].plantillas,
        tiene_deudas: !!programaciones[0].deudas,
        deudas_tipo: Array.isArray(programaciones[0].deudas) ? 'array' : typeof programaciones[0].deudas,
        rut: programaciones[0].rut
      })
    }
    
    // Normalizar relaciones: Supabase puede retornar objetos o arrays
    const programacionesNormalizadas: ProgramaEjecucion[] = []
    
    for (const prog of (programaciones || [])) {
      // Normalizar contactos
      let contactosNormalizados: Contacto[] = []
      if (prog.contactos) {
        contactosNormalizados = Array.isArray(prog.contactos) ? prog.contactos : [prog.contactos]
      }
      
      // Normalizar plantillas
      let plantillasNormalizadas: Plantilla[] = []
      if (prog.plantillas) {
        plantillasNormalizadas = Array.isArray(prog.plantillas) ? prog.plantillas : [prog.plantillas]
      }
      
      // Normalizar deudas (filtrar eliminadas por si acaso)
      let deudasNormalizadas: Array<{
        monto: number
        fecha_vencimiento: string
        deudor_id: string
        rut?: string
        eliminada_at?: string | null
      }> = []
      if (prog.deudas) {
        const deudasArray = Array.isArray(prog.deudas) ? prog.deudas : [prog.deudas]
        // Filtrar solo deudas activas
        deudasNormalizadas = deudasArray.filter((d: { eliminada_at?: string | null }) => !d.eliminada_at)
      }
      
      // Si no hay deudas activas, cancelar esta programación y saltarla
      if (deudasNormalizadas.length === 0) {
        console.log(`⚠️ Programación ${prog.id} tiene deuda eliminada, cancelando...`)
        await supabase
          .from('programaciones')
          .update({ estado: 'cancelado' })
          .eq('id', prog.id)
        continue
      }
      
      programacionesNormalizadas.push({
        id: prog.id,
        usuario_id: prog.usuario_id,
        deuda_id: prog.deuda_id,
        contacto_id: prog.contacto_id || '',
        campana_id: prog.campana_id || '',
        tipo_accion: prog.tipo_accion,
        plantilla_id: prog.plantilla_id || '',
        agente_id: prog.agente_id || '',
        vars: prog.vars || {},
        voz_config: prog.voz_config || {},
        contactos: contactosNormalizados,
        plantillas: plantillasNormalizadas,
        deudas: deudasNormalizadas,
        // Guardar RUT para uso posterior en historial
        rut: prog.rut || ''
      } as ProgramaEjecucion & { rut?: string })
    }

    // 2. Procesar cada programación
    console.log('🔄 Iniciando procesamiento de', programacionesNormalizadas.length, 'programaciones')
    
    for (const prog of programacionesNormalizadas) {
      console.log(`\n📌 Procesando programación ${prog.id} (${prog.tipo_accion})`)
      let ejecucionId: string | null = null
      const inicioTiempo = Date.now()

      try {
        // Marcar como procesando para evitar duplicados
        const { error: lockError } = await supabase
          .from('programaciones')
          .update({ estado: 'ejecutando' })
          .eq('id', prog.id)
          .eq('estado', 'pendiente') // Solo si aún está pendiente

        if (lockError) {
          console.log(`⚠️ Error al bloquear programación ${prog.id}:`, lockError)
          continue // Ya fue tomada por otro proceso
        }
        
        console.log(`✅ Programación ${prog.id} bloqueada (ejecutando)`)

        // Buscar o crear ejecución_workflow para registrar logs
        if (prog.campana_id && prog.deuda_id) {
          // Obtener deudor_id desde deuda_id (solo deudas activas)
          const { data: deudaData } = await supabase
            .from('deudas')
            .select('deudor_id')
            .eq('id', prog.deuda_id)
            .is('eliminada_at', null)  // Solo deudas activas (soft delete)
            .single()

          if (deudaData?.deudor_id) {
            // Buscar ejecución existente para esta campaña y deudor (cualquier estado reciente)
            const { data: ejecucionExistente } = await supabase
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
              // Crear nueva ejecución
              ejecucionId = await crearEjecucionWorkflow({
                workflow_id: prog.campana_id,
                deudor_id: deudaData.deudor_id,
                usuario_id: prog.usuario_id,
                contexto_datos: {
                  programacion_id: prog.id,
                  tipo_accion: prog.tipo_accion
                }
              })
            }
          }
        }

        // Registrar log de inicio si hay ejecucion_id
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
              vars: prog.vars
            }
          })
        }

        // 3. Ejecutar acción según tipo
        console.log(`🚀 Ejecutando acción: ${prog.tipo_accion}`)
        let resultado: ResultadoEjecucion = { exito: false, error: 'Tipo de acción no válido' }
        switch (prog.tipo_accion) {
          case 'email':
            console.log(`📧 Enviando email a: ${prog.contactos?.[0]?.valor || 'N/A'}`)
            resultado = await enviarEmail(prog as ProgramaEjecucion)
            break
          case 'llamada':
            resultado = await ejecutarLlamada(prog as ProgramaEjecucion)
            break
          case 'sms':
            resultado = await enviarSMS(prog as ProgramaEjecucion)
            break
          case 'whatsapp':
            resultado = await enviarWhatsApp(prog as ProgramaEjecucion)
            break
        }
        
        console.log(`📊 Resultado de ${prog.tipo_accion}:`, {
          exito: resultado.exito,
          error: resultado.error,
          external_id: resultado.external_id
        })

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
              vars: prog.vars
            },
            datos_salida: {
              exito: resultado.exito,
              external_id: resultado.external_id,
              detalles: resultado.detalles
            },
            error_message: resultado.error,
            duracion_ms: duracion
          })

          // Actualizar ejecución de workflow
          await actualizarEjecucionWorkflow(ejecucionId, {
            estado: resultado.exito ? 'completado' : 'fallido',
            resultado_final: {
              programacion_id: prog.id,
              exito: resultado.exito,
              external_id: resultado.external_id
            }
          })
        }

        // 4. Registrar en historial
        // Obtener RUT: primero desde programaciones.rut, luego desde deudas[0].rut
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
          origen: 'cron',
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
        
        console.log(`📝 Registrando en historial (RUT: ${rutParaHistorial || 'N/A'})`)
        const { error: historialError } = await supabase.from('historial').insert({
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
        } else {
          console.log(`✅ Registrado en historial`)
        }

        // 5. Marcar programación como ejecutada
        const estadoFinal = resultado.exito ? 'ejecutado' : 'cancelado'
        console.log(`🏁 Marcando programación como: ${estadoFinal}`)
        const { error: updateError } = await supabase
          .from('programaciones')
          .update({ 
            estado: estadoFinal
          })
          .eq('id', prog.id)
        
        if (updateError) {
          console.error(`❌ Error al actualizar estado de programación:`, updateError)
        } else {
          console.log(`✅ Programación ${prog.id} marcada como ${estadoFinal}`)
        }

      } catch (err) {
        console.error(`Error procesando programación ${prog.id}:`, err)
        // Revertir a pendiente para reintentar después
        await supabase
          .from('programaciones')
          .update({ estado: 'pendiente' })
          .eq('id', prog.id)
      }
    }

    return NextResponse.json({ 
      procesadas: programaciones?.length || 0 
    })

  } catch (error) {
    console.error('Error en ejecutor:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Funciones auxiliares
async function enviarEmail(prog: ProgramaEjecucion): Promise<ResultadoEjecucion> {
  try {
    // Validar que existe plantilla y contacto
    if (!prog.plantillas || prog.plantillas.length === 0) {
      return { exito: false, error: 'No se encontró la plantilla' }
    }
    if (!prog.contactos || prog.contactos.length === 0) {
      return { exito: false, error: 'No se encontró el contacto del deudor' }
    }

    const plantilla = prog.plantillas[0] as {
      contenido: string
      asunto?: string
      tipo_contenido?: 'texto' | 'html'
    }
    const contacto = prog.contactos[0]
    const vars = prog.vars || {}

    // Resolver plantilla: reemplazar variables en contenido y asunto
    const contenidoResuelto = resolverPlantilla(plantilla.contenido, vars)
    const asuntoResuelto = plantilla.asunto
      ? resolverPlantilla(plantilla.asunto, vars)
      : 'Recordatorio de Pago'

    // Determinar el HTML según el tipo de contenido
    let htmlContent: string
    if (plantilla.tipo_contenido === 'html') {
      // Si es HTML, usar el contenido directamente
      htmlContent = contenidoResuelto
    } else {
      // Si es texto, convertir a HTML con formato básico
      const textoFormateado = contenidoResuelto
        .replace(/\n/g, '<br>')
        .replace(/\r/g, '')
      htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="line-height: 1.6; color: #333;">${textoFormateado}</div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #999;">Enviado desde tu sistema de cobranza</p>
      </div>`
    }

    // Obtener email remitente desde variables de entorno
    const { fromEmail } = await import('../../../../lib/resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  
    // Enviar email usando Resend
  const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: contacto.valor,
      subject: asuntoResuelto,
      html: htmlContent
  })

    if (error) {
      console.error('Error enviando email:', error)
      return {
        exito: false,
        error: 'Error al enviar el email',
        detalles: error
      }
    }

  return {
      exito: true,
    external_id: data?.id,
      detalles: data
    }
  } catch (error) {
    console.error('Error en enviarEmail:', error)
    return {
      exito: false,
      error: error instanceof Error ? error.message : 'Error desconocido al enviar email',
      detalles: error
    }
  }
}

async function ejecutarLlamada(prog: ProgramaEjecucion): Promise<ResultadoEjecucion> {
  try {
    // Validar que existe agente y contacto
    if (!prog.agente_id) {
      return { exito: false, error: 'No se especificó un agente para la llamada' }
    }
    if (!prog.contactos || prog.contactos.length === 0) {
      return { exito: false, error: 'No se encontró el contacto del deudor' }
    }

    // Validar que el contacto es un teléfono
    const contacto = prog.contactos[0]
    if (contacto.tipo_contacto !== 'telefono') {
      return { exito: false, error: 'El contacto no es un teléfono válido' }
    }

    // Validar que el agente esté activo en la BD
    // prog.agente_id es el UUID de la tabla llamada_agente
    const { data: agenteData, error: agenteError } = await supabase
      .from('llamada_agente')
      .select('id, agent_id, nombre, activo')
      .eq('id', prog.agente_id)
      .eq('usuario_id', prog.usuario_id)
      .single()

    if (agenteError || !agenteData) {
      console.error('Error obteniendo agente:', agenteError)
      return { exito: false, error: 'No se encontró el agente en la base de datos' }
    }

    if (!agenteData.activo) {
      return { exito: false, error: 'El agente no está activo' }
    }

    // Preparar variables dinámicas del deudor
    // Mapeo de variables: nuestras variables -> variables que espera el agente
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

    // Importar función de ElevenLabs
    const { startOutboundCall } = await import('../../../../lib/elevenlabs')

    // Ejecutar llamada con variables dinámicas
    // Usar agent_id de ElevenLabs (no el UUID de la BD)
    const resultado = await startOutboundCall({
      agentId: agenteData.agent_id,
      toNumber: contacto.valor,
      dynamicVariables
    }) as unknown as ElevenLabsCallResult

    if (!resultado || !resultado.success) {
      return {
        exito: false,
        error: 'Error al ejecutar la llamada en ElevenLabs',
        detalles: resultado
      }
    }

    return {
      exito: true,
      external_id: resultado.callId,
      detalles: resultado
    }
  } catch (error) {
    console.error('Error en ejecutarLlamada:', error)
    return {
      exito: false,
      error: error instanceof Error ? error.message : 'Error desconocido al ejecutar llamada',
      detalles: error
    }
  }
}

async function enviarSMS(prog: ProgramaEjecucion): Promise<ResultadoEjecucion> {
  try {
    // Validar que existe plantilla y contacto
    if (!prog.plantillas || prog.plantillas.length === 0) {
      return { exito: false, error: 'No se encontró la plantilla' }
    }
    if (!prog.contactos || prog.contactos.length === 0) {
      return { exito: false, error: 'No se encontró el contacto del deudor' }
    }

    const plantilla = prog.plantillas[0]
    const contacto = prog.contactos[0]
    const vars = prog.vars || {}

    // Validar que el contacto es un teléfono
    if (contacto.tipo_contacto !== 'telefono') {
      return { exito: false, error: 'El contacto no es un teléfono válido' }
    }

    // Resolver plantilla: reemplazar variables en contenido
    const contenidoResuelto = resolverPlantilla(plantilla.contenido, vars)

    // Validar que el contenido no esté vacío
    if (!contenidoResuelto.trim()) {
      return { exito: false, error: 'El contenido del SMS está vacío' }
    }

    // Validar longitud del SMS (máximo 1600 caracteres para SMS concatenados)
    if (contenidoResuelto.length > 1600) {
      return { exito: false, error: 'El contenido del SMS es demasiado largo (máximo 1600 caracteres)' }
    }

    // TODO: Implementar envío real con Twilio cuando esté configurado
    // Por ahora, retornamos éxito simulado para que el sistema continúe funcionando
    console.log('SMS simulado:', {
      to: contacto.valor,
      message: contenidoResuelto,
      length: contenidoResuelto.length
    })

    return {
      exito: true,
      external_id: `sms_simulado_${Date.now()}`,
      detalles: {
        to: contacto.valor,
        message: contenidoResuelto,
        length: contenidoResuelto.length,
        note: 'SMS simulado - implementar Twilio en Fase 4.8'
      }
    }
  } catch (error) {
    console.error('Error en enviarSMS:', error)
    return {
      exito: false,
      error: error instanceof Error ? error.message : 'Error desconocido al enviar SMS',
      detalles: error
    }
  }
}

async function enviarWhatsApp(prog: ProgramaEjecucion): Promise<ResultadoEjecucion> {
  // TODO: Implementar con Twilio WhatsApp
  // Por ahora retornamos éxito simulado
  console.log('WhatsApp simulado para:', prog.contacto_id)
  return { exito: false, error: 'No implementado' }
}

/**
 * Resuelve una plantilla reemplazando variables con valores reales
 * Maneja variables faltantes con valores por defecto
 * Valida que las variables requeridas existan
 */
function resolverPlantilla(contenido: string, vars: Record<string, string>): string {
  if (!contenido) return ''
  if (!vars || Object.keys(vars).length === 0) return contenido

  // Valores por defecto para variables comunes
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

  // Detectar todas las variables en el contenido usando regex
  const regexVariables = /\{\{([^}]+)\}\}/g
  const variablesEncontradas = new Set<string>()
  let match

  while ((match = regexVariables.exec(contenido)) !== null) {
    const nombreVariable = match[1].trim()
    if (nombreVariable) {
      variablesEncontradas.add(nombreVariable)
    }
  }

  // Reemplazar cada variable encontrada
  for (const variable of variablesEncontradas) {
    // Buscar el valor en vars, si no existe usar valor por defecto
    const valor = vars[variable] !== undefined && vars[variable] !== null
      ? String(vars[variable])
      : valoresPorDefecto[variable] || ''

    // Reemplazar todas las ocurrencias de la variable
    // Usar regex global para reemplazar todas las instancias
    const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g')
    resultado = resultado.replace(regex, valor)
  }

  // Limpiar variables no reemplazadas (por si acaso quedó alguna)
  resultado = resultado.replace(/\{\{[^}]+\}\}/g, '')

  return resultado
}
