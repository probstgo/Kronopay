'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Type, Code, AlertTriangle } from 'lucide-react'

interface Variable {
  variable: string
  descripcion: string
}

interface EditorContenidoProps {
  value: string
  onChange: (value: string) => void
  variables: Variable[]
  tipoContenido?: 'texto' | 'html'
  maxLength?: number
}

export function EditorContenido({ value, onChange, variables, tipoContenido = 'texto', maxLength }: EditorContenidoProps) {
  const [mostrarVariables, setMostrarVariables] = useState(false)
  
  // Asegurar que value siempre sea un string
  const safeValue = typeof value === 'string' ? value : ''

  const insertarVariable = (variable: string) => {
    const textarea = document.getElementById('contenido') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const nuevoContenido = safeValue.substring(0, start) + variable + safeValue.substring(end)
      onChange(nuevoContenido)
      
      // Restaurar el foco y posición del cursor
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  const contarCaracteres = () => {
    return safeValue.length
  }

  const contarPalabras = () => {
    return safeValue.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  const validarHTML = () => {
    if (tipoContenido !== 'html') return { esValido: true, errores: [] }
    
    const errores: string[] = []
    
    // Verificar tags básicos
    const tagsAbiertos = (safeValue.match(/<[^/][^>]*>/g) || []).length
    const tagsCerrados = (safeValue.match(/<\/[^>]*>/g) || []).length
    
    if (tagsAbiertos !== tagsCerrados) {
      errores.push('Tags HTML no balanceados')
    }
    
    // Verificar tags peligrosos
    const tagsPeligrosos = ['script', 'iframe', 'object', 'embed', 'form']
    tagsPeligrosos.forEach(tag => {
      if (safeValue.toLowerCase().includes(`<${tag}`)) {
        errores.push(`Tag <${tag}> no permitido por seguridad`)
      }
    })
    
    return {
      esValido: errores.length === 0,
      errores
    }
  }

  const validacionHTML = validarHTML()

  return (
    <div className="space-y-4">
      {/* Editor Principal */}
      <div className="relative">
        <Textarea
          id="contenido"
          value={safeValue}
          onChange={(e) => {
            const nuevoValor = e.target.value
            if (maxLength && nuevoValor.length > maxLength) {
              onChange(nuevoValor.slice(0, maxLength))
            } else {
              onChange(nuevoValor)
            }
          }}
          placeholder={tipoContenido === 'html' 
            ? "Escribe el contenido HTML de tu plantilla aquí...\nEjemplo: <p>Hola {{nombre}}, tu deuda es de {{monto}}</p>"
            : "Escribe el contenido de tu plantilla aquí..."
          }
          className="min-h-[200px] resize-none font-mono"
        />
        
        {/* Contador de caracteres */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
          {contarCaracteres()} caracteres • {contarPalabras()} palabras
          {tipoContenido === 'html' && (
            <span className="ml-2 text-blue-600">HTML</span>
          )}
        </div>
      </div>

      {/* Información del tipo de contenido */}
      {tipoContenido === 'html' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Code className="h-4 w-4" />
            <span className="font-medium">Modo HTML</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Puedes usar etiquetas HTML como &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;br&gt;, etc.
            Las variables como {'{{nombre}}'} funcionan igual que en texto plano.
          </p>
        </div>
      )}

      {/* Validación HTML */}
      {tipoContenido === 'html' && !validacionHTML.esValido && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Errores en HTML</span>
          </div>
          <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
            {validacionHTML.errores.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Botón de Variables */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMostrarVariables(!mostrarVariables)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {mostrarVariables ? 'Ocultar' : 'Mostrar'} Variables
        </Button>
        
        {/* Estadísticas rápidas */}
        <div className="text-sm text-gray-500">
          {safeValue.includes('{{') ? '✓ Variables detectadas' : '⚠ Sin variables'}
        </div>
      </div>

      {/* Panel de Variables */}
      {mostrarVariables && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Type className="h-4 w-4" />
              Variables Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-2">
              {variables.map(variable => (
                <div 
                  key={variable.variable}
                  className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => insertarVariable(variable.variable)}
                >
                  <div>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                      {variable.variable}
                    </code>
                    <p className="text-xs text-gray-600 mt-1">{variable.descripcion}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              💡 Haz clic en cualquier variable para insertarla en el cursor
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sugerencias según el tipo de contenido */}
      {safeValue.length > 0 && (
        <div className="text-xs text-gray-500">
          {safeValue.includes('{{nombre}}') ? '✓' : '⚠'} Nombre personalizado
          {' • '}
          {safeValue.includes('{{monto}}') ? '✓' : '⚠'} Monto específico
          {' • '}
          {safeValue.includes('{{fecha_vencimiento}}') ? '✓' : '⚠'} Fecha de vencimiento
        </div>
      )}
    </div>
  )
}
