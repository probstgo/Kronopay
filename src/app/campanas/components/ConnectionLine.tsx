'use client'

import React from 'react'

export interface ConnectionPoint {
  id: string
  nodeId: string
  type: 'input' | 'output'
  position: { x: number; y: number }
  label?: string
}

export interface Connection {
  id: string
  from: string
  to: string
  fromPoint: string
  toPoint: string
  type: 'success' | 'error' | 'timeout' | 'default'
  label?: string
}

interface ConnectionLineProps {
  connection: Connection
  fromPoint: ConnectionPoint
  toPoint: ConnectionPoint
  canvasScale: number
}

export default function ConnectionLine({ 
  connection, 
  fromPoint, 
  toPoint
}: ConnectionLineProps) {
  const getConnectionColor = (type: string) => {
    switch (type) {
      case 'success': return '#10b981' // green-500
      case 'error': return '#ef4444' // red-500
      case 'timeout': return '#f59e0b' // amber-500
      default: return '#6b7280' // gray-500
    }
  }

  const getConnectionStyle = (type: string) => {
    switch (type) {
      case 'success': return 'solid'
      case 'error': return 'dashed'
      case 'timeout': return 'dotted'
      default: return 'solid'
    }
  }

  // Calcular puntos de la línea
  const startX = fromPoint.position.x
  const startY = fromPoint.position.y
  const endX = toPoint.position.x
  const endY = toPoint.position.y

  // Calcular punto medio para el label
  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2

  const color = getConnectionColor(connection.type)
  const strokeDasharray = getConnectionStyle(connection.type) === 'dashed' ? '5,5' : 
                          getConnectionStyle(connection.type) === 'dotted' ? '2,2' : 'none'

  return (
    <g>
      {/* Línea principal */}
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={strokeDasharray}
        fill="none"
        className="cursor-pointer hover:stroke-width-3 transition-all"
      />
      
      {/* Flecha al final */}
      <polygon
        points={`${endX},${endY} ${endX - 8},${endY - 4} ${endX - 8},${endY + 4}`}
        fill={color}
        className="transition-all"
      />
      
      {/* Label de la conexión */}
      {connection.label && (
        <text
          x={midX}
          y={midY - 5}
          textAnchor="middle"
          className="text-xs fill-gray-600 pointer-events-none"
          style={{ fontSize: '10px' }}
        >
          {connection.label}
        </text>
      )}
      
      {/* Punto de conexión de salida */}
      <circle
        cx={startX}
        cy={startY}
        r={4}
        fill={color}
        className="cursor-pointer hover:r-6 transition-all"
      />
      
      {/* Punto de conexión de entrada */}
      <circle
        cx={endX}
        cy={endY}
        r={4}
        fill={color}
        className="cursor-pointer hover:r-6 transition-all"
      />
    </g>
  )
}

// Componente para renderizar todas las conexiones
interface ConnectionsRendererProps {
  connections: Connection[]
  connectionPoints: ConnectionPoint[]
  canvasScale: number
}

export function ConnectionsRenderer({ 
  connections, 
  connectionPoints, 
  canvasScale 
}: ConnectionsRendererProps) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      {connections.map(connection => {
        const fromPoint = connectionPoints.find(p => p.id === connection.fromPoint)
        const toPoint = connectionPoints.find(p => p.id === connection.toPoint)
        
        if (!fromPoint || !toPoint) return null
        
        return (
          <ConnectionLine
            key={connection.id}
            connection={connection}
            fromPoint={fromPoint}
            toPoint={toPoint}
            canvasScale={canvasScale}
          />
        )
      })}
    </svg>
  )
}
