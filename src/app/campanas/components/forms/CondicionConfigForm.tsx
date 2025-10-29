'use client'

import { useState } from 'react'
import { Node } from 'reactflow'

interface CondicionConfigFormProps {
  node: Node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (config: any) => void
}

interface Condicion {
  campo: string
  operador: string
  valor: string
}

export function CondicionConfigForm({ node, onSave }: CondicionConfigFormProps) {
  const [config, setConfig] = useState<{ condiciones: Condicion[] }>(node.data.configuracion || {
    condiciones: [
      {
        campo: 'respuesta_email',
        operador: 'igual',
        valor: ''
      }
    ]
  })

  const handleSave = () => {
    onSave(config)
  }

  const addCondicion = () => {
    setConfig({
      ...config,
      condiciones: [
        ...config.condiciones,
        {
          campo: 'respuesta_email',
          operador: 'igual',
          valor: ''
        }
      ]
    })
  }

  const removeCondicion = (index: number) => {
    if (config.condiciones.length > 1) {
      setConfig({
        ...config,
        condiciones: config.condiciones.filter((_: unknown, i: number) => i !== index)
      })
    }
  }

  const updateCondicion = (index: number, field: string, value: unknown) => {
    const nuevasCondiciones = [...config.condiciones]
    nuevasCondiciones[index] = { ...nuevasCondiciones[index], [field]: value }
    setConfig({ ...config, condiciones: nuevasCondiciones })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Condiciones Lógicas
        </label>
        <div className="space-y-3">
          {config.condiciones.map((condicion, index) => (
            <div key={index} className="border border-gray-200 rounded-md p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Condición {index + 1}
                </span>
                {config.condiciones.length > 1 && (
                  <button
                    onClick={() => removeCondicion(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕ Eliminar
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Campo</label>
                  <select 
                    value={condicion.campo}
                    onChange={(e) => updateCondicion(index, 'campo', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="respuesta_email">Respuesta Email</option>
                    <option value="contesto_llamada">Contestó Llamada</option>
                    <option value="monto_deuda">Monto de Deuda</option>
                    <option value="dias_vencido">Días Vencido</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Operador</label>
                  <select 
                    value={condicion.operador}
                    onChange={(e) => updateCondicion(index, 'operador', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="igual">Igual</option>
                    <option value="mayor">Mayor que</option>
                    <option value="menor">Menor que</option>
                    <option value="contiene">Contiene</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Valor</label>
                  <input 
                    type={condicion.campo === 'monto_deuda' || condicion.campo === 'dias_vencido' ? 'number' : 'text'}
                    value={condicion.valor}
                    onChange={(e) => updateCondicion(index, 'valor', e.target.value)}
                    placeholder="Valor a comparar"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <button
            onClick={addCondicion}
            className="w-full border-2 border-dashed border-gray-300 rounded-md py-2 text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
          >
            + Agregar Condición
          </button>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <h4 className="text-sm font-medium text-orange-800 mb-1">Información</h4>
        <p className="text-xs text-orange-700">
          Este nodo creará dos salidas: &quot;Sí&quot; (si se cumple la condición) y &quot;No&quot; (si no se cumple).
          Puedes agregar múltiples condiciones que se evaluarán con lógica AND.
        </p>
      </div>

      <button 
        onClick={handleSave}
        className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors"
      >
        Guardar Configuración
      </button>
    </div>
  )
}
