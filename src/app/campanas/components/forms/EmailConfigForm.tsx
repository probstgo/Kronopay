'use client'

import { useState } from 'react'
import { Node } from 'reactflow'

interface EmailConfigFormProps {
  node: Node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (config: any) => void
}

export function EmailConfigForm({ node, onSave }: EmailConfigFormProps) {
  const [config, setConfig] = useState(node.data.configuracion || {
    plantilla_id: '',
    asunto_personalizado: '',
    variables_dinamicas: {
      nombre: true,
      monto: true,
      fecha_vencimiento: true
    },
    configuracion_avanzada: {
      solo_dias_laborables: true,
      horario_trabajo: { inicio: '09:00', fin: '18:00' },
      reintentos: 3
    }
  })

  const handleSave = () => {
    onSave(config)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Plantilla de Email
        </label>
        <select 
          value={config.plantilla_id}
          onChange={(e) => setConfig({...config, plantilla_id: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar plantilla</option>
          <option value="cobranza_basica">Cobranza Básica</option>
          <option value="cobranza_urgente">Cobranza Urgente</option>
          <option value="recordatorio_pago">Recordatorio de Pago</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Asunto Personalizado
        </label>
        <input 
          type="text"
          value={config.asunto_personalizado}
          onChange={(e) => setConfig({...config, asunto_personalizado: e.target.value})}
          placeholder="Ej: Recordatorio de pago pendiente"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="flex items-center">
            <input 
              type="checkbox"
              checked={config.configuracion_avanzada.solo_dias_laborables}
              onChange={(e) => setConfig({
                ...config, 
                configuracion_avanzada: {...config.configuracion_avanzada, solo_dias_laborables: e.target.checked}
              })}
              className="mr-2"
            />
            <span className="text-sm">Solo días laborables</span>
          </label>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Horario inicio</label>
              <input 
                type="time"
                value={config.configuracion_avanzada.horario_trabajo.inicio}
                onChange={(e) => setConfig({
                  ...config, 
                  configuracion_avanzada: {
                    ...config.configuracion_avanzada, 
                    horario_trabajo: {...config.configuracion_avanzada.horario_trabajo, inicio: e.target.value}
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Horario fin</label>
              <input 
                type="time"
                value={config.configuracion_avanzada.horario_trabajo.fin}
                onChange={(e) => setConfig({
                  ...config, 
                  configuracion_avanzada: {
                    ...config.configuracion_avanzada, 
                    horario_trabajo: {...config.configuracion_avanzada.horario_trabajo, fin: e.target.value}
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
        </div>
      </div>

      <button 
        onClick={handleSave}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
      >
        Guardar Configuración
      </button>
    </div>
  )
}
