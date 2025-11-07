'use client'

import { Handle, Position } from 'reactflow'

interface FiltroNodeData {
  tipo: 'filtro'
  nombre: string
  configuracion: {
    filtros: {
      estado_deuda?: string[]
      rango_monto?: { min: number | null, max: number | null }
      dias_vencidos?: { min: number | null, max: number | null }
      tipo_contacto?: string[]
      historial_acciones?: string[]
    }
    ordenamiento?: {
      campo: 'monto' | 'fecha' | 'dias_vencidos'
      direccion: 'asc' | 'desc'
    }
    limite_resultados?: number | null
  }
}

interface FiltroNodeProps {
  data: FiltroNodeData
  id: string
  onConfigure?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
}

export function FiltroNode({ data, id, onConfigure, onDelete }: FiltroNodeProps) {
  // Contar cuántos filtros están activos
  const filtrosActivos = () => {
    let count = 0
    if (data.configuracion.filtros.estado_deuda && data.configuracion.filtros.estado_deuda.length > 0) count++
    if (data.configuracion.filtros.rango_monto && (data.configuracion.filtros.rango_monto.min !== null || data.configuracion.filtros.rango_monto.max !== null)) count++
    if (data.configuracion.filtros.dias_vencidos && (data.configuracion.filtros.dias_vencidos.min !== null || data.configuracion.filtros.dias_vencidos.max !== null)) count++
    if (data.configuracion.filtros.tipo_contacto && data.configuracion.filtros.tipo_contacto.length > 0) count++
    if (data.configuracion.filtros.historial_acciones && data.configuracion.filtros.historial_acciones.length > 0) count++
    return count
  }

  const filtrosCount = filtrosActivos()

  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-indigo-200 hover:border-indigo-300 transition-colors">
      <Handle type="target" position={Position.Left} />
      
      {/* Contenido principal del nodo */}
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">🔍</span>
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm">Filtro</div>
          <div className="text-xs text-gray-500">
            {filtrosCount > 0 ? `${filtrosCount} filtro${filtrosCount > 1 ? 's' : ''} activo${filtrosCount > 1 ? 's' : ''}` : 'Sin filtros'}
          </div>
        </div>
      </div>
      
      {/* Barra de acciones */}
      <div className="border-t border-gray-200 pt-2 flex justify-center space-x-3">
        <button
          onClick={() => onConfigure?.(id)}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
          title="Configurar"
        >
          <span>⚙️</span>
          <span>Configurar</span>
        </button>
        <button
          onClick={() => onDelete?.(id)}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Eliminar"
        >
          <span>🗑️</span>
          <span>Eliminar</span>
        </button>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right}
        id="plus"
        className="!w-8 !h-8 !bg-gray-400 hover:!bg-gray-500 !rounded-full !border-0 !cursor-pointer !flex !items-center !justify-center !text-white !text-lg !font-bold !shadow-md hover:!shadow-lg !transition-all !duration-200 hover:!scale-110"
        style={{
          right: -16,
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      >
        +
      </Handle>
    </div>
  )
}

