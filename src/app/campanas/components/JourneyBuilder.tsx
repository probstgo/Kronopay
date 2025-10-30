'use client'

import { useState, useCallback, createContext, useContext } from 'react'
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, addEdge, useNodesState, useEdgesState, Connection } from 'reactflow'
import 'reactflow/dist/style.css'

import { TopToolbar } from './TopToolbar'
import { NodeConfigPanel } from './NodeConfigPanel'
import { EmailNode } from './nodes/EmailNode'
import { LlamadaNode } from './nodes/LlamadaNode'
import { EsperaNode } from './nodes/EsperaNode'
import { SMSNode } from './nodes/SMSNode'
import { CondicionNode } from './nodes/CondicionNode'
import { EstadisticaNode } from './nodes/EstadisticaNode'
import { NoteNode } from './nodes/NoteNode'

// Componente para el nodo "+" inicial
function InitialPlusNode({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="w-16 h-16 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer">
      +
    </div>
  )
}

// Contexto para pasar funciones a los nodos
const NodeActionsContext = createContext<{
  onConfigure: (nodeId: string) => void
  onDelete: (nodeId: string) => void
} | null>(null)

// Hook para usar el contexto
const useNodeActions = () => {
  const context = useContext(NodeActionsContext)
  if (!context) {
    throw new Error('useNodeActions debe usarse dentro de NodeActionsProvider')
  }
  return context
}

// Componente wrapper para pasar funciones a los nodos
function NodeWrapper({ nodeType, ...props }: { nodeType: string; [key: string]: unknown }) {
  const { onConfigure, onDelete } = useNodeActions()
  
  const nodeComponents = {
    email: EmailNode,
    llamada: LlamadaNode,
    espera: EsperaNode,
    sms: SMSNode,
    condicion: CondicionNode,
    estadistica: EstadisticaNode,
    initialPlus: InitialPlusNode
  }
  
  const NodeComponent = nodeComponents[nodeType as keyof typeof nodeComponents]
  
  if (!NodeComponent) return null
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <NodeComponent {...(props as any)} onConfigure={onConfigure} onDelete={onDelete} />
}

// Tipos de nodos personalizados
const nodeTypes = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  email: (props: any) => <NodeWrapper {...props} nodeType="email" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  llamada: (props: any) => <NodeWrapper {...props} nodeType="llamada" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  espera: (props: any) => <NodeWrapper {...props} nodeType="espera" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sms: (props: any) => <NodeWrapper {...props} nodeType="sms" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  condicion: (props: any) => <NodeWrapper {...props} nodeType="condicion" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  estadistica: (props: any) => <NodeWrapper {...props} nodeType="estadistica" />,
  initialPlus: InitialPlusNode,
  note: NoteNode
}

// Nodos iniciales - EMPEZAR CON NODO "+" INICIAL
const initialNodes: Node[] = [
  {
    id: 'initial-plus',
    type: 'initialPlus',
    position: { x: 0, y: 0 }, // Centrado en el origen
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
  const [shouldFitView, setShouldFitView] = useState(true)

  // Generar ID único para nodos
  const generateNodeId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Manejar configuración de nodo
  const handleConfigureNode = useCallback((nodeId: string) => {
    console.log('⚙️ Configurando nodo:', nodeId)
    setSelectedNode(nodeId)
  }, [])

  // Manejar eliminación de nodo
  const handleDeleteNode = useCallback((nodeId: string) => {
    console.log('🗑️ Eliminando nodo:', nodeId)
    
    // Confirmar eliminación
    if (window.confirm('¿Estás seguro de que quieres eliminar este nodo?')) {
      setNodes(prev => {
        const newNodes = prev.filter(n => n.id !== nodeId)
        // Si no quedan nodos reales (solo el inicial), mostrar el nodo inicial
        const realNodes = newNodes.filter(n => n.type !== 'initialPlus')
        if (realNodes.length === 0) {
          return [initialNodes[0]] // Volver a mostrar el nodo inicial
        }
        return newNodes
      })
      
      // Eliminar conexiones relacionadas
      setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId))
      
      // Cerrar panel si estaba abierto
      if (selectedNode === nodeId) {
        setSelectedNode(null)
      }
    }
  }, [setNodes, setEdges, selectedNode])

  // Crear nodo con configuración por defecto
  const createNode = (type: string, position: { x: number, y: number }) => {
    const id = generateNodeId()
    const nodeType = availableNodeTypes.find(nt => nt.id === type)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    console.log('🖱️ Clic en nodo inicial "+"')
    
    // Obtener la posición real del nodo en el viewport
    const canvasRect = event.currentTarget.getBoundingClientRect()
    const nodeElement = document.querySelector('[data-id="initial-plus"]')
    
    if (nodeElement) {
      const nodeRect = nodeElement.getBoundingClientRect()
      
      // Calcular posición del menú al lado del nodo
      const menuPosition = {
        x: nodeRect.right + 20, // 20px a la derecha del nodo
        y: nodeRect.top + nodeRect.height / 2 - 100 // Centrado verticalmente
      }
      
      console.log('🎯 Posición del menú para nodo inicial:', menuPosition)
      setMenuPosition(menuPosition)
    } else {
      // Fallback si no encontramos el elemento
      setMenuPosition({
        x: window.innerWidth / 2 + 100,
        y: window.innerHeight / 2 - 100
      })
    }
    
    setSourceNodeId(null)
    setShowNodeMenu(true)
  }, [nodes])

  // Manejar clic en handle "+"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onConnectStart = useCallback((event: any, params: any) => {
    console.log('🔍 DEBUG onConnectStart:', { nodeId: params.nodeId, handleId: params.handleId, event })
    
    if (params.handleId === 'plus') {
      console.log('✅ Handle plus detectado, abriendo menú...')
      event.stopPropagation()
      const node = nodes.find(n => n.id === params.nodeId)
      if (node) {
        console.log('📍 Nodo encontrado:', node)
        
        // Calcular posición inteligente del menú
        const canvasRect = event.currentTarget.getBoundingClientRect()
        
        // Obtener las dimensiones reales del nodo desde React Flow
        const nodeElement = document.querySelector(`[data-id="${params.nodeId}"]`)
        let nodeRect = {
          x: node.position.x,
          y: node.position.y,
          width: 150, // Ancho aproximado del nodo
          height: 60   // Alto aproximado del nodo
        }
        
        // Si encontramos el elemento real del nodo, usar sus dimensiones reales
        if (nodeElement) {
          const realRect = nodeElement.getBoundingClientRect()
          nodeRect = {
            x: realRect.left - canvasRect.left,
            y: realRect.top - canvasRect.top,
            width: realRect.width,
            height: realRect.height
          }
        }
        
        // Calcular posición del handle "+" (está en el lado derecho del nodo)
        const handleX = nodeRect.x + nodeRect.width + 8 // 8px es el offset del handle
        const handleY = nodeRect.y + nodeRect.height / 2 // Centrado verticalmente
        
        // Posición del menú relativa al viewport
        const menuPosition = {
          x: Math.min(
            canvasRect.left + handleX + 20, // 20px de separación del handle
            window.innerWidth - 300 // No salir del viewport
          ),
          y: Math.min(
            canvasRect.top + handleY - 100, // Centrar el menú verticalmente
            window.innerHeight - 200 // No salir del viewport
          )
        }
        
        console.log('🎯 Posición del menú calculada:', menuPosition)
        setMenuPosition(menuPosition)
        setSourceNodeId(params.nodeId)
        setShowNodeMenu(true)
        console.log('🎯 Menú configurado para abrir')
      } else {
        console.log('❌ Nodo no encontrado:', params.nodeId)
      }
    } else {
      console.log('ℹ️ Handle diferente:', params.handleId)
    }
  }, [nodes])

  // Manejar selección de nodo del menú
  const handleNodeSelection = useCallback((nodeType: string) => {
    console.log('🎯 DEBUG handleNodeSelection:', { nodeType, sourceNodeId, nodesCount: nodes.length })
    
    const node = sourceNodeId ? nodes.find(n => n.id === sourceNodeId) : null
    const position = node 
      ? { 
          x: Math.max(100, node.position.x + 250), // Separación optimizada
          y: node.position.y // Misma altura que el nodo anterior
        }
      : { x: 0, y: 0 }

    console.log('📍 Posición calculada:', position)

    const newNode = createNode(nodeType, position)
    console.log('🆕 Nuevo nodo creado:', newNode)
    
    // Si no hay nodos reales (solo el inicial "+"), eliminar el nodo "+" inicial
    const realNodes = nodes.filter(n => n.id !== 'initial-plus')
    console.log('📊 Nodos reales actuales:', realNodes.length)
    
    if (realNodes.length === 0) {
      console.log('🔄 Reemplazando nodo inicial con nuevo nodo')
      setNodes([newNode])
      setShouldFitView(false) // Desactivar fitView después del primer nodo
    } else {
      console.log('➕ Agregando nuevo nodo a la lista existente')
      setNodes(prev => [...prev, newNode])
    }

    // Si hay un nodo fuente, crear conexión
    if (sourceNodeId) {
      console.log('🔗 Creando conexión desde:', sourceNodeId, 'hacia:', newNode.id)
      const newEdge = {
        id: `edge_${sourceNodeId}_${newNode.id}`,
        source: sourceNodeId,
        target: newNode.id,
        type: 'smoothstep',
        animated: true
      }
      console.log('🔗 Nueva conexión:', newEdge)
      setEdges(prev => [...prev, newEdge])
    }

    console.log('✅ Proceso completado, cerrando menú')
    setShowNodeMenu(false)
    setSourceNodeId(null)
  }, [nodes, setNodes, setEdges, sourceNodeId])

  // Manejar agregar nodo desde el toolbar (sin conexión)
  const handleAddNodeFromToolbar = useCallback((nodeType: string) => {
    console.log('🎯 Agregando nodo desde toolbar:', nodeType)
    
    // Calcular posición central del canvas o al lado de los nodos existentes
    const realNodes = nodes.filter(n => n.id !== 'initial-plus')
    let position: { x: number, y: number }
    
    if (realNodes.length === 0) {
      // Si no hay nodos, poner en el centro
      position = { x: 0, y: 0 }
    } else {
      // Encontrar el nodo más a la derecha
      const rightmostNode = realNodes.reduce((prev, current) => 
        current.position.x > prev.position.x ? current : prev
      )
      position = {
        x: rightmostNode.position.x + 250,
        y: rightmostNode.position.y
      }
    }

    const newNode = createNode(nodeType, position)
    console.log('🆕 Nuevo nodo creado desde toolbar:', newNode)
    
    // Si no hay nodos reales (solo el inicial "+"), eliminar el nodo "+" inicial
    if (realNodes.length === 0) {
      setNodes([newNode])
      setShouldFitView(false)
    } else {
      setNodes(prev => [...prev, newNode])
    }
  }, [nodes, setNodes])

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
    }
    // No abrir automáticamente el panel de configuración al hacer clic en el nodo
    // Solo se abre cuando se hace clic específicamente en el botón "Configurar"
  }, [])

  // Función para guardar configuración de nodo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    console.log('🖱️ Clic en canvas, cerrando menú')
    setShowNodeMenu(false)
    setSourceNodeId(null)
  }, [])

  return (
    <NodeActionsContext.Provider value={{ onConfigure: handleConfigureNode, onDelete: handleDeleteNode }}>
      <div className="h-screen flex flex-col">
        {/* Barra Superior */}
        <TopToolbar 
          onAddNode={handleAddNodeFromToolbar}
          onAddNote={() => {
            // Nodos "reales" del flujo (excluye initial-plus y notas)
            const realFlowNodes = nodes.filter(n => n.type !== 'initialPlus' && n.type !== 'note')
            const OFFSET_Y = 120 // espacio para no tapar el nodo
            const position = (() => {
              if (realFlowNodes.length === 0) {
                // Colocar sobre el nodo inicial "+" morado
                const initial = nodes.find(n => n.id === 'initial-plus')
                if (initial) {
                  return { x: initial.position.x, y: initial.position.y - OFFSET_Y }
                }
                // Fallback razonable si no se encuentra
                return { x: 0, y: -OFFSET_Y }
              }
              // Colocar sobre el nodo más a la derecha
              const rightmost = realFlowNodes.reduce((prev, curr) => (curr.position.x > prev.position.x ? curr : prev))
              return { x: rightmost.position.x, y: rightmost.position.y - OFFSET_Y }
            })()

            const id = `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
            const newNote: Node = {
              id,
              type: 'note',
              position,
              data: { text: '' },
              draggable: true,
              selectable: true
            }

            // Mantener siempre el nodo "+" inicial; solo agregamos la nota
            setNodes(prev => [...prev, newNote])
          }}
          availableNodeTypes={availableNodeTypes}
        />
        
        {/* Canvas Principal */}
        <div className="flex-1 flex">
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes.map(n =>
                n.type === 'note'
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        onChange: (text: string) =>
                          setNodes(curr => curr.map(cn => (cn.id === n.id ? { ...cn, data: { ...cn.data, text } } : cn))),
                        onDelete: () => setNodes(curr => curr.filter(cn => cn.id !== n.id))
                      }
                    }
                  : n
              )}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView={shouldFitView}
              fitViewOptions={{ 
                padding: 0.2, 
                includeHiddenNodes: false,
                minZoom: 0.5,
                maxZoom: 1.2
              }}
              minZoom={0.1}
              maxZoom={2}
              className="bg-gray-50"
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>


            {/* Menú de selección de nodos */}
            {showNodeMenu && (
              <div
                className="fixed bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-[9999] min-w-64"
                style={{
                  left: menuPosition.x,
                  top: menuPosition.y,
                  maxHeight: '400px',
                  overflowY: 'auto',
                  pointerEvents: 'auto',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                }}
                onClick={(e) => e.stopPropagation()}
                onLoad={() => console.log('📋 Menú cargado y visible')}
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
                      onClick={() => {
                        console.log('🖱️ Clic en botón de nodo:', nodeType.id)
                        handleNodeSelection(nodeType.id)
                      }}
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
    </NodeActionsContext.Provider>
  )
}
