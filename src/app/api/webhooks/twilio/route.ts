import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TWILIO_WEBHOOK_PATH = '/api/webhooks/twilio'

async function obtenerPayload(request: NextRequest) {
  const formData = await request.formData()
  const payload: Record<string, string> = {}
  formData.forEach((value, key) => {
    payload[key] = typeof value === 'string' ? value : value.toString()
  })
  return payload
}

function mapEstadoHistorial(status: string) {
  const enProcesamiento = ['queued', 'sending', 'sent', 'accepted']
  const exitosos = ['delivered']
  const fallidos = ['failed', 'undelivered', 'rejected', 'blocked']

  if (enProcesamiento.includes(status)) return 'enviado'
  if (exitosos.includes(status)) return 'entregado'
  if (fallidos.includes(status)) return 'fallido'
  return status
}

async function actualizarHistorial(sid: string, updates: Record<string, unknown>) {
  const { data, error } = await supabaseServiceRole
    .from('historial')
    .select('id, detalles')
    .or(`detalles->>twilio_sid.eq.${sid}`)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error buscando historial para Twilio SID:', error)
    return
  }

  const registro = data?.[0]
  if (!registro) return

  const detallesExistentes = registro.detalles || {}
  const { detalles, ...rest } = updates
  const detallesActualizados = detalles
    ? { ...detallesExistentes, ...detalles }
    : detallesExistentes

  await supabaseServiceRole
    .from('historial')
    .update({
      ...rest,
      detalles: detallesActualizados
    })
    .eq('id', registro.id)
}

async function actualizarCola(sid: string, status: string, errorMessage?: string) {
  const { data } = await supabaseServiceRole
    .from('sms_queue')
    .select('id')
    .eq('twilio_sid', sid)
    .limit(1)

  const registro = data?.[0]
  if (!registro) return

  const estado = ['delivered'].includes(status) ? 'enviado'
    : ['failed', 'undelivered', 'rejected', 'blocked'].includes(status)
      ? 'fallido'
      : 'pendiente'

  await supabaseServiceRole
    .from('sms_queue')
    .update({
      estado,
      last_error: errorMessage || null,
      last_attempt_at: new Date().toISOString()
    })
    .eq('id', registro.id)
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-twilio-signature') || ''
  const url = `${process.env.NEXT_PUBLIC_APP_URL || ''}${TWILIO_WEBHOOK_PATH}`
  const payload = await obtenerPayload(request)

  if (!twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, url, payload)) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 403 })
  }

  const sid = payload.MessageSid
  const status = payload.MessageStatus
  const errorMessage = payload.ErrorMessage
  const errorCode = payload.ErrorCode

  await actualizarHistorial(sid, {
    estado: mapEstadoHistorial(status),
    detalles: {
      twilio_status: status,
      twilio_error_code: errorCode,
      twilio_error_message: errorMessage
    }
  })

  await actualizarCola(sid, status, errorMessage)

  return NextResponse.json({ success: true })
}

