'use client'

import { useState, useEffect } from 'react'
import { Node } from 'reactflow'

interface LlamadaConfigFormProps {
  node: Node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (config: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConfigChange?: (config: any) => void
}

interface Agente {
  id: string
  nombre: string
  agent_id: string
  activo: boolean
}

export function LlamadaConfigForm({ node, onSave, onConfigChange }: LlamadaConfigFormProps) {
  const [config, setConfig] = useState(node.data.configuracion || {
    agente_id: '',
    configuracion_avanzada: {
      horario_llamadas: { inicio: '09:00', fin: '18:00' },
      reintentos: 3,
      grabar_conversacion: true
    }
  })
  const [agentes, setAgentes] = useState<Agente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar agentes desde la BD
  useEffect(() => {
    const cargarAgentes = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/telefono/agentes')
        
        if (!response.ok) {
          throw new Error('Error al cargar agentes')
        }
        
        const data = await response.json()
        // Filtrar solo agentes activos
        const agentesActivos = data.filter((agente: Agente) => agente.activo)
        setAgentes(agentesActivos)
      } catch (err) {
        console.error('Error cargando agentes:', err)
        setError('Error al cargar agentes. Por favor, recarga la página.')
      } finally {
        setLoading(false)
      }
    }

    cargarAgentes()
  }, [])

  const handleSave = () => {
    // Validar que se haya seleccionado un agente
    if (!config.agente_id) {
      setError('Debes seleccionar un agente de llamada para continuar')
      return
    }

    // Validar que existan agentes disponibles
    if (agentes.length === 0) {
      setError('No hay agentes disponibles. Crea uno en la sección de Teléfono.')
      return
    }

    setError(null)
    onSave(config)
  }

  // Notificar cambios cuando se modifica la configuración
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config)
    }
  }, [config, onConfigChange])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Agente Asignado <span className="text-red-500">*</span>
        </label>
        {loading ? (
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
            Cargando agentes...
          </div>
        ) : (
          <select 
            value={config.agente_id}
            onChange={(e) => {
              setConfig({...config, agente_id: e.target.value})
              setError(null)
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              error && !config.agente_id ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Seleccionar agente</option>
            {agentes.map((agente) => (
              <option key={agente.id} value={agente.id}>
                {agente.nombre}
              </option>
            ))}
          </select>
        )}
        {agentes.length === 0 && !loading && (
          <p className="text-xs text-gray-500 mt-1">
            No hay agentes disponibles. Crea uno en la sección de Teléfono.
          </p>
        )}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-600 font-medium">{error}</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Configuración Avanzada
        </label>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Horario inicio</label>
              <input 
                type="time"
                value={config.configuracion_avanzada.horario_llamadas.inicio}
                onChange={(e) => setConfig({
                  ...config, 
                  configuracion_avanzada: {
                    ...config.configuracion_avanzada, 
                    horario_llamadas: {...config.configuracion_avanzada.horario_llamadas, inicio: e.target.value}
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Horario fin</label>
              <input 
                type="time"
                value={config.configuracion_avanzada.horario_llamadas.fin}
                onChange={(e) => setConfig({
                  ...config, 
                  configuracion_avanzada: {
                    ...config.configuracion_avanzada, 
                    horario_llamadas: {...config.configuracion_avanzada.horario_llamadas, fin: e.target.value}
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Número de reintentos</label>
            <input 
              type="number"
              min="0"
              max="5"
              value={config.configuracion_avanzada.reintentos}
              onChange={(e) => setConfig({
                ...config, 
                configuracion_avanzada: {...config.configuracion_avanzada, reintentos: parseInt(e.target.value)}
              })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>

          <label className="flex items-center">
            <input 
              type="checkbox"
              checked={config.configuracion_avanzada.grabar_conversacion}
              onChange={(e) => setConfig({
                ...config, 
                configuracion_avanzada: {...config.configuracion_avanzada, grabar_conversacion: e.target.checked}
              })}
              className="mr-2"
            />
            <span className="text-sm">Grabar conversación</span>
          </label>
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={!config.agente_id || agentes.length === 0}
        className={`w-full py-2 px-4 rounded-md transition-colors ${
          !config.agente_id || agentes.length === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
      >
        {!config.agente_id ? 'Selecciona un agente para guardar' : 'Guardar Configuración'}
      </button>
    </div>
  )
}
