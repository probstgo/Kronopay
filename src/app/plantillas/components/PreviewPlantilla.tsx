'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Volume2, MessageSquare, Phone } from 'lucide-react'

interface PreviewPlantillaProps {
  tipo: 'email' | 'voz' | 'sms' | 'whatsapp'
  contenido: string
  tipoContenido?: 'texto' | 'html'
  variables: {
    nombre: string
    monto: string
    fecha_vencimiento: string
    empresa: string
    telefono: string
    email: string
  }
}

const ICONOS_TIPO = {
  email: Mail,
  voz: Volume2,
  sms: MessageSquare,
  whatsapp: MessageSquare
}

const COLORES_TIPO = {
  email: 'bg-blue-100 text-blue-800',
  voz: 'bg-purple-100 text-purple-800',
  sms: 'bg-green-100 text-green-800',
  whatsapp: 'bg-green-100 text-green-800'
}

export function PreviewPlantilla({ tipo, contenido, tipoContenido = 'texto', variables }: PreviewPlantillaProps) {
  const IconComponent = ICONOS_TIPO[tipo]
  
  // Reemplazar variables en el contenido
  const contenidoRenderizado = contenido
    .replace(/\{\{nombre\}\}/g, variables.nombre)
    .replace(/\{\{monto\}\}/g, variables.monto)
    .replace(/\{\{fecha_vencimiento\}\}/g, variables.fecha_vencimiento)
    .replace(/\{\{empresa\}\}/g, variables.empresa)
    .replace(/\{\{telefono\}\}/g, variables.telefono)
    .replace(/\{\{email\}\}/g, variables.email)

  // Función para extraer y limpiar HTML
  const procesarHTML = (htmlContent: string) => {
    // Si el HTML tiene estructura completa (DOCTYPE, html, head, body)
    if (htmlContent.includes('<body>')) {
      // Extraer solo el contenido del body
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/)
      if (bodyMatch) {
        return bodyMatch[1]
      }
    }
    
    // Si tiene estructura HTML pero sin body, extraer el contenido principal
    if (htmlContent.includes('<html>')) {
      const htmlMatch = htmlContent.match(/<html[^>]*>([\s\S]*?)<\/html>/)
      if (htmlMatch) {
        // Remover head si existe
        const content = htmlMatch[1].replace(/<head[^>]*>[\s\S]*?<\/head>/, '')
        return content
      }
    }
    
    // Si no tiene estructura completa, usar el contenido tal como está
    return htmlContent
  }

  const renderizarContenido = () => {
    if (!contenido.trim()) {
      return (
        <div className="text-gray-400 italic text-sm">
          Escribe el contenido para ver el preview...
        </div>
      )
    }

    switch (tipo) {
      case 'email':
        return (
          <div className="space-y-3">
            <div className="border-b pb-2">
              <div className="text-sm text-gray-600">De: {variables.email}</div>
              <div className="text-sm text-gray-600">Para: {variables.nombre}</div>
              <div className="text-sm text-gray-600">Asunto: Recordatorio de Pago</div>
            </div>
            <div className={tipoContenido === 'html' ? 'prose prose-sm max-w-none' : 'prose prose-sm max-w-none'}>
              {tipoContenido === 'html' ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: procesarHTML(contenidoRenderizado) }}
                  className="border rounded p-3 bg-white"
                />
              ) : (
                contenidoRenderizado.split('\n').map((linea, index) => (
                  <p key={index} className="mb-2">
                    {linea || '\u00A0'}
                  </p>
                ))
              )}
            </div>
          </div>
        )

      case 'voz':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <span>Llamada a: {variables.telefono}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-2">Script de la llamada:</div>
              <div className="text-sm leading-relaxed">
                {contenidoRenderizado.split('\n').map((linea, index) => (
                  <div key={index} className="mb-1">
                    {linea || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'sms':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MessageSquare className="h-4 w-4" />
              <span>SMS a: {variables.telefono}</span>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
              <div className="text-sm leading-relaxed">
                {contenidoRenderizado}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {contenidoRenderizado.length} caracteres
                {contenidoRenderizado.length > 160 && (
                  <span className="text-orange-600 ml-1">
                    (⚠️ SMS largo, se dividirá en múltiples mensajes)
                  </span>
                )}
              </div>
            </div>
          </div>
        )

      case 'whatsapp':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp a: {variables.telefono}</span>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
              <div className="text-sm leading-relaxed">
                {contenidoRenderizado.split('\n').map((linea, index) => (
                  <div key={index} className="mb-1">
                    {linea || '\u00A0'}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {contenidoRenderizado.length} caracteres
              </div>
            </div>
          </div>
        )

      default:
        return <div>Preview no disponible</div>
    }
  }

  return (
    <div className="space-y-3">
      {/* Header del Preview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconComponent className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium">Preview</span>
        </div>
        <Badge className={COLORES_TIPO[tipo]}>
          {tipo.toUpperCase()}
        </Badge>
      </div>

      {/* Contenido del Preview */}
      <Card>
        <CardContent className="p-4">
          {renderizarContenido()}
        </CardContent>
      </Card>

      {/* Información adicional */}
      {contenido.trim() && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>✓ Variables reemplazadas con datos de ejemplo</div>
          <div>✓ Formato optimizado para {tipo}</div>
          {tipoContenido === 'html' && (
            <div className="text-blue-600">✓ Contenido HTML renderizado</div>
          )}
          {tipo === 'sms' && contenidoRenderizado.length > 160 && (
            <div className="text-orange-600">
              ⚠️ Este SMS será dividido en múltiples mensajes
            </div>
          )}
        </div>
      )}
    </div>
  )
}
