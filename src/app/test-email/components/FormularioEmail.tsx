"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Deudor } from '@/lib/database'
import { Send, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface FormularioEmailProps {
  deudorSeleccionado: Deudor | null
}

interface EnvioResultado {
  success: boolean
  message: string
  details?: unknown
}

export default function FormularioEmail({ deudorSeleccionado }: FormularioEmailProps) {
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<EnvioResultado | null>(null)

  const handleEnviar = async () => {
    if (!deudorSeleccionado || !deudorSeleccionado.email) {
      setResultado({
        success: false,
        message: 'Debes seleccionar un deudor con email válido'
      })
      return
    }

    if (!asunto.trim() || !mensaje.trim()) {
      setResultado({
        success: false,
        message: 'El asunto y mensaje son obligatorios'
      })
      return
    }

    setEnviando(true)
    setResultado(null)

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: deudorSeleccionado.email,
          subject: asunto,
          message: mensaje
          // El dominio se configura automáticamente desde las variables de entorno
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResultado({
          success: true,
          message: 'Email enviado correctamente',
          details: data
        })
        // Limpiar formulario después del envío exitoso
        setAsunto('')
        setMensaje('')
      } else {
        setResultado({
          success: false,
          message: data.error || 'Error al enviar el email',
          details: data.details
        })
      }
    } catch (error: unknown) {
      setResultado({
        success: false,
        message: 'Error de conexión al enviar el email',
        details: error
      })
    } finally {
      setEnviando(false)
    }
  }

  const plantillas = [
    {
      nombre: 'Recordatorio de pago',
      asunto: 'Recordatorio de pago pendiente',
      mensaje: `Estimado/a ${deudorSeleccionado?.nombre || '[Nombre]'},

Le recordamos que tiene una deuda pendiente por un monto de $${deudorSeleccionado?.monto_deuda.toLocaleString() || '[Monto]'}.

Por favor, contacte con nosotros para regularizar su situación.

Saludos cordiales.`
    },
    {
      nombre: 'Aviso de vencimiento',
      asunto: 'Aviso importante sobre su deuda',
      mensaje: `Estimado/a ${deudorSeleccionado?.nombre || '[Nombre]'},

Le informamos que su deuda de $${deudorSeleccionado?.monto_deuda.toLocaleString() || '[Monto]'} está próxima a vencer.

Es importante que se ponga en contacto con nosotros a la brevedad.

Atentamente.`
    }
  ]

  const usarPlantilla = (plantilla: typeof plantillas[0]) => {
    setAsunto(plantilla.asunto)
    setMensaje(plantilla.mensaje)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enviar Email de Prueba</CardTitle>
        <CardDescription>
          {deudorSeleccionado 
            ? `Enviando email a: ${deudorSeleccionado.nombre} (${deudorSeleccionado.email})`
            : 'Selecciona un deudor para enviar un email'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plantillas rápidas */}
        <div>
          <h4 className="text-sm font-medium mb-2">Plantillas rápidas:</h4>
          <div className="flex gap-2 flex-wrap">
            {plantillas.map((plantilla, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => usarPlantilla(plantilla)}
                disabled={!deudorSeleccionado}
              >
                {plantilla.nombre}
              </Button>
            ))}
          </div>
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          {/* Información del remitente */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>📧 Email será enviado desde:</strong> onboarding@resend.dev
              <br />
              <span className="text-xs text-blue-600">
                (Dominio de prueba de Resend - los emails pueden llegar a spam)
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Asunto:</label>
            <Input
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Asunto del email..."
              disabled={!deudorSeleccionado}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Mensaje:</label>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              rows={6}
              disabled={!deudorSeleccionado}
            />
          </div>

          <Button
            onClick={handleEnviar}
            disabled={!deudorSeleccionado || !asunto.trim() || !mensaje.trim() || enviando}
            className="w-full"
          >
            {enviando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Email
              </>
            )}
          </Button>
        </div>

        {/* Resultado del envío */}
        {resultado && (
          <Alert className={resultado.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <div className="flex items-center">
              {resultado.success ? (
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600 mr-2" />
              )}
              <AlertDescription className={resultado.success ? "text-green-800" : "text-red-800"}>
                {resultado.message}
              </AlertDescription>
            </div>
            {resultado.details != null && (
              <details className="mt-2 text-xs text-gray-600">
                <summary>Detalles técnicos</summary>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {typeof resultado.details === 'string'
                    ? resultado.details
                    : JSON.stringify(resultado.details, null, 2)}
                </pre>
              </details>
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
