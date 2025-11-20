'use client'

import { useState, useCallback, createContext, useContext, useEffect, useRef } from 'react'
import { ReactFlow, Background, Controls, MiniMap, Node, Edge, addEdge, useNodesState, useEdgesState, Connection } from 'reactflow'
import { toast } from 'sonner'
import { useRouter, usePathname } from 'next/navigation'
import { CheckCircle, XCircle, Mail, Phone, MessageSquare, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import 'reactflow/dist/style.css'

import { TopToolbar } from './TopToolbar'
import { NodeConfigPanel } from './NodeConfigPanel'
import { EmailNode } from './nodes/EmailNode'
import { LlamadaNode } from './nodes/LlamadaNode'
import { SMSNode } from './nodes/SMSNode'
import { WhatsAppNode } from './nodes/WhatsAppNode'
import { CondicionNode } from './nodes/CondicionNode'
import { FiltroNode } from './nodes/FiltroNode'
import { NoteNode } from './nodes/NoteNode'
import { type NodoConTrigger } from '@/lib/workflowTriggers'

// Componente para el nodo "+" inicial
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    sms: SMSNode,
    whatsapp: WhatsAppNode,
    condicion: CondicionNode,
    filtro: FiltroNode,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sms: (props: any) => <NodeWrapper {...props} nodeType="sms" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  whatsapp: (props: any) => <NodeWrapper {...props} nodeType="whatsapp" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  condicion: (props: any) => <NodeWrapper {...props} nodeType="condicion" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filtro: (props: any) => <NodeWrapper {...props} nodeType="filtro" />,
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
    id: 'filtro',
    name: 'Filtro',
    description: 'Filtrar y segmentar deudores',
    icon: '🔍',
    color: 'indigo'
  },
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
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Enviar mensaje de WhatsApp',
    icon: '💬',
    color: 'green'
  },
  {
    id: 'condicion',
    name: 'Condición',
    description: 'Evaluar condición lógica',
    icon: '🔀',
    color: 'orange'
  }
]

interface JourneyBuilderProps {
  params?: Promise<{ id: string }>
}

export function JourneyBuilder({ params }: JourneyBuilderProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [campaignName, setCampaignName] = useState('')
  const [campaignDescription, setCampaignDescription] = useState('')
  const [pendingRedirectId, setPendingRedirectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  
  // Snapshot del último estado guardado para detectar cambios
  type SavedSnapshot = {
    nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }>
    edges: Array<{ id: string; source: string; target: string; type?: string; animated?: boolean }>
    notes: Array<{ id: string; text: string; position: { x: number; y: number } }>
    nombre: string
    descripcion: string
  }
  const savedSnapshotRef = useRef<SavedSnapshot | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [sourceNodeId, setSourceNodeId] = useState<string | null>(null)
  const [shouldFitView, setShouldFitView] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [testResults, setTestResults] = useState<{
    exitosas: number
    fallidas: number
    detalles: Array<{
      programacion_id: string
      tipo_accion: string
      destinatario: string
      exito: boolean
      external_id?: string
      error?: string
    }>
  } | null>(null)
  const [nodeConfigHasChanges, setNodeConfigHasChanges] = useState(false)
  const [pendingNodeConfigClose, setPendingNodeConfigClose] = useState(false)

  // Función para crear snapshot del estado actual
  const createSnapshot = useCallback((): SavedSnapshot => {
    const realNodes = nodes.filter(n => n.id !== 'initial-plus' && n.type !== 'note' && n.type)
    const noteNodes = nodes.filter(n => n.type === 'note')
    
    return {
      nodes: realNodes.map(node => ({
        id: node.id,
        type: node.type || 'unknown',
        position: node.position,
        data: node.data
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type || 'smoothstep',
        animated: edge.animated || false
      })),
      notes: noteNodes.map(note => ({
        id: note.id,
        text: note.data?.text || '',
        position: note.position
      })),
      nombre: campaignName,
      descripcion: campaignDescription
    }
  }, [nodes, edges, campaignName, campaignDescription])

  // Función para comparar estado actual con snapshot
  const compareWithSnapshot = useCallback((snapshot: SavedSnapshot | null): boolean => {
    if (!snapshot) {
      // Si no hay snapshot, hay cambios si hay algo configurado
      const realNodes = nodes.filter(n => n.id !== 'initial-plus' && n.type !== 'note')
      return realNodes.length > 0 || edges.length > 0 || nodes.some(n => n.type === 'note') || campaignName.trim() !== '' || campaignDescription.trim() !== ''
    }

    const current = createSnapshot()
    
    // Comparar nodos
    if (current.nodes.length !== snapshot.nodes.length) return true
    for (let i = 0; i < current.nodes.length; i++) {
      const curr = current.nodes[i]
      const saved = snapshot.nodes.find(n => n.id === curr.id)
      if (!saved || 
          curr.type !== saved.type ||
          curr.position.x !== saved.position.x ||
          curr.position.y !== saved.position.y ||
          JSON.stringify(curr.data) !== JSON.stringify(saved.data)) {
        return true
      }
    }

    // Comparar edges
    if (current.edges.length !== snapshot.edges.length) return true
    for (let i = 0; i < current.edges.length; i++) {
      const curr = current.edges[i]
      const saved = snapshot.edges.find(e => e.id === curr.id)
      if (!saved ||
          curr.source !== saved.source ||
          curr.target !== saved.target) {
        return true
      }
    }

    // Comparar notas
    if (current.notes.length !== snapshot.notes.length) return true
    for (let i = 0; i < current.notes.length; i++) {
      const curr = current.notes[i]
      const saved = snapshot.notes.find(n => n.id === curr.id)
      if (!saved ||
          curr.text !== saved.text ||
          curr.position.x !== saved.position.x ||
          curr.position.y !== saved.position.y) {
        return true
      }
    }

    // Comparar nombre y descripción
    if (current.nombre !== snapshot.nombre || current.descripcion !== snapshot.descripcion) {
      return true
    }

    return false
  }, [nodes, edges, campaignName, campaignDescription, createSnapshot])

  // Detectar cambios sin guardar
  useEffect(() => {
    const hasChanges = compareWithSnapshot(savedSnapshotRef.current)
    setHasUnsavedChanges(hasChanges)
  }, [nodes, edges, campaignName, campaignDescription, compareWithSnapshot])

  // Protección beforeunload para navegación del navegador
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = '' // Chrome requiere returnValue
        return '' // Algunos navegadores requieren return
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Interceptar clics en Links del Sidebar y otras navegaciones
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      // Solo interceptar si hay cambios sin guardar
      if (!hasUnsavedChanges) return

      // Buscar el Link más cercano al elemento clickeado
      const target = e.target as HTMLElement
      const link = target.closest('a[href]') as HTMLAnchorElement | null
      
      if (!link) return

      const href = link.getAttribute('href')
      if (!href) return

      // Si el href es de la misma página o es una ruta de campaña, no interceptar
      if (href === pathname || href.startsWith('/campanas/')) return

      // Si es una ruta externa o diferente, interceptar
      e.preventDefault()
      e.stopPropagation()
      
      // Guardar la navegación pendiente y mostrar el diálogo
      setPendingNavigation(href)
    }

    // Agregar listener a todos los clics en el documento
    document.addEventListener('click', handleLinkClick, true) // true = capture phase

    return () => {
      document.removeEventListener('click', handleLinkClick, true)
    }
  }, [hasUnsavedChanges, pathname])

  // Cargar campaña si hay params (edición)
  useEffect(() => {
    if (params) {
      params.then(({ id }) => {
        setCampaignId(id)
        cargarCampana(id)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  // Función para cargar campaña desde la API
  const cargarCampana = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/campanas/${id}/canvas`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar la campaña')
      }

      const { canvas_data, nombre, descripcion } = result.data

      // Restaurar nombre y descripción
      if (nombre) {
        setCampaignName(nombre)
      }
      if (descripcion) {
        setCampaignDescription(descripcion)
      }

      // Cargar triggers de la campaña (Fase 5)
      let triggersMap: Record<string, { tipo_evento: string; dias_relativos: number | null }> = {}
      try {
        const responseTriggers = await fetch(`/api/campanas/${id}/triggers`)
        if (responseTriggers.ok) {
          const dataTriggers = await responseTriggers.json()
          triggersMap = dataTriggers.triggers || {}
          console.log('📋 Triggers cargados:', Object.keys(triggersMap).length)
        }
      } catch (error) {
        console.error('Error cargando triggers:', error)
      }

      // Restaurar nodos (agregar nodo inicial "+" si no hay nodos)
      if (canvas_data.nodes && canvas_data.nodes.length > 0) {
        const restoredNodes: Node[] = canvas_data.nodes.map((node: { id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }) => {
          // Si el nodo tiene trigger configurado, agregarlo a la configuración
          const trigger = triggersMap[node.id]
          
          if (trigger && ['email', 'sms', 'whatsapp', 'llamada'].includes(node.type)) {
            return {
              id: node.id,
              type: node.type,
              position: node.position,
              data: {
                ...node.data,
                configuracion: {
                  ...(node.data?.configuracion as Record<string, unknown> || {}),
                  tipo_evento: trigger.tipo_evento,
                  dias_relativos: trigger.dias_relativos
                }
              }
            }
          }
          
          return {
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data
          }
        })
        setNodes(restoredNodes)
      } else {
        // Si no hay nodos, mostrar nodo inicial "+"
        setNodes(initialNodes)
      }

      // Restaurar conexiones
      if (canvas_data.edges && canvas_data.edges.length > 0) {
        const restoredEdges: Edge[] = canvas_data.edges.map((edge: { id: string; source: string; target: string; type?: string; animated?: boolean }) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type || 'smoothstep',
          animated: edge.animated || false
        }))
        setEdges(restoredEdges)
      } else {
        setEdges([])
      }

      // Restaurar notas
      if (canvas_data.notes && canvas_data.notes.length > 0) {
        const restoredNotes: Node[] = canvas_data.notes.map((note: { id: string; text: string; position: { x: number; y: number } }) => ({
          id: note.id,
          type: 'note',
          position: note.position,
          data: { text: note.text },
          draggable: true,
          selectable: true
        }))
        // Agregar notas a los nodos existentes
        setNodes(prev => {
          const existingNoteIds = new Set(prev.filter(n => n.type === 'note').map(n => n.id))
          const newNotes = restoredNotes.filter(note => !existingNoteIds.has(note.id))
          return [...prev, ...newNotes]
        })
      }

      setShouldFitView(true)
      toast.success('Campaña cargada exitosamente')
      
      // Guardar snapshot después de cargar (usar setTimeout para asegurar que todos los estados estén actualizados)
      setTimeout(() => {
        savedSnapshotRef.current = createSnapshot()
        setHasUnsavedChanges(false)
      }, 100)
    } catch (error) {
      console.error('Error cargando campaña:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error(`Error al cargar la campaña: ${errorMessage}`)
      // Redirigir a lista si hay error
      router.push('/campanas')
    } finally {
      setLoading(false)
    }
  }

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
            tipo_evento: 'deuda_creada',
            dias_relativos: null,
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
            tipo_evento: 'deuda_creada',
            dias_relativos: null,
            configuracion_avanzada: { horario_llamadas: { inicio: '09:00', fin: '18:00' }, reintentos: 3, grabar_conversacion: true }
          }
        }
        break
      case 'sms':
        defaultData = {
          ...defaultData,
          plantilla: 'Nueva Plantilla SMS',
          configuracion: {
            plantilla_id: '',
            tipo_evento: 'deuda_creada',
            dias_relativos: null,
            configuracion_avanzada: { horario_envio: { inicio: '09:00', fin: '18:00' }, reintentos: 3 }
          }
        }
        break
      case 'whatsapp':
        defaultData = {
          ...defaultData,
          texto: 'Nueva Plantilla WhatsApp',
          configuracion: {
            plantilla_id: '',
            tipo_evento: 'deuda_creada',
            dias_relativos: null,
            configuracion_avanzada: { horario_envio: { inicio: '09:00', fin: '18:00' }, reintentos: 3 }
          }
        }
        break
      case 'condicion':
        defaultData = {
          ...defaultData,
          condicion: 'Nueva Condición',
          configuracion: {
            condiciones: [{ campo: 'estado_deuda', operador: 'igual', valor: '' }],
            logica: 'AND'
          }
        }
        break
      case 'filtro':
        defaultData = {
          ...defaultData,
          nombre: 'Filtro de Deudores',
          configuracion: {
            filtros: {
              estado_deuda: [],
              rango_monto: { min: null, max: null },
              dias_vencidos: { min: null, max: null },
              tipo_contacto: [],
              historial_acciones: []
            },
            ordenamiento: {
              campo: 'monto',
              direccion: 'desc'
            },
            limite_resultados: null
          }
        }
        break
      // eliminado: estadistica
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
  const handleSaveNodeConfig = useCallback(async (nodeId: string, config: any) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    // Si es un nodo SMS, Email o WhatsApp y tiene plantilla_id, buscar el nombre de la plantilla
    let nombrePlantilla: string | undefined = undefined
    if ((node.type === 'sms' || node.type === 'email' || node.type === 'whatsapp') && config.plantilla_id) {
      try {
        const tipo = node.type === 'email' ? 'email' : node.type === 'whatsapp' ? 'whatsapp' : 'sms'
        const response = await fetch(`/api/plantillas?tipo=${tipo}`)
        if (response.ok) {
          const plantillas = await response.json()
          const plantilla = plantillas.find((p: { id: string }) => p.id === config.plantilla_id)
          if (plantilla) {
            nombrePlantilla = plantilla.nombre
          }
        }
      } catch (error) {
        console.error('Error obteniendo nombre de plantilla:', error)
      }
    }

    // Si es un nodo Llamada y tiene agente_id, buscar el nombre del agente
    let nombreAgente: string | undefined = undefined
    if (node.type === 'llamada' && config.agente_id) {
      try {
        const response = await fetch('/api/telefono/agentes')
        if (response.ok) {
          const agentes = await response.json()
          const agente = agentes.find((a: { id: string }) => a.id === config.agente_id)
          if (agente) {
            nombreAgente = agente.nombre
          }
        }
      } catch (error) {
        console.error('Error obteniendo nombre de agente:', error)
      }
    }

    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                ...(nombrePlantilla && { plantilla: nombrePlantilla, texto: nombrePlantilla }),
                ...(nombreAgente && { agente: nombreAgente }),
                configuracion: config
              }
            }
          : n
      )
    )
    // Mostrar mensaje de éxito
    toast.success('Configuración del nodo guardada exitosamente')
    // Marcar que no hay cambios sin guardar
    setNodeConfigHasChanges(false)
  }, [setNodes, nodes])

  // Obtener el nodo seleccionado
  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null

  // Manejar clic en el canvas para cerrar menú y panel de configuración
  const onPaneClick = useCallback(() => {
    console.log('🖱️ Clic en canvas, cerrando menú')
    setShowNodeMenu(false)
    setSourceNodeId(null)
    
    // Si hay panel de configuración abierto, intentar cerrarlo
    if (selectedNode) {
      // Si hay cambios sin guardar, mostrar confirmación
      if (nodeConfigHasChanges) {
        setPendingNodeConfigClose(true)
      } else {
        // Si no hay cambios, cerrar directamente
        setSelectedNode(null)
      }
    }
  }, [selectedNode, nodeConfigHasChanges])

  // Función para guardar la campaña (Fase 3.1: integración con API)
  const handleSave = useCallback(async (metadata: { nombre: string; descripcion: string }) => {
    console.log('💾 Iniciando guardado de campaña...')
    
    // Mostrar loading
    const toastId = toast.loading('Guardando campaña...')
    
    try {
      // Filtrar nodos: excluir el nodo inicial "+" y separar notas
      const realNodes = nodes.filter(n => n.id !== 'initial-plus' && n.type !== 'note')
      const noteNodes = nodes.filter(n => n.type === 'note')
      
      // Preparar nodos para canvas_data (sin el nodo inicial)
      const canvasNodes = realNodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data
      }))
      
      // Preparar conexiones (edges)
      const canvasEdges = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type || 'smoothstep',
        animated: edge.animated || false
      }))
      
      // Preparar notas
      const canvasNotes = noteNodes.map(note => ({
        id: note.id,
        text: note.data?.text || '',
        position: note.position,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
      
      // Estructurar canvas_data según workflows_cobranza
      const canvasData = {
        nodes: canvasNodes,
        edges: canvasEdges,
        notes: canvasNotes
      }
      
      // Estructurar payload completo según la tabla workflows_cobranza
      const payload = {
        nombre: metadata.nombre || 'Campaña de Cobranza',
        descripcion: metadata.descripcion || '',
        canvas_data: canvasData,
        configuracion: {}, // Configuración global (por ahora vacía)
        estado: 'borrador' // Estado inicial
      }
      
      // Log del payload preparado (para verificación)
      console.log('📦 Payload preparado para guardar:', payload)
      console.log('📊 Resumen:', {
        totalNodos: canvasNodes.length,
        totalConexiones: canvasEdges.length,
        totalNotas: canvasNotes.length,
        nombre: payload.nombre
      })
      
      // Llamar a la API (POST si es nueva, PUT si es edición)
      let response: Response
      let data: { exito?: boolean; mensaje?: string; error?: string; data?: { id?: string; nombre?: string; estado?: string; actualizado_at?: string } }

      if (campaignId) {
        // Actualizar campaña existente (canvas_data, nombre y descripción)
        response = await fetch(`/api/campanas/${campaignId}/canvas`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            canvas_data: canvasData,
            nombre: metadata.nombre || campaignName,
            descripcion: metadata.descripcion || campaignDescription
          })
        })
        data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Error al actualizar la campaña')
        }

        toast.success(`Campaña "${payload.nombre}" actualizada exitosamente`, { id: toastId })
        console.log('✅ Campaña actualizada exitosamente:', data)
      } else {
        // Crear nueva campaña
        response = await fetch('/api/campanas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Error al guardar la campaña')
        }

        // Si se creó exitosamente, actualizar campaignId y marcar para redirección
        if (data.data && data.data.id) {
          setCampaignId(data.data.id)
          setPendingRedirectId(data.data.id)
          // No redirigir inmediatamente, dejar que el modal se abra primero
          // La redirección se hará cuando el usuario cierre el modal
        }

        toast.success(`Campaña "${payload.nombre}" guardada exitosamente`, { id: toastId })
        console.log('✅ Campaña guardada exitosamente:', data)
      }

      // Actualizar snapshot después de guardar exitosamente
      savedSnapshotRef.current = createSnapshot()
      setHasUnsavedChanges(false)

      // Sincronizar triggers automáticos (Fase 5)
      const workflowId = campaignId || data.data?.id
      if (workflowId) {
        console.log('🔄 Sincronizando triggers automáticos...')
        
        // Preparar nodos con triggers
        const nodosConTrigger: NodoConTrigger[] = realNodes
          .filter(n => ['email', 'sms', 'whatsapp', 'llamada'].includes(n.type || ''))
          .map(n => ({
            id: n.id,
            tipo: n.type as 'email' | 'sms' | 'whatsapp' | 'llamada',
            tipo_evento: n.data?.configuracion?.tipo_evento,
            dias_relativos: n.data?.configuracion?.dias_relativos
          }))
        
        try {
          const responseTriggers = await fetch(`/api/campanas/${workflowId}/triggers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodos: nodosConTrigger })
          })
          
          const resultadoTriggers = await responseTriggers.json()
          
          if (responseTriggers.ok && resultadoTriggers.exito) {
            console.log('✅ Triggers sincronizados exitosamente', resultadoTriggers)
          } else {
            console.error('⚠️ Error sincronizando triggers:', resultadoTriggers.error)
            toast.warning('Campaña guardada pero hubo un error al sincronizar triggers automáticos')
          }
        } catch (error) {
          console.error('⚠️ Error al sincronizar triggers:', error)
          toast.warning('Campaña guardada pero hubo un error al sincronizar triggers automáticos')
        }
      }
      
    } catch (error) {
      console.error('❌ Error al guardar:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error(`Error al guardar la campaña: ${errorMessage}`, { id: toastId })
      // Lanzar el error para que TopToolbar pueda manejarlo
      throw error
    }
  }, [nodes, edges, campaignId, campaignName, campaignDescription])

  // Función para probar la campaña
  const handleTest = useCallback(async () => {
    // Validar que la campaña esté guardada
    if (!campaignId) {
      toast.error('Debes guardar la campaña antes de probarla')
      return
    }

    // Validar que la campaña tenga nodos
    const realNodes = nodes.filter(n => n.id !== 'initial-plus' && n.type !== 'note')
    
    if (realNodes.length === 0) {
      toast.error('Agrega al menos un nodo para probar la campaña')
      return
    }

    // Activar estado de loading
    setIsTesting(true)
    setTestResults(null)

    // Mostrar loading
    const toastId = toast.loading('Ejecutando prueba de campaña...', {
      description: 'Esto puede tomar unos segundos'
    })

    try {
      // Preparar nodos para el endpoint (sin el nodo inicial)
      const canvasNodes = realNodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data
      }))

      // Preparar conexiones
      const canvasEdges = edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle
      }))

      // Llamar al endpoint de ejecución con modo_prueba
      const response = await fetch('/api/campanas/ejecutar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campana_id: campaignId,
          nodos: canvasNodes,
          conexiones: canvasEdges,
          modo_prueba: true
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.detalles || 'Error al ejecutar la prueba')
      }

      // Extraer resultados
      const resultado = data.resultado
      const exitosas = resultado.exitosas || 0
      const fallidas = resultado.fallidas || 0
      const detalles = resultado.detalles || []

      // Guardar resultados para el modal
      setTestResults({
        exitosas,
        fallidas,
        detalles
      })

      // Crear mensaje de resumen
      let mensaje = `Prueba completada: ${exitosas} exitosa${exitosas !== 1 ? 's' : ''}`
      if (fallidas > 0) {
        mensaje += `, ${fallidas} fallida${fallidas !== 1 ? 's' : ''}`
      }

      toast.success(mensaje, { 
        id: toastId, 
        duration: 5000,
        description: fallidas > 0 ? 'Revisa los detalles para más información' : undefined
      })

      // Mostrar detalles en consola
      console.log('📊 Resultados de la prueba:', {
        exitosas,
        fallidas,
        detalles
      })

      // Abrir modal con resultados
      if (detalles.length > 0) {
        // El modal se abrirá automáticamente cuando testResults tenga datos
      }

    } catch (error) {
      console.error('❌ Error al probar campaña:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error(`Error al probar la campaña: ${errorMessage}`, { 
        id: toastId,
        duration: 7000
      })
      setTestResults(null)
    } finally {
      // Desactivar estado de loading
      setIsTesting(false)
    }
  }, [nodes, edges, campaignId])

  // Calcular si hay nodos configurados (excluyendo initial-plus y notas)
  const hasNodes = nodes.filter(n => n.id !== 'initial-plus' && n.type !== 'note').length > 0

  return (
    <NodeActionsContext.Provider value={{ onConfigure: handleConfigureNode, onDelete: handleDeleteNode }}>
      <div className="h-screen flex flex-col">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando campaña...</p>
            </div>
          </div>
        )}

        {/* Barra Superior */}
        <TopToolbar 
          onAddNode={handleAddNodeFromToolbar}
          onSave={handleSave}
          onTest={handleTest}
          hasNodes={hasNodes}
          isTesting={isTesting}
          initialName={campaignName}
          initialDescription={campaignDescription}
          onNameChange={setCampaignName}
          onDescriptionChange={setCampaignDescription}
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
          hasUnsavedChanges={hasUnsavedChanges}
          pendingNavigation={pendingNavigation}
          onNavigationConfirm={(shouldSave, shouldNavigate) => {
            if (shouldNavigate && pendingNavigation) {
              if (shouldSave) {
                // La navegación se hará después de guardar desde TopToolbar
                // No hacer nada aquí, TopToolbar manejará la navegación después del guardado
              } else {
                // Salir sin guardar - navegar inmediatamente
                router.push(pendingNavigation)
                setPendingNavigation(null)
              }
            } else {
              // Cancelar navegación
              setPendingNavigation(null)
            }
          }}
          onSaveSuccess={(targetPath) => {
            // Cuando se guarda exitosamente y hay una navegación pendiente
            if (targetPath) {
              router.push(targetPath)
              setPendingNavigation(null)
            }
          }}
          onSettingsClose={() => {
            // Si hay una redirección pendiente (nueva campaña guardada), redirigir
            if (pendingRedirectId) {
              router.push(`/campanas/${pendingRedirectId}`)
              setPendingRedirectId(null)
            }
          }}
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
              onClose={() => {
                // Si hay cambios sin guardar, mostrar confirmación
                if (nodeConfigHasChanges) {
                  setPendingNodeConfigClose(true)
                } else {
                  setSelectedNode(null)
                }
              }}
              onSaveConfig={handleSaveNodeConfig}
              onConfigChange={(hasChanges) => setNodeConfigHasChanges(hasChanges)}
            />
          )}
        </div>

        {/* Modal de Resultados de Prueba */}
        <Dialog open={!!testResults} onOpenChange={(open) => { if (!open) setTestResults(null) }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Resultados de la Prueba
                {testResults && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {testResults.exitosas} exitosa{testResults.exitosas !== 1 ? 's' : ''}
                    </Badge>
                    {testResults.fallidas > 0 && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {testResults.fallidas} fallida{testResults.fallidas !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                )}
              </DialogTitle>
              <DialogDescription>
                Detalles de cada comunicación ejecutada durante la prueba
              </DialogDescription>
            </DialogHeader>

            {testResults && (
              <div className="space-y-4 mt-4">
                {/* Resumen */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{testResults.exitosas}</div>
                    <div className="text-sm text-gray-600 mt-1">Exitosas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{testResults.fallidas}</div>
                    <div className="text-sm text-gray-600 mt-1">Fallidas</div>
                  </div>
                </div>

                {/* Lista detallada */}
                {testResults.detalles.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-gray-700">Detalles por comunicación:</h3>
                    <div className="space-y-2">
                      {testResults.detalles.map((detalle, index) => {
                        const getTipoIcon = () => {
                          switch (detalle.tipo_accion) {
                            case 'email':
                              return <Mail className="h-4 w-4" />
                            case 'llamada':
                              return <Phone className="h-4 w-4" />
                            case 'sms':
                              return <MessageSquare className="h-4 w-4" />
                            case 'whatsapp':
                              return <MessageSquare className="h-4 w-4" />
                            default:
                              return <AlertCircle className="h-4 w-4" />
                          }
                        }

                        const getTipoColor = () => {
                          switch (detalle.tipo_accion) {
                            case 'email':
                              return 'bg-blue-100 text-blue-700 border-blue-200'
                            case 'llamada':
                              return 'bg-green-100 text-green-700 border-green-200'
                            case 'sms':
                              return 'bg-purple-100 text-purple-700 border-purple-200'
                            case 'whatsapp':
                              return 'bg-green-100 text-green-700 border-green-200'
                            default:
                              return 'bg-gray-100 text-gray-700 border-gray-200'
                          }
                        }

                        return (
                          <div
                            key={detalle.programacion_id || index}
                            className={`p-4 rounded-lg border-2 ${
                              detalle.exito
                                ? 'border-green-200 bg-green-50'
                                : 'border-red-200 bg-red-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                {/* Icono de estado */}
                                {detalle.exito ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                )}

                                <div className="flex-1 min-w-0">
                                  {/* Tipo y destinatario */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className={getTipoColor()}>
                                      <span className="flex items-center gap-1">
                                        {getTipoIcon()}
                                        <span className="capitalize">{detalle.tipo_accion}</span>
                                      </span>
                                    </Badge>
                                    <span className="text-sm text-gray-600 truncate">
                                      {detalle.destinatario || 'N/A'}
                                    </span>
                                  </div>

                                  {/* Estado */}
                                  <div className="mb-2">
                                    <Badge
                                      variant="outline"
                                      className={
                                        detalle.exito
                                          ? 'bg-green-100 text-green-800 border-green-300'
                                          : 'bg-red-100 text-red-800 border-red-300'
                                      }
                                    >
                                      {detalle.exito ? 'Exitoso' : 'Fallido'}
                                    </Badge>
                                  </div>

                                  {/* ID externo si es exitoso */}
                                  {detalle.exito && detalle.external_id && (
                                    <div className="text-xs text-gray-600 mb-2">
                                      <span className="font-medium">ID externo:</span>{' '}
                                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                        {detalle.external_id}
                                      </code>
                                    </div>
                                  )}

                                  {/* Error técnico si falló */}
                                  {!detalle.exito && detalle.error && (
                                    <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs">
                                      <div className="font-medium text-red-800 mb-1">Error técnico:</div>
                                      <div className="text-red-700 font-mono break-all">
                                        {detalle.error}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No se ejecutaron comunicaciones durante la prueba</p>
                  </div>
                )}
              </div>
            )}

            {/* Botón para cerrar */}
            <div className="flex justify-end mt-6 pt-4 border-t">
              <Button
                onClick={() => setTestResults(null)}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmación para cerrar panel de configuración con cambios sin guardar */}
        <AlertDialog open={pendingNodeConfigClose} onOpenChange={(open) => {
          if (!open) {
            setPendingNodeConfigClose(false)
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cerrar sin guardar?</AlertDialogTitle>
              <AlertDialogDescription>
                Tienes cambios sin guardar en la configuración del nodo. Si cierras ahora, perderás todos los cambios que has realizado.
                <br /><br />
                ¿Qué deseas hacer?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPendingNodeConfigClose(false)
                  setSelectedNode(null)
                  setNodeConfigHasChanges(false)
                }}
                className="w-full sm:w-auto border-red-300 text-red-600 hover:bg-red-50"
              >
                Cerrar sin guardar
              </Button>
              <Button
                variant="outline"
                onClick={() => setPendingNodeConfigClose(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </NodeActionsContext.Provider>
  )
}
