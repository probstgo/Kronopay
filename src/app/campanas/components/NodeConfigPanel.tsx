'use client'

import { useEffect, useRef } from 'react'
import { EmailConfigForm } from './forms/EmailConfigForm'
import { LlamadaConfigForm } from './forms/LlamadaConfigForm'
import { SMSConfigForm } from './forms/SMSConfigForm'
import { WhatsAppConfigForm } from './forms/WhatsAppConfigForm'
import { CondicionConfigForm } from './forms/CondicionConfigForm'
import { FiltroConfigForm } from './forms/FiltroConfigForm'

interface NodeConfigPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: any
  onClose: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSaveConfig: (nodeId: string, config: any) => void
  onConfigChange?: (hasChanges: boolean) => void
}

export function NodeConfigPanel({ node, onClose, onSaveConfig, onConfigChange }: NodeConfigPanelProps) {
  // Guardar la configuración inicial para comparar cambios
  // Los hooks deben estar antes de cualquier return condicional
  const initialConfigRef = useRef(JSON.stringify(node?.data?.configuracion || {}))

  // Actualizar la referencia inicial cuando cambia el nodo
  useEffect(() => {
    if (!node) return
    initialConfigRef.current = JSON.stringify(node.data.configuracion || {})
    // Notificar que no hay cambios al abrir un nuevo nodo
    onConfigChange?.(false)
  }, [node?.id, onConfigChange, node])

  if (!node) return null

  // Función para guardar configuración
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveConfig = (newConfig: any) => {
    onSaveConfig(node.id, newConfig)
    // Actualizar la referencia inicial después de guardar
    initialConfigRef.current = JSON.stringify(newConfig)
    // Notificar que no hay cambios
    onConfigChange?.(false)
  }

  // Función para notificar cambios en la configuración
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleConfigChange = (newConfig: any) => {
    const currentConfig = JSON.stringify(newConfig)
    const hasChanges = currentConfig !== initialConfigRef.current
    onConfigChange?.(hasChanges)
  }

  // Función para obtener el título del nodo según su tipo
  const getNodeTitle = () => {
    switch (node.data.tipo) {
      case 'filtro':
        return node.data.nombre || 'Configuración de Filtro'
      case 'email':
        return node.data.plantilla || 'Configuración de Email'
      case 'llamada':
        return node.data.agente || 'Configuración de Llamada'
      case 'sms':
        return node.data.texto || 'Configuración de SMS'
      case 'whatsapp':
        return node.data.texto || 'Configuración de WhatsApp'
      case 'condicion':
        return node.data.condicion || 'Configuración de Condición'
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
        {node.data.tipo === 'filtro' && (
          <FiltroConfigForm node={node} onSave={handleSaveConfig} onConfigChange={handleConfigChange} />
        )}
        
        {node.data.tipo === 'email' && (
          <EmailConfigForm node={node} onSave={handleSaveConfig} onConfigChange={handleConfigChange} />
        )}
        
        {node.data.tipo === 'llamada' && (
          <LlamadaConfigForm node={node} onSave={handleSaveConfig} onConfigChange={handleConfigChange} />
        )}
        
        
        {node.data.tipo === 'sms' && (
          <SMSConfigForm node={node} onSave={handleSaveConfig} onConfigChange={handleConfigChange} />
        )}
        
        {node.data.tipo === 'whatsapp' && (
          <WhatsAppConfigForm node={node} onSave={handleSaveConfig} onConfigChange={handleConfigChange} />
        )}
        
        {node.data.tipo === 'condicion' && (
          <CondicionConfigForm node={node} onSave={handleSaveConfig} onConfigChange={handleConfigChange} />
        )}
      </div>
    </div>
  )
}
