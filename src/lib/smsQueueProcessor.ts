import { fetchPendingMessages, updateQueueMessage } from './smsQueue'
import { seleccionarNumeroDisponible, enviarMensajeConNumero } from './twilio'

export async function procesarColaSms() {
  const pendientes = await fetchPendingMessages(20)
  if (!pendientes.length) return

  for (const mensaje of pendientes) {
    const numero = await seleccionarNumeroDisponible(mensaje.tipo)
    if (!numero) {
      console.log('No hay números disponibles para procesar la cola, se detiene el ciclo')
      break
    }

    await updateQueueMessage(mensaje.id, {
      estado: 'procesando',
      intentos: mensaje.intentos + 1,
      last_attempt_at: new Date().toISOString(),
      last_error: null
    })

    const resultado = await enviarMensajeConNumero({
      channel: mensaje.tipo,
      numero: numero.e164,
      to: mensaje.destinatario,
      body: mensaje.contenido
    })

    if (resultado.exito) {
      await updateQueueMessage(mensaje.id, {
        estado: 'enviado',
        twilio_sid: resultado.sid || null,
        sent_at: new Date().toISOString(),
        last_error: null
      })
    } else {
      const esErrorDestino = resultado.error_type === 'destinatario'
      await updateQueueMessage(mensaje.id, {
        estado: esErrorDestino ? 'fallido' : 'pendiente',
        last_error: resultado.error || 'Error desconocido'
      })
    }
  }
}

