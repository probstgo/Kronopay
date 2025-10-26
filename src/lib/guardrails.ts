import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function validarGuardrails(
  usuario_id: string,
  deudor_id: string,
  _tipo_accion: string
): Promise<{ permitido: boolean; razon?: string }> {
  
  // 1. Obtener guardrails globales
  const { data: globales } = await supabase
    .from('configuraciones')
    .select('clave, valor')
    .is('usuario_id', null)

  const guardrailsMap = new Map(
    globales?.map(g => [g.clave, g.valor]) || []
  )

  // 2. Verificar horario permitido
  const ahora = new Date()
  const hora = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  
  const quiet_start = guardrailsMap.get('quiet_hours_start')
  const quiet_end = guardrailsMap.get('quiet_hours_end')
  
  if (quiet_start && quiet_end && 
      hora >= quiet_start && hora <= quiet_end) {
    return { permitido: false, razon: 'Horario no permitido (quiet hours)' }
  }

  // 3. Verificar día bloqueado
  const bloquear_domingos = guardrailsMap.get('bloquear_domingos')
  if (bloquear_domingos && ahora.getDay() === 0) {
    return { permitido: false, razon: 'Domingos bloqueados' }
  }

  const blocked_dates = guardrailsMap.get('blocked_dates') || []
  const fecha_actual = ahora.toISOString().split('T')[0]
  if (blocked_dates.includes(fecha_actual)) {
    return { permitido: false, razon: 'Fecha bloqueada' }
  }

  // 4. Verificar límite de mensajes por día
  const max_dia = guardrailsMap.get('max_msgs_deudor_dia')
  if (max_dia) {
    const { count } = await supabase
      .from('historial')
      .select('*', { count: 'exact', head: true })
      .eq('deuda_id', deudor_id)
      .gte('fecha', new Date(ahora.setHours(0, 0, 0, 0)).toISOString())
    
    if (count && count >= parseInt(max_dia as string)) {
      return { permitido: false, razon: 'Límite diario excedido' }
    }
  }

  // 5. Verificar límite semanal
  const max_semana = guardrailsMap.get('max_msgs_deudor_semana')
  if (max_semana) {
    const hace_7_dias = new Date()
    hace_7_dias.setDate(hace_7_dias.getDate() - 7)
    
    const { count } = await supabase
      .from('historial')
      .select('*', { count: 'exact', head: true })
      .eq('deuda_id', deudor_id)
      .gte('fecha', hace_7_dias.toISOString())
    
    if (count && count >= parseInt(max_semana as string)) {
      return { permitido: false, razon: 'Límite semanal excedido' }
    }
  }

  return { permitido: true }
}
