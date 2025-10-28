'use client'

import { useState, useCallback } from 'react'
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, addEdge, useNodesState, useEdgesState, Connection, EdgeChange, NodeChange, Handle, Position } from 'reactflow'
import 'reactflow/dist/style.css'

import { TopToolbar } from './TopToolbar'
import { NodeConfigPanel } from './NodeConfigPanel'
import { EmailNode } from './nodes/EmailNode'
import { LlamadaNode } from './nodes/LlamadaNode'
import { EsperaNode } from './nodes/EsperaNode'
import { SMSNode } from './nodes/SMSNode'
import { CondicionNode } from './nodes/CondicionNode'
import { EstadisticaNode } from './nodes/EstadisticaNode'

// Componente para el nodo "+" inicial
function InitialPlusNode({ data }: { data: any }) {
  return (
    <div className="w-16 h-16 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer">
      +
    </div>
  )
}

// Tipos de nodos personalizados
const nodeTypes = {
  email: EmailNode,
  llamada: LlamadaNode,
  espera: EsperaNode,
  sms: SMSNode,
  condicion: CondicionNode,
  estadistica: EstadisticaNode,
  initialPlus: InitialPlusNode
}

// Nodos iniciales - EMPEZAR CON NODO "+" INICIAL
const initialNodes: Node[] = [
  {
    id: 'initial-plus',
    type: 'initialPlus',
    position: { x: 200, y: 200 },
    data: { tipo: 'initialPlus' },
    draggable: false,
    selectable: false
  }
]

// Conexiones iniciales - EMPEZAR LIMPIO
const initialEdges: Edge[] = []

// Tipos de nodos disponibles para el menú
const availableNodeTypes = [
  {
    id: 'email',
    name: 'Email',
    description: 'Enviar email de cobranza',
    icon: '📧',
    color: 'blue'
  },
  {
    id: 'llamada',
    name: 'Llamada',
    description: 'Realizar llamada telefónica',
    icon: '📞',
    color: 'green'
  },
  {
    id: 'sms',
    name: 'SMS',
    description: 'Enviar mensaje de texto',
    icon: '📱',
    color: 'purple'
  },
  {
    id: 'espera',
    name: 'Espera',
    description: 'Esperar tiempo determinado',
    icon: '⏰',
    color: 'yellow'
  },
  {
    id: 'condicion',
    name: 'Condición',
    description: 'Evaluar condición lógica',
    icon: '🔀',
    color: 'orange'
  },
  {
    id: 'estadistica',
    name: 'Estadística',
    description: 'Mostrar estadísticas',
    icon: '📊',
    color: 'indigo'
  }
]

export function JourneyBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [sourceNodeId, setSourceNodeId] = useState<string | null>(null)

  // Generar ID único para nodos
  const generateNodeId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Crear nodo con configuración por defecto
  const createNode = (type: string, position: { x: number, y: number }) => {
    const id = generateNodeId()
    const nodeType = availableNodeTypes.find(nt => nt.id === type)
    
    let defaultData: any = {
      tipo: type,
      configuracion: {}
    }

    // Configuración por defecto según el tipo
    switch (type) {
      case 'email':
        defaultData = {
          ...defaultData,
          plantilla: 'Nueva Plantilla',
          configuracion: {
            plantilla_id: '',
            asunto_personalizado: '',
            variables_dinamicas: { nombre: true, monto: true, fecha_vencimiento: true },
            configuracion_avanzada: { solo_dias_laborables: true, horario_trabajo: { inicio: '09:00', fin: '18:00' }, reintentos: 3 }
          }
        }
        break
      case 'llamada':
        defaultData = {
          ...defaultData,
          agente: 'Nuevo Agente',
          configuracion: {
            agente_id: '',
            script_personalizado: '',
            variables_dinamicas: { nombre: true, monto: true, fecha_vencimiento: true },
            configuracion_avanzada: { horario_llamadas: { inicio: '09:00', fin: '18:00' }, reintentos: 3, grabar_conversacion: true }
          }
        }
        break
      case 'sms':
        defaultData = {
          ...defaultData,
          texto: 'Nuevo SMS',
          configuracion: {
            texto: '',
            variables_dinamicas: { nombre: true, monto: true },
            configuracion_avanzada: { horario_envio: { inicio: '09:00', fin: '18:00' }, reintentos: 3 }
          }
        }
        break
      case 'espera':
        defaultData = {
          ...defaultData,
          duracion: '1 día',
          configuracion: {
            duracion: { tipo: 'dias', cantidad: 1 },
            configuracion_avanzada: { solo_dias_laborables: true, excluir_fines_semana: true, zona_horaria: 'America/Mexico_City' }
          }
        }
        break
      case 'condicion':
        defaultData = {
          ...defaultData,
          condicion: 'Nueva Condición',
          configuracion: {
            condiciones: [{ campo: 'respuesta_email', operador: 'igual', valor: '' }]
          }
        }
        break
      case 'estadistica':
        defaultData = {
          ...defaultData,
          titulo: 'Nueva Estadística',
          configuracion: {
            tipo_estadistica: 'resumen',
            metricas: ['total_ejecutados', 'exitosos', 'fallidos'],
            formato_reporte: 'tabla'
          }
        }
        break
    }

    return {
      id,
      type,
      position,
      data: defaultData
    }
  }

  // Manejar clic en círculo "+" inicial
  const handleInitialPlusClick = useCallback((event: React.MouseEvent) => {
    const initialPlusNode = nodes.find(n => n.id === 'initial-plus')
    if (initialPlusNode) {
      setMenuPosition({
        x: initialPlusNode.position.x + 100,
        y: initialPlusNode.position.y
      })
    }
    setSourceNodeId(null)
    setShowNodeMenu(true)
  }, [nodes])

  // Manejar clic en handle "+"
  const onConnectStart = useCallback((event: React.MouseEvent, { nodeId, handleId }: any) => {
    if (handleId === 'plus') {
      event.stopPropagation()
      const node = nodes.find(n => n.id === nodeId)
      if (node) {
        setMenuPosition({
          x: node.position.x + 200,
          y: node.position.y
        })
        setSourceNodeId(nodeId)
        setShowNodeMenu(true)
      }
    }
  }, [nodes])

  // Manejar selección de nodo del menú
  const handleNodeSelection = useCallback((nodeType: string) => {
    const node = sourceNodeId ? nodes.find(n => n.id === sourceNodeId) : null
    const position = node 
      ? { x: node.position.x + 300, y: node.position.y }
      : { x: 200, y: 200 }

    const newNode = createNode(nodeType, position)
    
    // Si no hay nodos reales (solo el inicial "+"), eliminar el nodo "+" inicial
    const realNodes = nodes.filter(n => n.id !== 'initial-plus')
    if (realNodes.length === 0) {
      setNodes([newNode])
    } else {
      setNodes(prev => [...prev, newNode])
    }

    // Si hay un nodo fuente, crear conexión
    if (sourceNodeId) {
      const newEdge = {
        id: `edge_${sourceNodeId}_${newNode.id}`,
        source: sourceNodeId,
        target: newNode.id,
        type: 'smoothstep',
        animated: true
      }
      setEdges(prev => [...prev, newEdge])
    }

    setShowNodeMenu(false)
    setSourceNodeId(null)
  }, [nodes, setNodes, setEdges, sourceNodeId])

  // Manejar conexiones manuales
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds))
    },
    [setEdges]
  )

  // Manejar clic en nodo
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.id === 'initial-plus') {
      handleInitialPlusClick(event)
    } else {
    setSelectedNode(node.id)
    }
  }, [])

  // Función para guardar configuración de nodo
  const handleSaveNodeConfig = useCallback((nodeId: string, config: any) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                configuracion: config
              }
            }
          : n
      )
    )
  }, [setNodes])

  // Obtener el nodo seleccionado
  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null

  // Manejar clic en el canvas para cerrar menú
  const onPaneClick = useCallback(() => {
    setShowNodeMenu(false)
    setSourceNodeId(null)
  }, [])

  return (
    <div className="h-screen flex flex-col">
      {/* Barra Superior */}
      <TopToolbar />
      
      {/* Canvas Principal */}
      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50"
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>


          {/* Menú de selección de nodos */}
          {showNodeMenu && (
            <div
              className="absolute bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 min-w-64"
              style={{
                left: menuPosition.x,
                top: menuPosition.y,
                maxHeight: '400px',
                overflowY: 'auto'
              }}
            >
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-800">Seleccionar Nodo</h3>
                <p className="text-sm text-gray-600">
                  {sourceNodeId ? 'Agregar siguiente paso' : 'Iniciar flujo'}
                </p>
              </div>
              
              <div className="space-y-2">
                {availableNodeTypes.map((nodeType) => (
                  <button
                    key={nodeType.id}
                    onClick={() => handleNodeSelection(nodeType.id)}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${
                      nodeType.color === 'blue' ? 'bg-blue-500' :
                      nodeType.color === 'green' ? 'bg-green-500' :
                      nodeType.color === 'purple' ? 'bg-purple-500' :
                      nodeType.color === 'yellow' ? 'bg-yellow-500' :
                      nodeType.color === 'orange' ? 'bg-orange-500' :
                      'bg-indigo-500'
                    }`}>
                      {nodeType.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{nodeType.name}</div>
                      <div className="text-sm text-gray-600">{nodeType.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Panel Lateral */}
        {selectedNodeData && (
          <NodeConfigPanel 
            node={selectedNodeData}
            onClose={() => setSelectedNode(null)}
            onSaveConfig={handleSaveNodeConfig}
          />
        )}
      </div>
    </div>
  )
}
