import twilio from 'twilio'
import { createClient } from '@supabase/supabase-js'
import { enqueueMessage } from './smsQueue'

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

type Channel = 'sms' | 'whatsapp'

interface PhoneNumberRecord {
  id: string
  e164: string
  supports_sms: boolean
  supports_whatsapp: boolean
  estado: string
}

interface EnvioResultado {
  exito: boolean
  sid?: string
  error?: string
  numero?: string
  queued?: boolean
  error_type?: 'numero' | 'destinatario'
}

const FROM_ERROR_CODES = new Set([21606, 21608, 21612])

function esErrorDelNumero(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { code, message } = error as { code?: number; message?: string }
  if (code && FROM_ERROR_CODES.has(code)) {
    return true
  }
  return Boolean(
    message &&
      ((message.includes('From') && message.includes('valid phone number')) ||
        message.includes('not a valid Messaging Credential'))
  )
}

async function marcarNumero(
  id: string,
  updates: { estado?: string; estado_reason?: string; last_used_at?: string }
) {
  await supabaseServiceRole
    .from('phone_numbers')
    .update(updates)
    .eq('id', id)
}

async function seleccionarNumeroDisponible(channel: Channel): Promise<PhoneNumberRecord | null> {
  const column = channel === 'sms' ? 'supports_sms' : 'supports_whatsapp'

  const { data, error } = await supabaseServiceRole
    .from('phone_numbers')
    .select('id, e164, supports_sms, supports_whatsapp, estado')
    .eq('provider', 'twilio')
    .eq(column, true)
    .eq('estado', 'disponible')
    .order('last_used_at', {
      ascending: true,
      nullsFirst: true
    })
    .limit(1)

  if (error) {
    console.error('Error seleccionando número disponible:', error)
    return null
  }

  const numero = data?.[0]
  if (!numero) return null

  await marcarNumero(numero.id, { last_used_at: new Date().toISOString() })
  return numero
}

async function enviarMensajeTwilio(params: {
  channel: Channel
  to: string
  body: string
}): Promise<EnvioResultado> {
  if (params.body.length > 1600) {
    return {
      exito: false,
      error: 'El mensaje supera los 1600 caracteres permitidos'
    }
  }

  const numero = await seleccionarNumeroDisponible(params.channel)
  if (!numero) {
    await enqueueMessage({
      tipo: params.channel,
      destinatario: params.to,
      contenido: params.body
    })

    return {
      exito: false,
      error: 'No hay números de Twilio disponibles en este momento (mensaje encolado)',
      queued: true
    }
  }

  return enviarMensajeConNumero({
    channel: params.channel,
    numero: numero.e164,
    to: params.to,
    body: params.body
  })
}

export async function enviarMensajeConNumero(params: {
  channel: Channel
  numero: string
  to: string
  body: string
}): Promise<EnvioResultado> {
  if (params.body.length > 1600) {
    return {
      exito: false,
      error: 'El mensaje supera los 1600 caracteres permitidos'
    }
  }

  const fromValue = params.channel === 'whatsapp' ? `whatsapp:${params.numero}` : params.numero
  const toValue = params.channel === 'whatsapp' ? `whatsapp:${params.to}` : params.to

    try {
    const message = await twilioClient.messages.create({
      body: params.body,
      from: fromValue,
      to: toValue
    })

    return {
      exito: true,
      sid: message.sid,
      numero: params.numero
    }
  } catch (error: unknown) {
    console.error('Error enviando mensaje Twilio con número manual:', error)

    const esNumero = esErrorDelNumero(error)
    if (esNumero) {
      await supabaseServiceRole
        .from('phone_numbers')
        .update({
          estado: 'suspendido',
          estado_reason: 'Error de Twilio con el número'
        })
        .eq('e164', params.numero)
    }

    return {
      exito: false,
      error: error instanceof Error ? error.message : 'Error desconocido al enviar mensaje',
      error_type: esNumero ? 'numero' : 'destinatario'
    }
  }
}

export async function obtenerNumeroSmsDisponible(): Promise<string | null> {
  const numero = await seleccionarNumeroDisponible('sms')
  return numero?.e164 ?? null
}

export async function obtenerNumeroWhatsAppDisponible(): Promise<string | null> {
  const numero = await seleccionarNumeroDisponible('whatsapp')
  return numero?.e164 ?? null
}

export async function enviarSms(params: { to: string; mensaje: string }): Promise<EnvioResultado> {
  return enviarMensajeTwilio({ channel: 'sms', to: params.to, body: params.mensaje })
}

export async function enviarWhatsApp(params: { to: string; mensaje: string }): Promise<EnvioResultado> {
  return enviarMensajeTwilio({ channel: 'whatsapp', to: params.to, body: params.mensaje })
}

export { seleccionarNumeroDisponible }

