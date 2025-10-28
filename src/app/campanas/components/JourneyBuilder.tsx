'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Save, 
  Play, 
  Clock, 
  BarChart3, 
  HelpCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import NodePalette from './NodePalette'
import { TriggerNode, EmailNode, EsperaNode, ConnectionsRenderer, BaseNode } from './'
import type { TriggerNodeProps, EmailNodeProps, EsperaNodeProps } from './'
import { ConnectionPoint, Connection } from './ConnectionLine'
import NodeConfigPanel from './NodeConfigPanel'

// Tipos básicos para el workflow
export interface WorkflowNode {
  id: string
  tipo: 'trigger' | 'email' | 'llamada' | 'sms' | 'espera' | 'condicion' | 'estadistica'
  posicion: { x: number; y: number }
  configuracion: Record<string, unknown>
  conexiones: {
    entrada?: string[]
    salida?: string[]
  }
}

// Usar el tipo Connection del componente ConnectionLine
type WorkflowConnection = Connection

interface WorkflowData {
  nodos: WorkflowNode[]
  conexiones: WorkflowConnection[]
  configuracion: {
    nombre: string
    descripcion: string
    programacion: 'inmediata' | 'programada' | 'recurrente'
    deudores_seleccionados: string[]
  }
}

export default function JourneyBuilder() {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    nodos: [],
    conexiones: [],
    configuracion: {
      nombre: 'Nuevo Workflow',
      descripcion: '',
      programacion: 'inmediata',
      deudores_seleccionados: []
    }
  })
  
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 })
  const [canvasScale, setCanvasScale] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionPoints, setConnectionPoints] = useState<ConnectionPoint[]>([])
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string; pointId: string } | null>(null)
  const connectionStartRef = useRef<{ nodeId: string; pointId: string } | null>(null)
  const [workflowsExistentes, setWorkflowsExistentes] = useState<Array<{
    id: string
    nombre: string
    descripcion: string
    estado: string
    version: number
    actualizado_at: string
  }>>([])
  const [mostrarListaWorkflows, setMostrarListaWorkflows] = useState(false)
  
  // Estados para drag and drop
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Configuración por defecto para nuevos nodos
  const getDefaultConfig = (tipo: string): Record<string, unknown> => {
    switch (tipo) {
      case 'trigger':
        return {
          activacion: 'manual' as const,
          deudores_seleccionados: [],
          filtros_adicionales: {}
        }
      case 'email':
        return {
          plantilla_id: '',
          asunto_personalizado: '',
          variables_dinamicas: {
            nombre: true,
            monto: true,
            fecha_vencimiento: true,
            empresa: true
          },
          configuracion_avanzada: {
            solo_dias_laborables: true,
            horario_trabajo: { inicio: '09:00', fin: '18:00' },
            reintentos: 3,
            timeout_minutos: 30
          },
          conexiones: {
            si_exito: '',
            si_falla: '',
            si_timeout: ''
          }
        }
      case 'espera':
        return {
          duracion: {
            tipo: 'horas' as const,
            cantidad: 24
          },
          configuracion_avanzada: {
            solo_dias_laborables: true,
            excluir_fines_semana: true,
            excluir_feriados: true,
            zona_horaria: 'America/Santiago'
          },
          conexiones: {
            siguiente_paso: ''
          }
        }
      default:
        return {}
    }
  }

  // Función para agregar un nuevo nodo
  const agregarNodo = useCallback((tipo: string) => {
    const nuevoNodo: WorkflowNode = {
      id: `nodo_${Date.now()}`,
      tipo: tipo as WorkflowNode['tipo'],
      posicion: { x: 300, y: 200 },
      configuracion: getDefaultConfig(tipo),
      conexiones: { entrada: [], salida: [] }
    }

    setWorkflowData(prev => ({
      ...prev,
      nodos: [...prev.nodos, nuevoNodo]
    }))
  }, [])

  // Función para eliminar un nodo
  const eliminarNodo = useCallback((nodeId: string) => {
    setWorkflowData(prev => ({
      ...prev,
      nodos: prev.nodos.filter(nodo => nodo.id !== nodeId),
      conexiones: prev.conexiones.filter(conn => 
        conn.from !== nodeId && conn.to !== nodeId
      )
    }))
    setSelectedNode(null)
  }, [])

  // Función para duplicar un nodo
  const duplicarNodo = useCallback((nodeId: string) => {
    const nodoOriginal = workflowData.nodos.find(n => n.id === nodeId)
    if (!nodoOriginal) return

    const nodoDuplicado: WorkflowNode = {
      ...nodoOriginal,
      id: `nodo_${Date.now()}`,
      posicion: {
        x: nodoOriginal.posicion.x + 50,
        y: nodoOriginal.posicion.y + 50
      },
      conexiones: { entrada: [], salida: [] }
    }

    setWorkflowData(prev => ({
      ...prev,
      nodos: [...prev.nodos, nodoDuplicado]
    }))
  }, [workflowData.nodos])

  // Función para cargar workflows existentes
  const cargarWorkflowsExistentes = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('workflows_cobranza')
        .select('*')
        .eq('usuario_id', user.id)
        .order('actualizado_at', { ascending: false })

      if (error) throw error
      setWorkflowsExistentes(data || [])
    } catch (error) {
      console.error('Error al cargar workflows:', error)
      toast.error('Error al cargar workflows existentes')
    }
  }, [user])

  // Función para cargar un workflow específico
  const cargarWorkflow = useCallback(async (workflowId: string) => {
    try {
      const { data, error } = await supabase
        .from('workflows_cobranza')
        .select('*')
        .eq('id', workflowId)
        .single()

      if (error) throw error

      if (data) {
        setWorkflowData({
          nodos: data.canvas_data.nodos || [],
          conexiones: data.canvas_data.conexiones || [],
          configuracion: data.configuracion || {
            nombre: data.nombre,
            descripcion: data.descripcion,
            programacion: 'inmediata',
            deudores_seleccionados: []
          }
        })
        setMostrarListaWorkflows(false)
        toast.success('Workflow cargado exitosamente')
      }
    } catch (error) {
      console.error('Error al cargar workflow:', error)
      toast.error('Error al cargar el workflow')
    }
  }, [])

  // Función para guardar workflow
  const guardarWorkflow = async () => {
    if (!user) {
      toast.error('Debes estar autenticado para guardar workflows')
      return
    }

    if (workflowData.nodos.length === 0) {
      toast.error('Debes agregar al menos un nodo al workflow')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('workflows_cobranza')
        .insert({
          usuario_id: user.id,
          nombre: workflowData.configuracion.nombre,
          descripcion: workflowData.configuracion.descripcion,
          canvas_data: {
            nodos: workflowData.nodos,
            conexiones: workflowData.conexiones
          },
          configuracion: workflowData.configuracion,
          estado: 'borrador'
        })

      if (error) throw error

      toast.success('Workflow guardado exitosamente')
      cargarWorkflowsExistentes() // Recargar la lista
    } catch (error) {
      console.error('Error al guardar workflow:', error)
      toast.error('Error al guardar el workflow')
    } finally {
      setIsLoading(false)
    }
  }

  // Función para crear nuevo workflow
  const crearNuevoWorkflow = () => {
    setWorkflowData({
      nodos: [],
      conexiones: [],
      configuracion: {
        nombre: 'Nuevo Workflow',
        descripcion: '',
        programacion: 'inmediata',
        deudores_seleccionados: []
      }
    })
    setSelectedNode(null)
    setMostrarListaWorkflows(false)
    toast.success('Nuevo workflow creado')
  }

  // Función para ejecutar workflow
  const ejecutarWorkflow = async () => {
    if (workflowData.nodos.length === 0) {
      toast.error('Debes agregar al menos un nodo al workflow')
      return
    }

    toast.info('Ejecutando workflow...')
    // TODO: Implementar ejecución real
  }

  // Función para programar workflow
  const programarWorkflow = () => {
    toast.info('Funcionalidad de programación próximamente')
    // TODO: Implementar programación
  }

  // Función para ver estadísticas
  const verEstadisticas = () => {
    toast.info('Estadísticas próximamente')
    // TODO: Implementar estadísticas
  }

  // Función para guardar configuración de nodo
  const guardarConfiguracionNodo = useCallback((nodeId: string, nuevaConfig: Record<string, unknown>) => {
    setWorkflowData(prev => ({
      ...prev,
      nodos: prev.nodos.map(nodo => 
        nodo.id === nodeId 
          ? { ...nodo, configuracion: nuevaConfig }
          : nodo
      )
    }))
    toast.success('Configuración guardada')
  }, [])

  // Funciones para manejar conexiones
  const handleConnectionStart = useCallback((nodeId: string, pointId: string) => {
    const connectionData = { nodeId, pointId }
    setConnectionStart(connectionData)
    connectionStartRef.current = connectionData
    toast.info('Haz clic en el punto de entrada del siguiente nodo')
  }, [])

  const handleConnectionEnd = useCallback((nodeId: string, pointId: string) => {
    const currentConnectionStart = connectionStartRef.current
    
    if (!currentConnectionStart) {
      toast.error('Primero haz clic en un punto de salida')
      return
    }
    
    // No permitir conexión consigo mismo
    if (currentConnectionStart.nodeId === nodeId) {
      setConnectionStart(null)
      connectionStartRef.current = null
      toast.error('No puedes conectar un nodo consigo mismo')
      return
    }

    // Crear nueva conexión
    const nuevaConexion: WorkflowConnection = {
      id: `conn_${Date.now()}`,
      from: currentConnectionStart.nodeId,
      to: nodeId,
      fromPoint: currentConnectionStart.pointId,
      toPoint: pointId,
      type: 'default',
      label: ''
    }

    setWorkflowData(prev => ({
      ...prev,
      conexiones: [...prev.conexiones, nuevaConexion]
    }))

    setConnectionStart(null)
    connectionStartRef.current = null
    toast.success('Conexión creada')
  }, [])

  // Función para manejar drag sobre el canvas
  const handleCanvasDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  // Función para soltar un nodo en el canvas
  const handleCanvasDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    
    const nodeType = e.dataTransfer.getData('nodeType')
    if (!nodeType || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / canvasScale
    const y = (e.clientY - rect.top) / canvasScale

    const nuevoNodo: WorkflowNode = {
      id: `nodo_${Date.now()}`,
      tipo: nodeType as WorkflowNode['tipo'],
      posicion: { x, y },
      configuracion: getDefaultConfig(nodeType),
      conexiones: { entrada: [], salida: [] }
    }

    setWorkflowData(prev => ({
      ...prev,
      nodos: [...prev.nodos, nuevoNodo]
    }))
    
    toast.success('Nodo añadido al canvas')
  }, [canvasScale, getDefaultConfig])

  // Función para iniciar el arrastre de un nodo
  const handleNodeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    setDraggingNodeId(nodeId)
    setSelectedNode(nodeId)
    
    const node = workflowData.nodos.find(n => n.id === nodeId)
    if (node && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left - node.posicion.x * canvasScale,
        y: e.clientY - rect.top - node.posicion.y * canvasScale
      })
    }
  }, [workflowData.nodos, canvasScale])

  // Agregar listeners de mouse al documento
  useEffect(() => {
    const handleMouseMoveListener = (e: MouseEvent) => {
      if (!draggingNodeId || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const newX = (e.clientX - rect.left - dragOffset.x) / canvasScale
      const newY = (e.clientY - rect.top - dragOffset.y) / canvasScale

      setWorkflowData(prev => ({
        ...prev,
        nodos: prev.nodos.map(node =>
          node.id === draggingNodeId
            ? { ...node, posicion: { x: Math.max(0, newX), y: Math.max(0, newY) } }
            : node
        )
      }))
    }

    const handleMouseUpListener = () => {
      setDraggingNodeId(null)
      // NO limpiar connectionStart aquí porque interfiere con el click
    }

    document.addEventListener('mousemove', handleMouseMoveListener)
    document.addEventListener('mouseup', handleMouseUpListener)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveListener)
      document.removeEventListener('mouseup', handleMouseUpListener)
    }
  }, [draggingNodeId, dragOffset, canvasScale])

  // Cargar workflows existentes al montar el componente
  useEffect(() => {
    cargarWorkflowsExistentes()
  }, [cargarWorkflowsExistentes])

  // Actualizar puntos de conexión cuando cambian los nodos
  useEffect(() => {
    const puntos: ConnectionPoint[] = []
    
    workflowData.nodos.forEach(nodo => {
      const nodeHeight = 96 // h-24 = 96px
      const nodeWidth = 192 // w-48 = 192px
      
      // Punto de entrada (lado izquierdo, centro vertical)
      puntos.push({
        id: `${nodo.id}_input`,
        nodeId: nodo.id,
        type: 'input',
        position: {
          x: nodo.posicion.x,
          y: nodo.posicion.y + nodeHeight / 2
        }
      })
      
      // Punto de salida (lado derecho, centro vertical)
      puntos.push({
        id: `${nodo.id}_output`,
        nodeId: nodo.id,
        type: 'output',
        position: {
          x: nodo.posicion.x + nodeWidth,
          y: nodo.posicion.y + nodeHeight / 2
        }
      })
    })
    
    setConnectionPoints(puntos)
  }, [workflowData.nodos])

  // Renderizar nodo individual usando componentes especializados
  const renderNodo = (nodo: WorkflowNode) => {
    const isSelected = selectedNode === nodo.id

    const baseProps = {
      id: nodo.id,
      posicion: nodo.posicion,
      isSelected,
      configuracion: nodo.configuracion,
      onSelect: setSelectedNode,
      onDelete: eliminarNodo,
      onDuplicate: duplicarNodo,
      onConfigure: (id: string) => {
        setSelectedNode(id)
      },
      onConnectionStart: handleConnectionStart,
      onConnectionEnd: handleConnectionEnd,
      onNodeMouseDown: handleNodeMouseDown,
      canvasScale
    }

    switch (nodo.tipo) {
      case 'trigger':
        return (
          <TriggerNode
            key={nodo.id}
            {...baseProps}
            configuracion={nodo.configuracion as TriggerNodeProps['configuracion']}
          />
        )
      case 'email':
        return (
          <EmailNode
            key={nodo.id}
            {...baseProps}
            configuracion={nodo.configuracion as EmailNodeProps['configuracion']}
          />
        )
      case 'espera':
        return (
          <EsperaNode
            key={nodo.id}
            {...baseProps}
            configuracion={nodo.configuracion as EsperaNodeProps['configuracion']}
          />
        )
      default:
        // Para nodos no implementados aún, usar BaseNode genérico
        const nodeType = {
          trigger: { nombre: 'Inicio', icono: '🚀', color: 'bg-green-500', descripcion: 'Inicio del flujo' },
          email: { nombre: 'Email', icono: '📧', color: 'bg-blue-500', descripcion: 'Enviar email' },
          llamada: { nombre: 'Llamada', icono: '📞', color: 'bg-purple-500', descripcion: 'Realizar llamada' },
          sms: { nombre: 'SMS', icono: '📱', color: 'bg-orange-500', descripcion: 'Enviar SMS' },
          espera: { nombre: 'Espera', icono: '⏰', color: 'bg-yellow-500', descripcion: 'Esperar tiempo' },
          condicion: { nombre: 'Condición', icono: '🔀', color: 'bg-red-500', descripcion: 'Evaluar condición' },
          estadistica: { nombre: 'Estadística', icono: '📊', color: 'bg-indigo-500', descripcion: 'Generar estadística' }
        }[nodo.tipo]

        return (
          <BaseNode
            key={nodo.id}
            {...baseProps}
            tipo={nodo.tipo}
            nombre={nodeType.nombre}
            icono={nodeType.icono}
            color={nodeType.color}
            descripcion={nodeType.descripcion}
          />
        )
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header con controles */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Journey Builder</h1>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {workflowData.nodos.length} nodos
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setMostrarListaWorkflows(!mostrarListaWorkflows)}
            className="flex items-center gap-2"
          >
            📁 Cargar
          </Button>
          
          <Button
            variant="outline"
            onClick={crearNuevoWorkflow}
            className="flex items-center gap-2"
          >
            ➕ Nuevo
          </Button>
          
          <Button
            variant="outline"
            onClick={guardarWorkflow}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Guardar
          </Button>
          
          <Button
            variant="outline"
            onClick={ejecutarWorkflow}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Ejecutar
          </Button>
          
          <Button
            variant="outline"
            onClick={programarWorkflow}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Programar
          </Button>
          
          <Button
            variant="outline"
            onClick={verEstadisticas}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Estadísticas
          </Button>
          
          <Button
            variant="outline"
            size="icon"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Paleta de nodos */}
        <div className="flex flex-col">
          <NodePalette onAddNode={agregarNodo} />
          
          {/* Configuración del workflow */}
          <div className="w-64 bg-white border-r border-t p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Configuración</h4>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-gray-600 block mb-1">Nombre:</label>
                <input
                  type="text"
                  value={workflowData.configuracion.nombre}
                  onChange={(e) => setWorkflowData(prev => ({
                    ...prev,
                    configuracion: {
                      ...prev.configuracion,
                      nombre: e.target.value
                    }
                  }))}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="text-gray-600 block mb-1">Descripción:</label>
                <textarea
                  value={workflowData.configuracion.descripcion}
                  onChange={(e) => setWorkflowData(prev => ({
                    ...prev,
                    configuracion: {
                      ...prev.configuracion,
                      descripcion: e.target.value
                    }
                  }))}
                  className="w-full px-2 py-1 border rounded text-sm h-16 resize-none"
                />
              </div>
              <div>
                <label className="text-gray-600 block mb-1">Programación:</label>
                <select
                  value={workflowData.configuracion.programacion}
                  onChange={(e) => setWorkflowData(prev => ({
                    ...prev,
                    configuracion: {
                      ...prev.configuracion,
                      programacion: e.target.value as 'inmediata' | 'programada' | 'recurrente'
                    }
                  }))}
                  className="w-full px-2 py-1 border rounded text-sm"
                >
                  <option value="inmediata">Inmediata</option>
                  <option value="programada">Programada</option>
                  <option value="recurrente">Recurrente</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas principal */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className="w-full h-full bg-gray-100 relative cursor-grab active:cursor-grabbing"
            style={{
              backgroundImage: `
                radial-gradient(circle, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${canvasScale})`
            }}
            onClick={() => setSelectedNode(null)}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
          >
            {/* Renderizar conexiones */}
            <ConnectionsRenderer
              connections={workflowData.conexiones}
              connectionPoints={connectionPoints}
              canvasScale={canvasScale}
              onDeleteConnection={(connectionId) => {
                setWorkflowData(prev => ({
                  ...prev,
                  conexiones: prev.conexiones.filter(conn => conn.id !== connectionId)
                }))
                toast.success('Conexión eliminada')
              }}
            />
            
            {/* Renderizar nodos */}
            {workflowData.nodos.map(renderNodo)}
            
            {/* Mensaje cuando no hay nodos */}
            {workflowData.nodos.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-xl font-semibold mb-2">Comienza tu Journey</h3>
                  <p className="text-gray-400">
                    Arrastra nodos desde la paleta para crear tu flujo de cobranza
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Controles de zoom */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCanvasScale(prev => Math.min(prev + 0.1, 2))}
            >
              +
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCanvasScale(prev => Math.max(prev - 0.1, 0.5))}
            >
              -
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCanvasScale(1)
                setCanvasPosition({ x: 0, y: 0 })
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Panel de configuración */}
        {selectedNode && (
          <NodeConfigPanel
            node={workflowData.nodos.find(n => n.id === selectedNode) || null}
            onClose={() => setSelectedNode(null)}
            onSave={guardarConfiguracionNodo}
          />
        )}
      </div>

      {/* Modal para lista de workflows */}
      {mostrarListaWorkflows && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Workflows Existentes</h3>
              <Button
                variant="ghost"
                onClick={() => setMostrarListaWorkflows(false)}
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {workflowsExistentes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📁</div>
                  <p>No tienes workflows guardados</p>
                  <p className="text-sm">Crea tu primer workflow usando los nodos</p>
                </div>
              ) : (
                workflowsExistentes.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => cargarWorkflow(workflow.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{workflow.nombre}</h4>
                        <p className="text-sm text-gray-500">{workflow.descripcion}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>Estado: {workflow.estado}</span>
                          <span>Versión: {workflow.version}</span>
                          <span>Actualizado: {new Date(workflow.actualizado_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={workflow.estado === 'activo' ? 'default' : 'secondary'}>
                          {workflow.estado}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            cargarWorkflow(workflow.id)
                          }}
                        >
                          Cargar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setMostrarListaWorkflows(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={crearNuevoWorkflow}
                className="flex items-center gap-2"
              >
                ➕ Nuevo Workflow
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
