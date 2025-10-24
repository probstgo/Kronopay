import { createClient } from '@supabase/supabase-js'
import { ConfigReintento } from '../types/programa'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function obtenerConfigReintento(
  usuario_id: string, 
  tipo_accion: string
) {
  // Primero buscar config del usuario
  const { data: userConfig } = await supabase
    .from('configuraciones')
    .select('valor')
    .eq('usuario_id', usuario_id)
    .eq('clave', `max_intentos_${tipo_accion}`)
    .single()

  if (userConfig) {
    return {
      max_intentos: parseInt(userConfig.valor),
      backoff: await obtenerBackoff(usuario_id, tipo_accion)
    }
  }

  // Si no hay config del usuario, usar defaults
  const defaults: Record<string, ConfigReintento> = {
    email: { max: 3, backoff: ['1m', '5m', '30m'] },
    sms: { max: 3, backoff: ['1m', '5m', '30m'] },
    whatsapp: { max: 3, backoff: ['1m', '5m', '30m'] },
    llamada: { max: 2, backoff: ['5m', '30m'] }
  }

  return {
    max_intentos: defaults[tipo_accion]?.max || 2,
    backoff: defaults[tipo_accion]?.backoff || ['5m', '30m']
  }
}

async function obtenerBackoff(usuario_id: string, tipo_accion: string) {
  const { data } = await supabase
    .from('configuraciones')
    .select('valor')
    .eq('usuario_id', usuario_id)
    .eq('clave', `backoff_${tipo_accion}`)
    .single()

  return data?.valor || ['1m', '5m', '30m']
}

export function calcularProximoIntento(
  intento_actual: number, 
  backoff: string[]
): Date {
  const delay = backoff[Math.min(intento_actual, backoff.length - 1)]
  const [valor, unidad] = [parseInt(delay), delay.slice(-1)]
  
  const ahora = new Date()
  
  switch (unidad) {
    case 'm':
      ahora.setMinutes(ahora.getMinutes() + valor)
      break
    case 'h':
      ahora.setHours(ahora.getHours() + valor)
      break
    case 'd':
      ahora.setDate(ahora.getDate() + valor)
      break
  }
  
  return ahora
}
