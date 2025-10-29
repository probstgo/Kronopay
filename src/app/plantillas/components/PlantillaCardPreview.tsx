'use client'

interface PlantillaCardPreviewProps {
  tipo: 'email' | 'sms' | 'whatsapp'
  contenido: string
  tipoContenido: 'texto' | 'html'
}

export function PlantillaCardPreview({ tipo, contenido, tipoContenido }: PlantillaCardPreviewProps) {
  // Variables de ejemplo para mostrar en la vista previa
  const variablesEjemplo = {
    nombre: 'Juan Pérez',
    monto: '$150.000',
    fecha_vencimiento: '15 de enero, 2025',
    empresa: 'Mi Empresa',
    telefono: '+56912345678',
    email: 'contacto@miempresa.com'
  }

  // Si no hay contenido, mostrar placeholder
  if (!contenido.trim()) {
    return (
      <div className="text-gray-400 italic text-sm text-center py-4">
        Sin contenido
      </div>
    )
  }

  // Función para reemplazar variables en el contenido
  const contenidoRenderizado = contenido
    .replace(/\{\{nombre\}\}/g, variablesEjemplo.nombre)
    .replace(/\{\{monto\}\}/g, variablesEjemplo.monto)
    .replace(/\{\{fecha_vencimiento\}\}/g, variablesEjemplo.fecha_vencimiento)
    .replace(/\{\{empresa\}\}/g, variablesEjemplo.empresa)
    .replace(/\{\{telefono\}\}/g, variablesEjemplo.telefono)
    .replace(/\{\{email\}\}/g, variablesEjemplo.email)

  // Función para extraer texto limpio del HTML
  const extraerTextoDelHTML = (html: string): string => {
    // Crear un elemento temporal para extraer el texto
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
  }

  // Función para obtener una vista previa limpia
  const obtenerVistaPrevia = () => {
    if (tipoContenido === 'html') {
      const textoLimpio = extraerTextoDelHTML(contenidoRenderizado)
      return textoLimpio.length > 80 ? `${textoLimpio.substring(0, 80)}...` : textoLimpio
    } else {
      return contenidoRenderizado.length > 80 
        ? `${contenidoRenderizado.substring(0, 80)}...` 
        : contenidoRenderizado
    }
  }

  const renderizarContenido = () => {
    switch (tipo) {
      case 'email':
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 border-b pb-1">
              <div>De: {variablesEjemplo.email}</div>
              <div>Para: {variablesEjemplo.nombre}</div>
            </div>
            <div className="text-sm text-gray-700">
              {tipoContenido === 'html' ? (
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: contenidoRenderizado.replace(/<[^>]*>/g, '').substring(0, 100) + '...'
                  }}
                />
              ) : (
                obtenerVistaPrevia()
              )}
            </div>
          </div>
        )

      case 'sms':
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">
              SMS para: {variablesEjemplo.telefono}
            </div>
            <div className="text-sm text-gray-700">
              {obtenerVistaPrevia()}
            </div>
          </div>
        )

      case 'whatsapp':
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">
              WhatsApp para: {variablesEjemplo.telefono}
            </div>
            <div className="text-sm text-gray-700">
              {obtenerVistaPrevia()}
            </div>
          </div>
        )

      default:
        return <div className="text-sm text-gray-700">{obtenerVistaPrevia()}</div>
    }
  }

  return (
    <div className="max-h-24 overflow-hidden">
      {renderizarContenido()}
    </div>
  )
}
