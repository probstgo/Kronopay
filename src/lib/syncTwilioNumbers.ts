import { createClient } from '@supabase/supabase-js'
import { twilioClient } from './twilio'

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SupabasePhoneNumber {
  id: string
  e164: string
  estado: string
}

interface TwilioPhoneNumber {
  sid: string
  phoneNumber: string
  status?: string
  capabilities?: {
    sms?: boolean
    whatsapp?: boolean
  }
}

function determinarEstado(status?: string): 'disponible' | 'suspendido' {
  if (!status) return 'disponible'
  return status === 'suspended' ? 'suspendido' : 'disponible'
}

export async function sincronizarNumerosTwilio(): Promise<void> {
  const twilioNumbers = await twilioClient.incomingPhoneNumbers.list({
    limit: 1000
  })

  const { data: dbNumbers, error: dbError } = await supabaseServiceRole
    .from('phone_numbers')
    .select('id, e164, estado')
    .eq('provider', 'twilio')

  if (dbError) {
    console.error('Error cargando números de la base de datos:', dbError)
    throw dbError
  }

  const dbMap = new Map<string, SupabasePhoneNumber>()
  const twilioSet = new Set<string>()
  dbNumbers?.forEach((row) => {
    dbMap.set(row.e164, row)
  })

  const operaciones: Promise<void>[] = []

  for (const numero of twilioNumbers as TwilioPhoneNumber[]) {
    const e164 = numero.phoneNumber
    twilioSet.add(e164)
    const supportsSms = Boolean(numero.capabilities?.sms)
    const supportsWhatsApp = Boolean(numero.capabilities?.whatsapp)
    const estado = determinarEstado(numero.status)

    const existing = dbMap.get(e164)
    const updates: Record<string, unknown> = {}

    if (existing) {
      if (existing.estado !== estado) {
        updates.estado = estado
        updates.estado_reason = `Estado actualizado desde Twilio (${numero.status || 'activo'})`
        if (estado === 'retirado') {
          updates.retirado_at = new Date().toISOString()
        }
      }
      updates.supports_sms = supportsSms
      updates.supports_whatsapp = supportsWhatsApp

      const tieneCambios = Object.keys(updates).length > 0
      if (tieneCambios) {
        operaciones.push(
          supabaseServiceRole
            .from('phone_numbers')
            .update(updates)
            .eq('id', existing.id)
            .then(() => {})
        )
      }
    } else {
      operaciones.push(
        supabaseServiceRole
          .from('phone_numbers')
          .insert({
            provider: 'twilio',
            elevenlabs_phone_number_id: numero.sid,
            e164,
            supports_outbound: true,
            supports_sms: supportsSms,
            supports_whatsapp: supportsWhatsApp,
            estado,
            estado_reason: 'Sincronizado desde Twilio',
            created_at: new Date().toISOString()
          })
          .then(() => {})
      )
    }
  }

  for (const dbNumero of dbNumbers || []) {
    if (!twilioSet.has(dbNumero.e164) && dbNumero.estado !== 'retirado') {
      operaciones.push(
        supabaseServiceRole
          .from('phone_numbers')
          .update({
            estado: 'retirado',
            estado_reason: 'Número eliminado en Twilio',
            retirado_at: new Date().toISOString()
          })
          .eq('id', dbNumero.id)
          .then(() => {})
      )
    }
  }

  await Promise.allSettled(operaciones)

  console.log(`Sincronización Twilio completada: ${twilioNumbers.length} números procesados`)
}

