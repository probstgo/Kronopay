'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, CheckCircle2, XCircle, PlayCircle, Loader2, Mail, Phone, MessageSquare, Filter, GitBranch, Pause } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Log {
  id: string
  nodo_id: string
  paso_numero: number
  tipo_accion: 'email' | 'llamada' | 'sms' | 'condicion' | 'filtro' | 'whatsapp'
  estado: 'iniciado' | 'completado' | 'fallido' | 'saltado'
  datos_entrada?: Record<string, unknown>
  datos_salida?: Record<string, unknown>
  error_message?: string
  duracion_ms?: number
  ejecutado_at: string
}

interface Ejecucion {
  id: string
  estado: 'pendiente' | 'ejecutando' | 'completado' | 'fallido' | 'pausado'
  paso_actual: number
  contexto_datos?: Record<string, unknown>
  resultado_final?: Record<string, unknown>
  iniciado_at: string
  completado_at: string | null
  proxima_ejecucion: string | null
  deudores: {
    id: string
    rut: string
    nombre: string
  } | null
  campana_nombre?: string
}

interface Metricas {
  total_logs: number
  completados: number
  fallidos: number
  duracion_total_ms: number
  duracion_total_seg: number
  tasa_exito: number
}

const ESTADOS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-gray-100 text-gray-800', icon: Clock },
  ejecutando: { label: 'Ejecutando', color: 'bg-blue-100 text-blue-800', icon: PlayCircle },
  completado: { label: 'Completado', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  fallido: { label: 'Fallido', color: 'bg-red-100 text-red-800', icon: XCircle },
  pausado: { label: 'Pausado', color: 'bg-yellow-100 text-yellow-800', icon: Pause }
}

const TIPO_ACCION_ICONS = {
  email: Mail,
  llamada: Phone,
  sms: MessageSquare,
  espera: Clock,
  condicion: GitBranch,
  filtro: Filter,
  whatsapp: MessageSquare
}

const TIPO_ACCION_LABELS = {
  email: 'Email',
  llamada: 'Llamada',
  sms: 'SMS',
  espera: 'Espera',
  condicion: 'Condición',
  filtro: 'Filtro',
  whatsapp: 'WhatsApp'
}

export default function DetalleEjecucionPage() {
  const params = useParams()
  const router = useRouter()
  const campanaId = params.id as string
  const ejecucionId = params.ejecucionId as string
  const [ejecucion, setEjecucion] = useState<Ejecucion | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [logsPorNodo, setLogsPorNodo] = useState<Record<string, Log[]>>({})
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [nodosExpandidos, setNodosExpandidos] = useState<Set<string>>(new Set())

  useEffect(() => {
    cargarDetalleEjecucion()
  }, [campanaId, ejecucionId])

  const cargarDetalleEjecucion = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/campanas/${campanaId}/ejecuciones/${ejecucionId}`)
      
      if (!response.ok) {
        throw new Error('Error cargando detalle de ejecución')
      }

      const data = await response.json()
      setEjecucion(data.ejecucion)
      setLogs(data.logs || [])
      setLogsPorNodo(data.logsPorNodo || {})
      setMetricas(data.metricas || null)
      
      // Expandir todos los nodos por defecto
      setNodosExpandidos(new Set(Object.keys(data.logsPorNodo || {})))
    } catch (error) {
      console.error('Error cargando detalle de ejecución:', error)
      toast.error('Error cargando detalle de ejecución')
    } finally {
      setLoading(false)
    }
  }

  const toggleNodo = (nodoId: string) => {
    const nuevos = new Set(nodosExpandidos)
    if (nodosExpandidos.has(nodoId)) {
      nuevos.delete(nodoId)
    } else {
      nuevos.add(nodoId)
    }
    setNodosExpandidos(nuevos)
  }

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return 'N/A'
    try {
      return format(new Date(fecha), 'PPpp', { locale: es })
    } catch {
      return fecha
    }
  }

  const formatearDuracion = (ms: number | null | undefined) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
    const minutos = Math.floor(ms / 60000)
    const segundos = Math.floor((ms % 60000) / 1000)
    return `${minutos}m ${segundos}s`
  }

  const formatearJSON = (obj: Record<string, unknown> | null | undefined) => {
    if (!obj) return null
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!ejecucion) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Ejecución no encontrada</p>
              <Link href={`/campanas/${campanaId}/ejecuciones`}>
                <Button variant="outline" className="mt-4">
                  Volver a ejecuciones
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const EstadoIcon = ESTADOS_CONFIG[ejecucion.estado].icon

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/campanas/${campanaId}/ejecuciones`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Detalle de Ejecución</h1>
              <p className="text-gray-600 mt-1">
                {ejecucion.campana_nombre || 'Campaña'}
                {ejecucion.deudores && ` - ${ejecucion.deudores.nombre} (${ejecucion.deudores.rut})`}
              </p>
            </div>
          </div>
        </div>

        {/* Información de Ejecución */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={ESTADOS_CONFIG[ejecucion.estado].color}>
                  <EstadoIcon className="h-4 w-4 mr-1" />
                  {ESTADOS_CONFIG[ejecucion.estado].label}
                </Badge>
                <CardTitle>Información de Ejecución</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Iniciado:</span>
                <p className="mt-1">{formatearFecha(ejecucion.iniciado_at)}</p>
              </div>
              {ejecucion.completado_at && (
                <div>
                  <span className="font-medium text-gray-600">Completado:</span>
                  <p className="mt-1">{formatearFecha(ejecucion.completado_at)}</p>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-600">Paso actual:</span>
                <p className="mt-1">{ejecucion.paso_actual}</p>
              </div>
              {ejecucion.resultado_final && (
                <div className="md:col-span-3">
                  <span className="font-medium text-gray-600">Resultado final:</span>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <pre className="text-xs overflow-x-auto">
                      {formatearJSON(ejecucion.resultado_final)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Métricas */}
        {metricas && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.total_logs}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Completados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{metricas.completados}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Fallidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metricas.fallidos}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Duración Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatearDuracion(metricas.duracion_total_ms)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Logs por Nodo */}
        <Card>
          <CardHeader>
            <CardTitle>Logs de Ejecución</CardTitle>
            <CardDescription>
              {logs.length === 0 
                ? 'No hay logs registrados' 
                : `${logs.length} log${logs.length !== 1 ? 's' : ''} encontrado${logs.length !== 1 ? 's' : ''}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No hay logs registrados para esta ejecución</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(logsPorNodo).map(([nodoId, logsNodo]) => {
                  const logsCompletados = logsNodo.filter(l => l.estado === 'completado')
                  const logsFallidos = logsNodo.filter(l => l.estado === 'fallido')
                  const ultimoLog = logsNodo[logsNodo.length - 1]
                  const TipoIcon = TIPO_ACCION_ICONS[ultimoLog.tipo_accion] || Filter
                  const estaExpandido = nodosExpandidos.has(nodoId)

                  return (
                    <Collapsible
                      key={nodoId}
                      open={estaExpandido}
                      onOpenChange={() => toggleNodo(nodoId)}
                    >
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                          {estaExpandido ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                          <TipoIcon className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <div className="font-medium">
                              {TIPO_ACCION_LABELS[ultimoLog.tipo_accion]} - {nodoId}
                            </div>
                            <div className="text-sm text-gray-600">
                              Paso {ultimoLog.paso_numero} • {logsNodo.length} log{logsNodo.length !== 1 ? 's' : ''}
                              {logsCompletados.length > 0 && (
                                <span className="ml-2 text-green-600">
                                  {logsCompletados.length} completado{logsCompletados.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              {logsFallidos.length > 0 && (
                                <span className="ml-2 text-red-600">
                                  {logsFallidos.length} fallido{logsFallidos.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <Badge
                          className={
                            ultimoLog.estado === 'completado'
                              ? 'bg-green-100 text-green-800'
                              : ultimoLog.estado === 'fallido'
                              ? 'bg-red-100 text-red-800'
                              : ultimoLog.estado === 'iniciado'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {ultimoLog.estado}
                        </Badge>
                      </div>
                      <CollapsibleContent>
                        <div className="mt-2 space-y-2 pl-8">
                          {logsNodo.map((log) => {
                            const LogTipoIcon = TIPO_ACCION_ICONS[log.tipo_accion] || Filter
                            return (
                              <div
                                key={log.id}
                                className="border rounded-lg p-4 bg-white"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <LogTipoIcon className="h-4 w-4 text-gray-600" />
                                    <span className="font-medium text-sm">
                                      {TIPO_ACCION_LABELS[log.tipo_accion]}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={
                                        log.estado === 'completado'
                                          ? 'border-green-300 text-green-700'
                                          : log.estado === 'fallido'
                                          ? 'border-red-300 text-red-700'
                                          : log.estado === 'iniciado'
                                          ? 'border-blue-300 text-blue-700'
                                          : 'border-gray-300 text-gray-700'
                                      }
                                    >
                                      {log.estado}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatearFecha(log.ejecutado_at)}
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  {log.duracion_ms !== null && log.duracion_ms !== undefined && (
                                    <div>
                                      <span className="font-medium text-gray-600">Duración:</span>{' '}
                                      {formatearDuracion(log.duracion_ms)}
                                    </div>
                                  )}
                                  {log.paso_numero && (
                                    <div>
                                      <span className="font-medium text-gray-600">Paso:</span>{' '}
                                      {log.paso_numero}
                                    </div>
                                  )}
                                </div>
                                {log.datos_entrada && Object.keys(log.datos_entrada).length > 0 && (
                                  <div className="mt-3">
                                    <span className="font-medium text-sm text-gray-600">Datos de entrada:</span>
                                    <div className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                                      <pre>{formatearJSON(log.datos_entrada)}</pre>
                                    </div>
                                  </div>
                                )}
                                {log.datos_salida && Object.keys(log.datos_salida).length > 0 && (
                                  <div className="mt-3">
                                    <span className="font-medium text-sm text-gray-600">Datos de salida:</span>
                                    <div className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                                      <pre>{formatearJSON(log.datos_salida)}</pre>
                                    </div>
                                  </div>
                                )}
                                {log.error_message && (
                                  <div className="mt-3">
                                    <span className="font-medium text-sm text-red-600">Error:</span>
                                    <div className="mt-1 p-2 bg-red-50 rounded text-xs text-red-700">
                                      {log.error_message}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

