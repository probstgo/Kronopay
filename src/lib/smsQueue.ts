import { createClient } from '@supabase/supabase-js'

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type QueueMessage = {
  id: string
  tipo: 'sms' | 'whatsapp'
  destinatario: string
  contenido: string
  estado: 'pendiente' | 'procesando' | 'enviado' | 'fallido'
  intentos: number
  last_error: string | null
  last_attempt_at: string | null
  created_at: string
  sent_at: string | null
  twilio_sid: string | null
  metadata: Record<string, unknown>
}

export async function enqueueMessage(params: {
  tipo: 'sms' | 'whatsapp'
  destinatario: string
  contenido: string
  metadata?: Record<string, unknown>
}) {
  const { error } = await supabaseServiceRole
    .from('sms_queue')
    .insert({
      tipo: params.tipo,
      destinatario: params.destinatario,
      contenido: params.contenido,
      metadata: params.metadata || {}
    })

  if (error) {
    console.error('Error encolando mensaje SMS:', error)
    throw error
  }
}

export async function fetchPendingMessages(limit = 20): Promise<QueueMessage[]> {
  const { data, error } = await supabaseServiceRole
    .from('sms_queue')
    .select('*')
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error obteniendo cola de mensajes:', error)
    return []
  }

  return (data || []) as QueueMessage[]
}

export async function updateQueueMessage(id: string, updates: Partial<Omit<QueueMessage, 'id' | 'created_at'>>) {
  await supabaseServiceRole
    .from('sms_queue')
    .update(updates)
    .eq('id', id)
}

