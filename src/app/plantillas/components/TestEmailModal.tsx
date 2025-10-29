'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, CheckCircle, XCircle, Loader2, Mail, Eye } from 'lucide-react'
import { detectarVariables, obtenerVariablesConInfo, reemplazarVariables } from '@/lib/plantillaUtils'
import { PreviewPlantilla } from './PreviewPlantilla'

interface TestEmailModalProps {
  contenido: string
  tipoContenido: 'texto' | 'html'
  asunto?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onEnviado?: () => void
}

interface EnvioResultado {
  success: boolean
  message: string
  details?: unknown
}

export function TestEmailModal({
  contenido,
  tipoContenido,
  asunto: asuntoInicial = '',
  open,
  onOpenChange,
  onEnviado
}: TestEmailModalProps) {
  const [emailDestino, setEmailDestino] = useState('')
  const [asunto, setAsunto] = useState(asuntoInicial)
  const [variablesValores, setVariablesValores] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<EnvioResultado | null>(null)
  const [mostrarPreview, setMostrarPreview] = useState(false)

  // Detectar variables en contenido y asunto
  const variablesDetectadas = useMemo(() => {
    const contenidoCompleto = `${asunto} ${contenido}`
    return detectarVariables(contenidoCompleto)
  }, [contenido, asunto])

  // Obtener información de variables
  const variablesConInfo = useMemo(() => {
    return obtenerVariablesConInfo(variablesDetectadas)
  }, [variablesDetectadas])

  // Inicializar valores de variables cuando cambian las variables detectadas
  useEffect(() => {
    if (variablesConInfo.length > 0 && Object.keys(variablesValores).length === 0) {
      const valoresIniciales: Record<string, string> = {}
      variablesConInfo.forEach(v => {
        valoresIniciales[v.nombre] = v.valorDummy
      })
      setVariablesValores(valoresIniciales)
    }
  }, [variablesConInfo, variablesValores])

  // Actualizar asunto cuando cambia el prop
  useEffect(() => {
    if (asuntoInicial !== asunto) {
      setAsunto(asuntoInicial)
    }
  }, [asuntoInicial])

  // Resetear formulario cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      setEmailDestino('')
      setAsunto(asuntoInicial)
      setVariablesValores({})
      setResultado(null)
      setMostrarPreview(false)
    }
  }, [open, asuntoInicial])

  const actualizarVariable = (nombre: string, valor: string) => {
    setVariablesValores(prev => ({
      ...prev,
      [nombre]: valor
    }))
  }

  const contenidoProcesado = useMemo(() => {
    return reemplazarVariables(contenido, variablesValores)
  }, [contenido, variablesValores])

  const asuntoProcesado = useMemo(() => {
    return reemplazarVariables(asunto, variablesValores)
  }, [asunto, variablesValores])

  const validarEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const handleEnviar = async () => {
    // Validaciones
    if (!emailDestino.trim()) {
      setResultado({
        success: false,
        message: 'Debes ingresar un email de destino'
      })
      return
    }

    if (!validarEmail(emailDestino)) {
      setResultado({
        success: false,
        message: 'El email ingresado no es válido'
      })
      return
    }

    if (!asunto.trim()) {
      setResultado({
        success: false,
        message: 'El asunto es obligatorio'
      })
      return
    }

    if (!contenidoProcesado.trim()) {
      setResultado({
        success: false,
        message: 'El contenido no puede estar vacío'
      })
      return
    }

    setEnviando(true)
    setResultado(null)

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: emailDestino.trim(),
          subject: asuntoProcesado,
          message: contenidoProcesado,
          tipo_contenido: tipoContenido
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResultado({
          success: true,
          message: 'Email enviado correctamente',
          details: data
        })
        if (onEnviado) {
          onEnviado()
        }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Probar Email de Plantilla
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del remitente */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>📧 Email será enviado desde:</strong> contacto@kronopay.cl
              <br />
              <span className="text-xs text-blue-600">
                (Dominio personalizado configurado)
              </span>
            </div>
          </div>

          {/* Campo Email Destino */}
          <div>
            <Label htmlFor="email-destino">Email de destino</Label>
            <Input
              id="email-destino"
              type="email"
              value={emailDestino}
              onChange={(e) => setEmailDestino(e.target.value)}
              placeholder="ejemplo@email.com"
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ingresa el email donde quieres recibir la prueba
            </p>
          </div>

          {/* Campo Asunto */}
          <div>
            <Label htmlFor="asunto">Asunto</Label>
            <Input
              id="asunto"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Asunto del email..."
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              El asunto puede incluir variables como {variablesDetectadas.length > 0 ? variablesDetectadas[0] : '{{nombre}}'}
            </p>
          </div>

          {/* Editor de Variables */}
          {variablesConInfo.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Variables detectadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {variablesConInfo.map((variable) => (
                  <div key={variable.nombre} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                        {variable.variable}
                      </code>
                      <span className="text-xs text-gray-600">{variable.descripcion}</span>
                    </div>
                    <Input
                      value={variablesValores[variable.nombre] || ''}
                      onChange={(e) => actualizarVariable(variable.nombre, e.target.value)}
                      placeholder={variable.valorDummy}
                      className="text-sm"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Vista Previa */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Vista Previa</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMostrarPreview(!mostrarPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {mostrarPreview ? 'Ocultar' : 'Mostrar'} Preview
              </Button>
            </div>
            {mostrarPreview && (
              <Card className="mt-2">
                <CardHeader>
                  <CardTitle className="text-sm">Asunto: {asuntoProcesado || '(sin asunto)'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <PreviewPlantilla
                    tipo="email"
                    contenido={contenidoProcesado}
                    tipoContenido={tipoContenido}
                    variables={{
                      nombre: variablesValores.nombre || 'Juan Pérez',
                      monto: variablesValores.monto || '$150.000',
                      fecha_vencimiento: variablesValores.fecha_vencimiento || '15 de enero, 2025',
                      empresa: variablesValores.empresa || 'Mi Empresa',
                      telefono: variablesValores.telefono || '+56912345678',
                      email: variablesValores.email || 'contacto@miempresa.com'
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Resultado del envío */}
          {resultado && (
            <Alert className={resultado.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center">
                {resultado.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mr-2" />
                )}
                <AlertDescription className={resultado.success ? 'text-green-800' : 'text-red-800'}>
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

          {/* Botones */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            <Button
              onClick={handleEnviar}
              disabled={
                !emailDestino.trim() ||
                !asunto.trim() ||
                !contenidoProcesado.trim() ||
                !validarEmail(emailDestino) ||
                enviando
              }
            >
              {enviando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Email de Prueba
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

