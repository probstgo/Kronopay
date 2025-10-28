'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Trash2, Settings } from 'lucide-react'
// import { ConnectionPoint } from './ConnectionLine'

export interface BaseNodeProps {
  id: string
  tipo: string
  nombre: string
  icono: string
  color: string
  descripcion: string
  posicion: { x: number; y: number }
  isSelected: boolean
  configuracion: Record<string, unknown>
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onConfigure: (id: string) => void
  onConnectionStart?: (nodeId: string, pointId: string) => void
  onConnectionEnd?: (nodeId: string, pointId: string) => void
  onNodeMouseDown?: (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => void
  canvasScale: number
}

export default function BaseNode({
  id,
  nombre,
  icono,
  color,
  descripcion,
  posicion,
  isSelected,
  configuracion,
  onSelect,
  onDelete,
  onDuplicate,
  onConfigure,
  onConnectionStart,
  onConnectionEnd,
  onNodeMouseDown,
  canvasScale
}: BaseNodeProps) {
  const [connectionHover, setConnectionHover] = React.useState<'input' | 'output' | null>(null)

  const handleConnectionClick = (e: React.MouseEvent, type: 'input' | 'output') => {
    e.preventDefault()
    e.stopPropagation()
    
    if (type === 'output') {
      // Iniciar conexión desde este nodo
      onConnectionStart?.(id, `${id}_output`)
    } else if (type === 'input') {
      // Terminar conexión en este nodo
      onConnectionEnd?.(id, `${id}_input`)
    }
  }

  return (
    <div
      className={`absolute transition-all duration-200 ${
        isSelected ? 'z-10' : 'z-0'
      }`}
      style={{
        left: posicion.x,
        top: posicion.y,
        transform: `scale(${canvasScale})`
      }}
    >
      {/* Punto de conexión de ENTRADA - IZQUIERDA (Estilo N8N) */}
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full cursor-crosshair transition-all duration-200 border-[3px] z-50
          ${connectionHover === 'input' 
            ? 'bg-orange-400 border-orange-500 scale-[1.4] shadow-[0_0_12px_rgba(251,146,60,0.6)]' 
            : 'bg-gray-300 border-gray-400 hover:bg-orange-300 hover:border-orange-400 hover:scale-110 hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]'
          }
        `}
        onClick={(e) => handleConnectionClick(e, 'input')}
        onMouseEnter={() => setConnectionHover('input')}
        onMouseLeave={() => setConnectionHover(null)}
        title="Entrada"
      />

      {/* Punto de conexión de SALIDA - DERECHA (Estilo N8N) */}
      <div
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full cursor-crosshair transition-all duration-200 border-[3px] z-50
          ${connectionHover === 'output' 
            ? 'bg-purple-400 border-purple-500 scale-[1.4] shadow-[0_0_12px_rgba(168,85,247,0.6)]' 
            : 'bg-gray-300 border-gray-400 hover:bg-purple-300 hover:border-purple-400 hover:scale-110 hover:shadow-[0_0_8px_rgba(168,85,247,0.4)]'
          }
        `}
        onClick={(e) => handleConnectionClick(e, 'output')}
        onMouseEnter={() => setConnectionHover('output')}
        onMouseLeave={() => setConnectionHover(null)}
        title="Salida"
      />

      {/* Card del nodo */}
      <Card 
        className={`min-w-52 w-52 min-h-28 ${color} text-white relative cursor-pointer ${
          isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(id)
        }}
        onMouseDown={(e) => {
          // Solo permitir mover si no estamos en un punto de conexión
          if (!connectionHover) {
            onNodeMouseDown?.(e, id)
          }
        }}
      >
        <div className="p-2 flex flex-col relative">
          {/* Botones de acción cuando está seleccionado - Posicionados absolutamente */}
          {isSelected && (
            <div className="absolute top-1 right-1 flex gap-1 z-10">
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  onConfigure(id)
                }}
                title="Configurar"
              >
                <Settings className="h-2.5 w-2.5" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicate(id)
                }}
                title="Duplicar"
              >
                <Copy className="h-2.5 w-2.5" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(id)
                }}
                title="Eliminar"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          )}
          
          {/* Contenido principal del nodo - Estructura optimizada para el espacio */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{icono}</span>
            <span className="font-medium text-xs whitespace-normal break-words">{nombre}</span>
          </div>
          
          {/* Descripción del nodo */}
          <div className="text-xs opacity-80 mb-1 leading-tight whitespace-normal break-words">
            {descripcion}
          </div>
          
          {/* Estado del nodo */}
          <div className="text-xs opacity-60 whitespace-normal break-words">
            {(configuracion.estado as string) || 'Listo'}
          </div>
        </div>
      </Card>
    </div>
  )
}
