'use client'

import { useState } from 'react'
import { Node } from 'reactflow'

interface EstadisticaConfigFormProps {
  node: Node
  onSave: (config: any) => void
}

export function EstadisticaConfigForm({ node, onSave }: EstadisticaConfigFormProps) {
  const [config, setConfig] = useState(node.data.configuracion || {
    tipo_estadistica: 'resumen',
    metricas: ['total_ejecutados', 'exitosos', 'fallidos'],
    formato_reporte: 'tabla'
  })

  const handleSave = () => {
    onSave(config)
  }

  const toggleMetrica = (metrica: string) => {
    const nuevasMetricas = config.metricas.includes(metrica)
      ? config.metricas.filter(m => m !== metrica)
      : [...config.metricas, metrica]
    
    setConfig({ ...config, metricas: nuevasMetricas })
  }

  const metricasDisponibles = [
    { id: 'total_ejecutados', nombre: 'Total Ejecutados', descripcion: 'Número total de ejecuciones' },
    { id: 'exitosos', nombre: 'Exitosos', descripcion: 'Ejecuciones completadas exitosamente' },
    { id: 'fallidos', nombre: 'Fallidos', descripcion: 'Ejecuciones que fallaron' },
    { id: 'tiempo_promedio', nombre: 'Tiempo Promedio', descripcion: 'Tiempo promedio de ejecución' },
    { id: 'tasa_exito', nombre: 'Tasa de Éxito', descripcion: 'Porcentaje de ejecuciones exitosas' },
    { id: 'deudores_contactados', nombre: 'Deudores Contactados', descripcion: 'Número de deudores contactados' },
    { id: 'pagos_recibidos', nombre: 'Pagos Recibidos', descripcion: 'Número de pagos recibidos' }
  ]

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Estadística
        </label>
        <select 
          value={config.tipo_estadistica}
          onChange={(e) => setConfig({...config, tipo_estadistica: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="resumen">Resumen General</option>
          <option value="detallado">Detallado por Nodo</option>
          <option value="personalizado">Personalizado</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Métricas a Incluir
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {metricasDisponibles.map((metrica) => (
            <label key={metrica.id} className="flex items-start space-x-2">
              <input 
                type="checkbox"
                checked={config.metricas.includes(metrica.id)}
                onChange={() => toggleMetrica(metrica.id)}
                className="mt-1"
              />
              <div>
                <div className="text-sm font-medium text-gray-700">
                  {metrica.nombre}
                </div>
                <div className="text-xs text-gray-500">
                  {metrica.descripcion}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Formato del Reporte
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input 
              type="radio"
              name="formato_reporte"
              value="tabla"
              checked={config.formato_reporte === 'tabla'}
              onChange={(e) => setConfig({...config, formato_reporte: e.target.value})}
              className="mr-2"
            />
            <span className="text-sm">Tabla</span>
          </label>
          <label className="flex items-center">
            <input 
              type="radio"
              name="formato_reporte"
              value="grafico"
              checked={config.formato_reporte === 'grafico'}
              onChange={(e) => setConfig({...config, formato_reporte: e.target.value})}
              className="mr-2"
            />
            <span className="text-sm">Gráfico</span>
          </label>
          <label className="flex items-center">
            <input 
              type="radio"
              name="formato_reporte"
              value="ambos"
              checked={config.formato_reporte === 'ambos'}
              onChange={(e) => setConfig({...config, formato_reporte: e.target.value})}
              className="mr-2"
            />
            <span className="text-sm">Tabla + Gráfico</span>
          </label>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
        <h4 className="text-sm font-medium text-indigo-800 mb-1">Información</h4>
        <p className="text-xs text-indigo-700">
          Este nodo mostrará estadísticas del workflow ejecutado. Las métricas se calcularán 
          en tiempo real durante la ejecución del flujo.
        </p>
      </div>

      <button 
        onClick={handleSave}
        className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition-colors"
      >
        Guardar Configuración
      </button>
    </div>
  )
}
