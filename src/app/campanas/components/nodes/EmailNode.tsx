import { Handle, Position } from 'reactflow'

interface EmailNodeData {
  tipo: 'email'
  plantilla: string
  configuracion: {
    plantilla_id: string
    asunto_personalizado: string
    tipo_evento?: 'deuda_creada' | 'dias_antes_vencimiento' | 'dia_vencimiento' | 'dias_despues_vencimiento' | 'pago_registrado'
    dias_relativos?: number | null
    variables_dinamicas: {
      nombre: boolean
      monto: boolean
      fecha_vencimiento: boolean
    }
  }
}

interface EmailNodeProps {
  data: EmailNodeData
  id: string
  onConfigure?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
}

export function EmailNode({ data, id, onConfigure, onDelete }: EmailNodeProps) {
  const tieneTrigger = !!data.configuracion?.tipo_evento
  
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-200 hover:border-blue-300 transition-colors relative">
      <Handle type="target" position={Position.Left} />
      
      {/* Badge de trigger automático */}
      {tieneTrigger && (
        <div 
          className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full shadow-md font-semibold flex items-center space-x-1"
          title="Trigger automático configurado"
        >
          <span>⚡</span>
          <span>Auto</span>
        </div>
      )}
      
      {/* Contenido principal del nodo */}
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">📧</span>
        </div>
        <div>
          <div className="font-bold text-sm">Email</div>
          <div className="text-xs text-gray-500">{data.plantilla}</div>
        </div>
      </div>
      
      {/* Barra de acciones */}
      <div className="border-t border-gray-200 pt-2 flex justify-center space-x-3">
        <button
          onClick={() => onConfigure?.(id)}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
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
