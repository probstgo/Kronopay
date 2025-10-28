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
  const [isHovering, setIsHovering] = React.useState(false)

  const getConnectionColor = (type: string) => {
    switch (type) {
      case 'success': return '#a855f7' // purple-500 (estilo N8N)
      case 'error': return '#ef4444' // red-500
      case 'timeout': return '#f59e0b' // amber-500
      default: return '#a855f7' // purple-500 (estilo N8N - color principal)
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

  // Calcular puntos de control para curva Bézier (estilo N8N)
  const deltaX = endX - startX
  const controlPointOffset = Math.abs(deltaX) * 0.5 // 50% de la distancia horizontal
  
  const controlPoint1X = startX + controlPointOffset
  const controlPoint1Y = startY
  
  const controlPoint2X = endX - controlPointOffset
  const controlPoint2Y = endY

  // Path de la curva Bézier cúbica
  const curvePath = `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`

  // Calcular punto medio de la curva para el label (aproximación)
  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2

  // Calcular ángulo de la flecha en el punto final
  const angle = Math.atan2(endY - controlPoint2Y, endX - controlPoint2X)
  const arrowSize = 8
  
  // Puntos de la flecha
  const arrowPoint1X = endX - arrowSize * Math.cos(angle - Math.PI / 6)
  const arrowPoint1Y = endY - arrowSize * Math.sin(angle - Math.PI / 6)
  const arrowPoint2X = endX - arrowSize * Math.cos(angle + Math.PI / 6)
  const arrowPoint2Y = endY - arrowSize * Math.sin(angle + Math.PI / 6)

  const color = getConnectionColor(connection.type)
  const strokeDasharray = getConnectionStyle(connection.type) === 'dashed' ? '5,5' : 
                          getConnectionStyle(connection.type) === 'dotted' ? '2,2' : 'none'

  return (
    <g
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Curva invisible más ancha para fácil interacción */}
      <path
        d={curvePath}
        stroke="transparent"
        strokeWidth={24}
        fill="none"
        className="cursor-pointer"
        style={{ pointerEvents: 'auto' }}
      />

      {/* Curva principal Bézier (Estilo N8N - grosor mayor) */}
      <path
        d={curvePath}
        stroke={color}
        strokeWidth={isHovering ? 3.5 : 2.5}
        strokeDasharray={strokeDasharray}
        fill="none"
        className="transition-all duration-200"
        style={{ pointerEvents: 'none', opacity: isHovering ? 1 : 0.85 }}
      />
      
      {/* Flecha al final (calculada con ángulo correcto) */}
      <polygon
        points={`${endX},${endY} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
        fill={color}
        className="transition-all pointer-events-none"
        style={{ opacity: isHovering ? 1 : 0.8 }}
      />
      
      {/* Label de la conexión */}
      {connection.label && (
        <text
          x={midX}
          y={midY - 5}
          textAnchor="middle"
          className="text-xs fill-gray-600 pointer-events-none select-none"
          style={{ fontSize: '10px' }}
        >
          {connection.label}
        </text>
      )}
      
      {/* Punto de conexión de salida (más grande estilo N8N) */}
      <circle
        cx={startX}
        cy={startY}
        r={isHovering ? 7 : 5}
        fill={color}
        className="transition-all pointer-events-none"
        style={{ opacity: isHovering ? 1 : 0.9 }}
      />
      
      {/* Punto de conexión de entrada (más grande estilo N8N) */}
      <circle
        cx={endX}
        cy={endY}
        r={isHovering ? 7 : 5}
        fill={color}
        className="transition-all pointer-events-none"
        style={{ opacity: isHovering ? 1 : 0.9 }}
      />

      {/* Tooltip al pasar mouse */}
      {isHovering && (
        <text
          x={midX}
          y={midY - 20}
          textAnchor="middle"
          className="text-xs fill-gray-700 pointer-events-none font-semibold"
          style={{ 
            fontSize: '10px',
            backgroundColor: 'white',
            padding: '2px 4px'
          }}
        >
          Clic derecho para eliminar
        </text>
      )}
    </g>
  )
}

// Componente para renderizar todas las conexiones
interface ConnectionsRendererProps {
  connections: Connection[]
  connectionPoints: ConnectionPoint[]
  canvasScale: number
  onDeleteConnection?: (connectionId: string) => void
}

export function ConnectionsRenderer({ 
  connections, 
  connectionPoints,
  canvasScale,
  onDeleteConnection
}: ConnectionsRendererProps) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0, width: '100%', height: '100%' }}
      onContextMenu={(e) => {
        e.preventDefault()
      }}
    >
      {connections.map(connection => {
        const fromPoint = connectionPoints.find(p => p.id === connection.fromPoint)
        const toPoint = connectionPoints.find(p => p.id === connection.toPoint)
        
        if (!fromPoint || !toPoint) return null
        
        return (
          <g
            key={connection.id}
            onContextMenu={(e) => {
              e.preventDefault()
              onDeleteConnection?.(connection.id)
            }}
          >
            <ConnectionLine
              connection={connection}
              fromPoint={fromPoint}
              toPoint={toPoint}
              canvasScale={canvasScale}
            />
          </g>
        )
      })}
    </svg>
  )
}
