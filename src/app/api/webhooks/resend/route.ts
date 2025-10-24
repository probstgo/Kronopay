import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { verificarRateLimit, obtenerIP } from '@/lib/rate-limiter'
import { validarGuardrails } from '@/lib/guardrails'
import { obtenerConfigReintento, calcularProximoIntento } from '@/lib/reintentos'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting
    const ip = obtenerIP(request)
    if (!(await verificarRateLimit(ip, 'webhook'))) {
      return NextResponse.json({ error: 'Rate limit excedido' }, { status: 429 })
    }

    const body = await request.text()
    const signature = request.headers.get('svix-signature')
    
    // Verificar firma de Resend/Svix
    // const isValid = verificarFirma(body, signature)
    // if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

    const evento = JSON.parse(body)

    // Buscar historial por external_id
    const { data: historial, error } = await supabase
      .from('historial')
      .select('*')
      .eq('detalles->>external_id', evento.data.email_id)
      .single()

    if (error || !historial) {
      return NextResponse.json({ error: 'Historial no encontrado' }, { status: 404 })
    }

    // 2. Guardrails (solo para eventos de fallo)
    if (evento.type === 'email.bounced' || evento.type === 'email.complained') {
      const validacion = await validarGuardrails(
        historial.usuario_id, 
        historial.deuda_id, 
        'email'
      )
      if (!validacion.permitido) {
        console.log(`Guardrails bloqueado: ${validacion.razon}`)
        // Continuar procesando pero marcar como bloqueado por guardrails
      }
    }

    // Actualizar historial según evento
    let nuevoEstado = historial.estado
    const detallesActualizados = { ...historial.detalles }

    switch (evento.type) {
      case 'email.delivered':
        nuevoEstado = 'entregado'
        detallesActualizados.delivered_at = evento.created_at
        break
      case 'email.opened':
        detallesActualizados.opened_at = evento.created_at
        break
      case 'email.clicked':
        detallesActualizados.clicked_at = evento.created_at
        break
      case 'email.bounced':
      case 'email.complained':
        nuevoEstado = 'fallido'
        detallesActualizados.error = evento.data.error
        
        // 3. Reintentos para emails fallidos
        try {
          const config = await obtenerConfigReintento(historial.usuario_id, 'email')
          const intentoActual = (historial.detalles?.intento_actual || 0) + 1
          
          if (intentoActual < config.max_intentos) {
            const proximoIntento = calcularProximoIntento(intentoActual, config.backoff)
            
            // Programar reintento
            await supabase.from('programaciones').insert({
              usuario_id: historial.usuario_id,
              deuda_id: historial.deuda_id,
              contacto_id: historial.contacto_id,
              campana_id: historial.campana_id,
              tipo_accion: 'email',
              plantilla_id: historial.plantilla_id,
              agente_id: historial.agente_id,
              vars: historial.detalles?.vars,
              fecha_programada: proximoIntento.toISOString(),
              estado: 'pendiente',
              intento_actual: intentoActual
            })
            
            detallesActualizados.reintento_programado = proximoIntento.toISOString()
            detallesActualizados.intento_actual = intentoActual
          }
        } catch (reintentoError) {
          console.error('Error programando reintento:', reintentoError)
        }
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

    // Actualizar métricas en usos
    if (nuevoEstado === 'entregado') {
      await supabase.rpc('incrementar_emails_enviados', {
        p_usuario_id: historial.usuario_id,
        p_periodo: obtenerPeriodoActual()
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error en webhook Resend:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

function obtenerPeriodoActual(): string {
  const fecha = new Date()
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
}
