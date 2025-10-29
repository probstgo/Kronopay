'use client'

import { useState } from 'react'
import { Node } from 'reactflow'

interface EsperaConfigFormProps {
  node: Node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (config: any) => void
}

export function EsperaConfigForm({ node, onSave }: EsperaConfigFormProps) {
  const [config, setConfig] = useState(node.data.configuracion || {
    duracion: {
      tipo: 'dias',
      cantidad: 2
    },
    configuracion_avanzada: {
      solo_dias_laborables: true,
      excluir_fines_semana: true,
      zona_horaria: 'America/Mexico_City'
    }
  })

  const handleSave = () => {
    onSave(config)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Duración de la Espera
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Cantidad</label>
            <input 
              type="number"
              min="1"
              max="365"
              value={config.duracion.cantidad}
              onChange={(e) => setConfig({
                ...config, 
                duracion: {...config.duracion, cantidad: parseInt(e.target.value)}
              })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Tipo</label>
            <select 
              value={config.duracion.tipo}
              onChange={(e) => setConfig({
                ...config, 
                duracion: {...config.duracion, tipo: e.target.value}
              })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="minutos">Minutos</option>
              <option value="horas">Horas</option>
              <option value="dias">Días</option>
              <option value="semanas">Semanas</option>
            </select>
          </div>
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
          
          <label className="flex items-center">
            <input 
              type="checkbox"
              checked={config.configuracion_avanzada.excluir_fines_semana}
              onChange={(e) => setConfig({
                ...config, 
                configuracion_avanzada: {...config.configuracion_avanzada, excluir_fines_semana: e.target.checked}
              })}
              className="mr-2"
            />
            <span className="text-sm">Excluir fines de semana</span>
          </label>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Zona horaria</label>
            <select 
              value={config.configuracion_avanzada.zona_horaria}
              onChange={(e) => setConfig({
                ...config, 
                configuracion_avanzada: {...config.configuracion_avanzada, zona_horaria: e.target.value}
              })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="America/Mexico_City">México (GMT-6)</option>
              <option value="America/New_York">Nueva York (GMT-5)</option>
              <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
              <option value="Europe/Madrid">Madrid (GMT+1)</option>
            </select>
          </div>
        </div>
      </div>

      <button 
        onClick={handleSave}
        className="w-full bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors"
      >
        Guardar Configuración
      </button>
    </div>
  )
}
