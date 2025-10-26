'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Type } from 'lucide-react'

interface Variable {
  variable: string
  descripcion: string
}

interface EditorContenidoProps {
  value: string
  onChange: (value: string) => void
  variables: Variable[]
}

export function EditorContenido({ value, onChange, variables }: EditorContenidoProps) {
  const [mostrarVariables, setMostrarVariables] = useState(false)

  const insertarVariable = (variable: string) => {
    const textarea = document.getElementById('contenido') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const nuevoContenido = value.substring(0, start) + variable + value.substring(end)
      onChange(nuevoContenido)
      
      // Restaurar el foco y posición del cursor
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  const contarCaracteres = () => {
    return value.length
  }

  const contarPalabras = () => {
    return value.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  return (
    <div className="space-y-4">
      {/* Editor Principal */}
      <div className="relative">
        <Textarea
          id="contenido"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribe el contenido de tu plantilla aquí..."
          className="min-h-[200px] resize-none"
        />
        
        {/* Contador de caracteres */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
          {contarCaracteres()} caracteres • {contarPalabras()} palabras
        </div>
      </div>

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
          {value.includes('{{') ? '✓ Variables detectadas' : '⚠ Sin variables'}
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
      {value.length > 0 && (
        <div className="text-xs text-gray-500">
          {value.includes('{{nombre}}') ? '✓' : '⚠'} Nombre personalizado
          {' • '}
          {value.includes('{{monto}}') ? '✓' : '⚠'} Monto específico
          {' • '}
          {value.includes('{{fecha_vencimiento}}') ? '✓' : '⚠'} Fecha de vencimiento
        </div>
      )}
    </div>
  )
}
