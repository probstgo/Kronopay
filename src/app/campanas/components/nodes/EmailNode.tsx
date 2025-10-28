import { Handle, Position } from 'reactflow'

interface EmailNodeData {
  tipo: 'email'
  plantilla: string
  configuracion: {
    plantilla_id: string
    asunto_personalizado: string
    variables_dinamicas: {
      nombre: boolean
      monto: boolean
      fecha_vencimiento: boolean
    }
  }
}

interface EmailNodeProps {
  data: EmailNodeData
}

export function EmailNode({ data }: EmailNodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-200">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">📧</span>
        </div>
        <div>
          <div className="font-bold text-sm">Email</div>
          <div className="text-xs text-gray-500">{data.plantilla}</div>
        </div>
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
