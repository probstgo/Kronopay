import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const evento = await request.json()

    // Buscar historial por external_call_id
    const { data: historial } = await supabase
      .from('historial')
      .select('*')
      .eq('detalles->>external_call_id', evento.call_id)
      .single()

    if (!historial) {
      return NextResponse.json({ error: 'Historial no encontrado' }, { status: 404 })
    }

    let nuevoEstado = historial.estado
    const detallesActualizados = { ...historial.detalles }

    switch (evento.status) {
      case 'completed':
        nuevoEstado = 'completado'
        detallesActualizados.duracion = evento.duration
        detallesActualizados.costo = evento.cost
        detallesActualizados.transcripcion_id = evento.conversation_id
        break
      case 'failed':
      case 'no-answer':
        nuevoEstado = 'fallido'
        detallesActualizados.error = evento.error || evento.status
        break
    }

    // Actualizar historial
    await supabase
      .from('historial')
      .update({ 
        estado: nuevoEstado,
        detalles: detallesActualizados
      })
      .eq('id', historial.id)

    // Si hay conversación, guardar transcripción
    if (evento.conversation_id && evento.transcript) {
      await guardarTranscripcion(historial, evento)
    }

    // Actualizar métricas
    if (nuevoEstado === 'completado') {
      await supabase
        .from('usos')
        .update({
          llamadas_ejecutadas: supabase.sql`llamadas_ejecutadas + 1`,
          duracion_llamadas: supabase.sql`duracion_llamadas + ${evento.duration}`,
          costo_llamadas: supabase.sql`costo_llamadas + ${evento.cost}`,
          costo_total: supabase.sql`costo_total + ${evento.cost}`
        })
        .eq('usuario_id', historial.usuario_id)
        .eq('periodo', obtenerPeriodoActual())
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error en webhook ElevenLabs:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

async function guardarTranscripcion(historial: any, evento: any) {
  // Crear conversación
  const { data: conversacion } = await supabase
    .from('agente_conversaciones')
    .insert({
      usuario_id: historial.usuario_id,
      agente_id: historial.agente_id,
      historial_id: historial.id,
      external_conversation_id: evento.conversation_id,
      metrics: {
        duracion: evento.duration,
        costo: evento.cost
      }
    })
    .select()
    .single()

  // Guardar turnos de la conversación
  if (conversacion && evento.transcript?.turns) {
    const turnos = evento.transcript.turns.map((turno: any, idx: number) => ({
      conversacion_id: conversacion.id,
      turno: idx,
      who: turno.role === 'agent' ? 'agente' : 'deudor',
      text: turno.message,
      started_at: turno.start_time,
      ended_at: turno.end_time
    }))

    await supabase.from('agente_conversacion_turnos').insert(turnos)
  }
}

function obtenerPeriodoActual(): string {
  const fecha = new Date()
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
}
