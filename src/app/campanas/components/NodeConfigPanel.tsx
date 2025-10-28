'use client'

import { EmailConfigForm } from './forms/EmailConfigForm'
import { LlamadaConfigForm } from './forms/LlamadaConfigForm'
import { EsperaConfigForm } from './forms/EsperaConfigForm'
import { SMSConfigForm } from './forms/SMSConfigForm'
import { CondicionConfigForm } from './forms/CondicionConfigForm'
import { EstadisticaConfigForm } from './forms/EstadisticaConfigForm'

interface NodeConfigPanelProps {
  node: any
  onClose: () => void
  onSaveConfig: (nodeId: string, config: any) => void
}

export function NodeConfigPanel({ node, onClose, onSaveConfig }: NodeConfigPanelProps) {
  if (!node) return null

  // Función para guardar configuración
  const handleSaveConfig = (newConfig: any) => {
    onSaveConfig(node.id, newConfig)
  }

  // Función para obtener el título del nodo según su tipo
  const getNodeTitle = () => {
    switch (node.data.tipo) {
      case 'email':
        return node.data.plantilla || 'Configuración de Email'
      case 'llamada':
        return node.data.agente || 'Configuración de Llamada'
      case 'espera':
        return node.data.duracion || 'Configuración de Espera'
      case 'sms':
        return node.data.texto || 'Configuración de SMS'
      case 'condicion':
        return node.data.condicion || 'Configuración de Condición'
      case 'estadistica':
        return node.data.titulo || 'Configuración de Estadística'
      default:
        return 'Configuración'
    }
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">Configuración</h3>
          <p className="text-sm text-gray-600">{getNodeTitle()}</p>
        </div>
        <button 
          onClick={onClose} 
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      
      {/* Información básica del nodo */}
      <div className="mb-6 p-3 bg-gray-50 rounded-md">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Tipo:</span>
            <div className="font-medium capitalize">{node.data.tipo}</div>
          </div>
          <div>
            <span className="text-gray-600">ID:</span>
            <div className="font-mono text-xs">{node.id}</div>
          </div>
        </div>
      </div>
      
      {/* Formulario específico según el tipo de nodo */}
      <div className="space-y-4">
        {node.data.tipo === 'email' && (
          <EmailConfigForm node={node} onSave={handleSaveConfig} />
        )}
        
        {node.data.tipo === 'llamada' && (
          <LlamadaConfigForm node={node} onSave={handleSaveConfig} />
        )}
        
        {node.data.tipo === 'espera' && (
          <EsperaConfigForm node={node} onSave={handleSaveConfig} />
        )}
        
        {node.data.tipo === 'sms' && (
          <SMSConfigForm node={node} onSave={handleSaveConfig} />
        )}
        
        {node.data.tipo === 'condicion' && (
          <CondicionConfigForm node={node} onSave={handleSaveConfig} />
        )}
        
        {node.data.tipo === 'estadistica' && (
          <EstadisticaConfigForm node={node} onSave={handleSaveConfig} />
        )}
      </div>
    </div>
  )
}
