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
  valor2?: string // Para operador "entre"
}

export function CondicionConfigForm({ node, onSave }: CondicionConfigFormProps) {
  const [config, setConfig] = useState<{ condiciones: Condicion[], logica: 'AND' | 'OR' }>(node.data.configuracion || {
    condiciones: [
      {
        campo: 'estado_deuda',
        operador: 'igual',
        valor: ''
      }
    ],
    logica: 'AND'
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
          campo: 'estado_deuda',
          operador: 'igual',
          valor: ''
        }
      ]
    })
  }

  // Obtener operadores disponibles según el campo
  const getOperadores = (campo: string) => {
    const camposNumericos = ['monto_deuda', 'dias_vencido']
    const camposTexto = ['estado_deuda', 'historial_email', 'historial_llamada']
    
    if (camposNumericos.includes(campo)) {
      return [
        { value: 'igual', label: 'Igual' },
        { value: 'mayor', label: 'Mayor que' },
        { value: 'menor', label: 'Menor que' },
        { value: 'entre', label: 'Entre' },
        { value: 'existe', label: 'Existe' }
      ]
    }
    
    if (camposTexto.includes(campo)) {
      return [
        { value: 'igual', label: 'Igual' },
        { value: 'contiene', label: 'Contiene' },
        { value: 'existe', label: 'Existe' },
        { value: 'no_existe', label: 'No existe' }
      ]
    }
    
    return [
      { value: 'igual', label: 'Igual' },
      { value: 'existe', label: 'Existe' },
      { value: 'no_existe', label: 'No existe' }
    ]
  }

  // Verificar si el campo necesita dos valores (operador "entre")
  const necesitaValor2 = (operador: string) => {
    return operador === 'entre'
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
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Campo</label>
                    <select 
                      value={condicion.campo}
                      onChange={(e) => {
                        // Resetear operador y valor al cambiar campo
                        updateCondicion(index, 'campo', e.target.value)
                        updateCondicion(index, 'operador', 'igual')
                        updateCondicion(index, 'valor', '')
                        updateCondicion(index, 'valor2', '')
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <optgroup label="Estado de Deuda">
                        <option value="estado_deuda">Estado de Deuda</option>
                      </optgroup>
                      <optgroup label="Monto y Días">
                        <option value="monto_deuda">Monto de Deuda</option>
                        <option value="dias_vencido">Días Vencidos</option>
                      </optgroup>
                      <optgroup label="Historial">
                        <option value="historial_email">Email Enviado</option>
                        <option value="historial_llamada">Llamada Realizada</option>
                      </optgroup>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Operador</label>
                    <select 
                      value={condicion.operador}
                      onChange={(e) => {
                        updateCondicion(index, 'operador', e.target.value)
                        if (e.target.value !== 'entre') {
                          updateCondicion(index, 'valor2', '')
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {getOperadores(condicion.campo).map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {necesitaValor2(condicion.operador) ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Valor Mínimo</label>
                      <input 
                        type={condicion.campo === 'monto_deuda' || condicion.campo === 'dias_vencido' ? 'number' : 'text'}
                        value={condicion.valor}
                        onChange={(e) => updateCondicion(index, 'valor', e.target.value)}
                        placeholder="Mínimo"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Valor Máximo</label>
                      <input 
                        type={condicion.campo === 'monto_deuda' || condicion.campo === 'dias_vencido' ? 'number' : 'text'}
                        value={condicion.valor2 || ''}
                        onChange={(e) => updateCondicion(index, 'valor2', e.target.value)}
                        placeholder="Máximo"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                ) : condicion.operador !== 'existe' && condicion.operador !== 'no_existe' ? (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Valor</label>
                    {condicion.campo === 'estado_deuda' ? (
                      <select
                        value={condicion.valor}
                        onChange={(e) => updateCondicion(index, 'valor', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Seleccionar estado</option>
                        <option value="nueva">Nueva</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="pagado">Pagado</option>
                      </select>
                    ) : (
                      <input 
                        type={condicion.campo === 'monto_deuda' || condicion.campo === 'dias_vencido' ? 'number' : 'text'}
                        value={condicion.valor}
                        onChange={(e) => updateCondicion(index, 'valor', e.target.value)}
                        placeholder="Valor a comparar"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    )}
                  </div>
                ) : null}
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

      {config.condiciones.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lógica entre Condiciones
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input 
                type="radio"
                value="AND"
                checked={config.logica === 'AND'}
                onChange={(e) => setConfig({...config, logica: e.target.value as 'AND' | 'OR'})}
                className="mr-2"
              />
              <span className="text-sm">Todas deben cumplirse (AND)</span>
            </label>
            <label className="flex items-center">
              <input 
                type="radio"
                value="OR"
                checked={config.logica === 'OR'}
                onChange={(e) => setConfig({...config, logica: e.target.value as 'AND' | 'OR'})}
                className="mr-2"
              />
              <span className="text-sm">Al menos una debe cumplirse (OR)</span>
            </label>
          </div>
        </div>
      )}

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <h4 className="text-sm font-medium text-orange-800 mb-1">Información</h4>
        <p className="text-xs text-orange-700">
          Este nodo creará dos salidas: &quot;Sí&quot; (si se cumple la condición) y &quot;No&quot; (si no se cumple).
          {config.condiciones.length > 1 && (
            <> Las condiciones se evaluarán con lógica <strong>{config.logica}</strong>.</>
          )}
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
