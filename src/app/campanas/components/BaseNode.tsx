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
  return (
    <div
      className={`absolute cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg z-10' : 'hover:shadow-md z-0'
      }`}
      style={{
        left: posicion.x,
        top: posicion.y,
        transform: `scale(${canvasScale})`
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(id)
      }}
      onMouseDown={(e) => {
        onNodeMouseDown?.(e, id)
      }}
    >
      <Card className={`w-48 h-24 ${color} text-white`}>
        <div className="p-3 h-full flex flex-col justify-between">
          {/* Header del nodo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{icono}</span>
              <span className="font-medium text-sm">{nombre}</span>
            </div>
            
            {/* Botones de acción cuando está seleccionado */}
            {isSelected && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    onConfigure(id)
                  }}
                  title="Configurar"
                >
                  <Settings className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate(id)
                  }}
                  title="Duplicar"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(id)
                  }}
                  title="Eliminar"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          {/* Descripción del nodo */}
          <div className="text-xs opacity-80">
            {descripcion}
          </div>
          
          {/* Indicadores de estado */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1">
              {/* Puntos de conexión de entrada */}
              <div 
                className="w-3 h-3 bg-white/40 rounded-full cursor-pointer hover:bg-white/60 transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  onConnectionEnd?.(id, `${id}_input`)
                }}
                title="Punto de entrada"
              ></div>
            </div>
            
            {/* Estado del nodo */}
            <div className="text-xs opacity-60">
              {(configuracion.estado as string) || 'Listo'}
            </div>
            
            <div className="flex items-center gap-1">
              {/* Puntos de conexión de salida */}
              <div 
                className="w-3 h-3 bg-white/40 rounded-full cursor-pointer hover:bg-white/60 transition-all"
                onClick={(e) => {
                  e.stopPropagation()
                  onConnectionStart?.(id, `${id}_output`)
                }}
                title="Punto de salida"
              ></div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
