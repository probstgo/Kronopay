import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

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
    // 1. Obtener programaciones vencidas y pendientes
    const { data: programaciones, error } = await supabase
      .from('programaciones')
      .select(`
        id,
        usuario_id,
        deuda_id,
        contacto_id,
        campana_id,
        tipo_accion,
        plantilla_id,
        agente_id,
        vars,
        voz_config,
        contactos(valor, tipo_contacto),
        plantillas(contenido),
        deudas(monto, fecha_vencimiento, deudor_id)
      `)
      .eq('estado', 'pendiente')
      .lte('fecha_programada', new Date().toISOString())
      .limit(100)

    if (error) throw error

    // 2. Procesar cada programación
    for (const prog of programaciones || []) {
      try {
        // Marcar como procesando para evitar duplicados
        const { error: lockError } = await supabase
          .from('programaciones')
          .update({ estado: 'ejecutando' })
          .eq('id', prog.id)
          .eq('estado', 'pendiente') // Solo si aún está pendiente

        if (lockError) continue // Ya fue tomada por otro proceso

        // 3. Ejecutar acción según tipo
        let resultado
        switch (prog.tipo_accion) {
          case 'email':
            resultado = await enviarEmail(prog)
            break
          case 'llamada':
            resultado = await ejecutarLlamada(prog)
            break
          case 'sms':
            resultado = await enviarSMS(prog)
            break
          case 'whatsapp':
            resultado = await enviarWhatsApp(prog)
            break
        }

        // 4. Registrar en historial
        await supabase.from('historial').insert({
          usuario_id: prog.usuario_id,
          deuda_id: prog.deuda_id,
          rut: prog.deudas?.rut,
          contacto_id: prog.contacto_id,
          campana_id: prog.campana_id,
          tipo_accion: prog.tipo_accion,
          agente_id: prog.agente_id,
          fecha: new Date().toISOString(),
          estado: resultado.exito ? 'iniciado' : 'fallido',
          detalles: resultado
        })

        // 5. Marcar programación como ejecutada
        await supabase
          .from('programaciones')
          .update({ 
            estado: resultado.exito ? 'ejecutado' : 'cancelado' 
          })
          .eq('id', prog.id)

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
async function enviarEmail(prog: any) {
  // Implementar con Resend (ya configurado)
  const resend = new Resend(process.env.RESEND_API_KEY)
  
  const contenido = resolverPlantilla(prog.plantillas.contenido, prog.vars)
  
  const { data, error } = await resend.emails.send({
    from: 'cobranza@tudominio.com',
    to: prog.contactos.valor,
    subject: 'Recordatorio de Pago',
    html: contenido
  })

  return {
    exito: !error,
    external_id: data?.id,
    detalles: error || data
  }
}

async function ejecutarLlamada(prog: any) {
  // Implementar con ElevenLabs (ya configurado)
  const elevenLabs = require('../../../lib/elevenlabs')
  
  const prompt = resolverPlantilla(prog.plantillas.contenido, prog.vars)
  
  const resultado = await elevenLabs.iniciarLlamada({
    agente_id: prog.agente_id,
    numero_destino: prog.contactos.valor,
    prompt,
    voz_config: prog.voz_config
  })

  return {
    exito: resultado.success,
    external_id: resultado.call_id,
    detalles: resultado
  }
}

async function enviarSMS(prog: any) {
  // TODO: Implementar con Twilio
  return { exito: false, error: 'No implementado' }
}

async function enviarWhatsApp(prog: any) {
  // TODO: Implementar con Twilio WhatsApp
  return { exito: false, error: 'No implementado' }
}

function resolverPlantilla(contenido: string, vars: any): string {
  if (!vars) return contenido
  
  let resultado = contenido
  for (const [key, value] of Object.entries(vars)) {
    resultado = resultado.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  }
  return resultado
}
