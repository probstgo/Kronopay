'use client'

import { Handle, Position } from 'reactflow'

interface CondicionNodeData {
  tipo: 'condicion'
  condicion: string
  configuracion: {
    condiciones: Array<{
      campo: 'respuesta_email' | 'contesto_llamada' | 'monto_deuda' | 'dias_vencido'
      operador: 'igual' | 'mayor' | 'menor' | 'contiene'
      valor: string | number
    }>
  }
}

interface CondicionNodeProps {
  data: CondicionNodeData
}

export function CondicionNode({ data }: CondicionNodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-orange-200">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">🔀</span>
        </div>
        <div>
          <div className="font-bold text-sm">Condición</div>
          <div className="text-xs text-gray-500">{data.condicion}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="si" />
      <Handle type="source" position={Position.Right} id="no" />
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
