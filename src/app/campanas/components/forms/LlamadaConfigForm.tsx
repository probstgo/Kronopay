'use client'

import { useState } from 'react'
import { Node } from 'reactflow'

interface LlamadaConfigFormProps {
  node: Node
  onSave: (config: any) => void
}

export function LlamadaConfigForm({ node, onSave }: LlamadaConfigFormProps) {
  const [config, setConfig] = useState(node.data.configuracion || {
    agente_id: '',
    script_personalizado: '',
    variables_dinamicas: {
      nombre: true,
      monto: true,
      fecha_vencimiento: true
    },
    configuracion_avanzada: {
      horario_llamadas: { inicio: '09:00', fin: '18:00' },
      reintentos: 3,
      grabar_conversacion: true
    }
  })

  const handleSave = () => {
    onSave(config)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Agente Asignado
        </label>
        <select 
          value={config.agente_id}
          onChange={(e) => setConfig({...config, agente_id: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Seleccionar agente</option>
          <option value="agente_principal">Agente Principal</option>
          <option value="agente_secundario">Agente Secundario</option>
          <option value="agente_especializado">Agente Especializado</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Script Personalizado
        </label>
        <textarea 
          value={config.script_personalizado}
          onChange={(e) => setConfig({...config, script_personalizado: e.target.value})}
          placeholder="Ej: Hola [NOMBRE], llamo para recordarte que tienes una deuda de $[MONTO]..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Variables Dinámicas
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input 
              type="checkbox"
              checked={config.variables_dinamicas.nombre}
              onChange={(e) => setConfig({
                ...config, 
                variables_dinamicas: {...config.variables_dinamicas, nombre: e.target.checked}
              })}
              className="mr-2"
            />
            <span className="text-sm">Incluir nombre del deudor</span>
          </label>
          <label className="flex items-center">
            <input 
              type="checkbox"
              checked={config.variables_dinamicas.monto}
              onChange={(e) => setConfig({
                ...config, 
                variables_dinamicas: {...config.variables_dinamicas, monto: e.target.checked}
              })}
              className="mr-2"
            />
            <span className="text-sm">Incluir monto de la deuda</span>
          </label>
          <label className="flex items-center">
            <input 
              type="checkbox"
              checked={config.variables_dinamicas.fecha_vencimiento}
              onChange={(e) => setConfig({
                ...config, 
                variables_dinamicas: {...config.variables_dinamicas, fecha_vencimiento: e.target.checked}
              })}
              className="mr-2"
            />
            <span className="text-sm">Incluir fecha de vencimiento</span>
          </label>
        </div>
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
        className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
      >
        Guardar Configuración
      </button>
    </div>
  )
}
