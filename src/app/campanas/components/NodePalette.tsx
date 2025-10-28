'use client'

import React from 'react'
import { Card } from '@/components/ui/card'

export interface NodeType {
  tipo: string
  nombre: string
  icono: string
  color: string
  descripcion: string
  categoria: 'inicio' | 'comunicacion' | 'logica' | 'utilidad'
}

interface NodePaletteProps {
  onAddNode: (tipo: string) => void
}

const nodeTypes: NodeType[] = [
  // Categoría: Inicio
  {
    tipo: 'trigger',
    nombre: 'Inicio',
    icono: '🚀',
    color: 'bg-green-500',
    descripcion: 'Punto de inicio del workflow',
    categoria: 'inicio'
  },
  
  // Categoría: Comunicación
  {
    tipo: 'email',
    nombre: 'Email',
    icono: '📧',
    color: 'bg-blue-500',
    descripcion: 'Enviar correo electrónico',
    categoria: 'comunicacion'
  },
  {
    tipo: 'llamada',
    nombre: 'Llamada',
    icono: '📞',
    color: 'bg-purple-500',
    descripcion: 'Realizar llamada telefónica',
    categoria: 'comunicacion'
  },
  {
    tipo: 'sms',
    nombre: 'SMS',
    icono: '📱',
    color: 'bg-orange-500',
    descripcion: 'Enviar mensaje SMS',
    categoria: 'comunicacion'
  },
  {
    tipo: 'whatsapp',
    nombre: 'WhatsApp',
    icono: '💬',
    color: 'bg-green-600',
    descripcion: 'Enviar mensaje por WhatsApp',
    categoria: 'comunicacion'
  },
  
  // Categoría: Lógica
  {
    tipo: 'condicion',
    nombre: 'Condición',
    icono: '🔀',
    color: 'bg-red-500',
    descripcion: 'Evaluar condiciones lógicas',
    categoria: 'logica'
  },
  
  // Categoría: Utilidad
  {
    tipo: 'espera',
    nombre: 'Espera',
    icono: '⏰',
    color: 'bg-yellow-500',
    descripcion: 'Esperar un tiempo determinado',
    categoria: 'utilidad'
  },
  {
    tipo: 'estadistica',
    nombre: 'Estadística',
    icono: '📊',
    color: 'bg-indigo-500',
    descripcion: 'Generar estadísticas y métricas',
    categoria: 'utilidad'
  }
]

const categorias = {
  inicio: { nombre: 'Inicio', icono: '🚀' },
  comunicacion: { nombre: 'Comunicación', icono: '📡' },
  logica: { nombre: 'Lógica', icono: '🧠' },
  utilidad: { nombre: 'Utilidad', icono: '🔧' }
}

export default function NodePalette({ onAddNode }: NodePaletteProps) {
  const nodosPorCategoria = nodeTypes.reduce((acc, node) => {
    if (!acc[node.categoria]) {
      acc[node.categoria] = []
    }
    acc[node.categoria].push(node)
    return acc
  }, {} as Record<string, NodeType[]>)

  return (
    <div className="w-64 bg-white border-r p-4 h-full overflow-y-auto">
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">Nodos Disponibles</h3>
        <p className="text-sm text-gray-500">
          Arrastra nodos al canvas para crear tu workflow
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(nodosPorCategoria).map(([categoria, nodos]) => (
          <div key={categoria}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{categorias[categoria as keyof typeof categorias].icono}</span>
              <h4 className="font-medium text-gray-700 text-sm">
                {categorias[categoria as keyof typeof categorias].nombre}
              </h4>
            </div>
            
            <div className="space-y-2">
              {nodos.map((nodeType) => (
                <Card
                  key={nodeType.tipo}
                  className={`p-3 cursor-move hover:shadow-md transition-all ${nodeType.color} text-white`}
                  onClick={() => onAddNode(nodeType.tipo)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy'
                    e.dataTransfer.setData('nodeType', nodeType.tipo)
                  }}
                  onDragEnd={() => {
                    // Handle drag end if needed
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{nodeType.icono}</span>
                    <span className="font-medium text-sm">{nodeType.nombre}</span>
                  </div>
                  <p className="text-xs opacity-80">{nodeType.descripcion}</p>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Información adicional */}
      <div className="mt-8 p-3 bg-gray-50 rounded-lg">
        <h5 className="font-medium text-gray-700 text-sm mb-2">💡 Consejos</h5>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Siempre comienza con un nodo &quot;Inicio&quot;</li>
          <li>• Conecta nodos arrastrando desde los puntos</li>
          <li>• Haz clic en un nodo para configurarlo</li>
          <li>• Usa &quot;Espera&quot; para controlar el timing</li>
        </ul>
      </div>
    </div>
  )
}
