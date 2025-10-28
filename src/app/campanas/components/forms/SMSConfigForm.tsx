'use client'

import { useState } from 'react'
import { Node } from 'reactflow'

interface SMSConfigFormProps {
  node: Node
  onSave: (config: any) => void
}

export function SMSConfigForm({ node, onSave }: SMSConfigFormProps) {
  const [config, setConfig] = useState(node.data.configuracion || {
    texto: '',
    variables_dinamicas: {
      nombre: true,
      monto: true
    },
    configuracion_avanzada: {
      horario_envio: { inicio: '09:00', fin: '18:00' },
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
          Texto del SMS
        </label>
        <textarea 
          value={config.texto}
          onChange={(e) => setConfig({...config, texto: e.target.value})}
          placeholder="Ej: Hola [NOMBRE], tienes una deuda de $[MONTO]. Por favor contacta para resolver."
          rows={3}
          maxLength={160}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <div className="text-xs text-gray-500 mt-1">
          {config.texto.length}/160 caracteres
        </div>
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
                value={config.configuracion_avanzada.horario_envio.inicio}
                onChange={(e) => setConfig({
                  ...config, 
                  configuracion_avanzada: {
                    ...config.configuracion_avanzada, 
                    horario_envio: {...config.configuracion_avanzada.horario_envio, inicio: e.target.value}
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Horario fin</label>
              <input 
                type="time"
                value={config.configuracion_avanzada.horario_envio.fin}
                onChange={(e) => setConfig({
                  ...config, 
                  configuracion_avanzada: {
                    ...config.configuracion_avanzada, 
                    horario_envio: {...config.configuracion_avanzada.horario_envio, fin: e.target.value}
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
        className="w-full bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-600 transition-colors"
      >
        Guardar Configuración
      </button>
    </div>
  )
}
