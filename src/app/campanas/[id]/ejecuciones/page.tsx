'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, CheckCircle2, XCircle, PlayCircle, Loader2, BarChart3, Pause } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

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
}

interface Metricas {
  total: number
  completadas: number
  fallidas: number
  ejecutando: number
  tasa_exito: number
}

const ESTADOS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-gray-100 text-gray-800', icon: Clock },
  ejecutando: { label: 'Ejecutando', color: 'bg-blue-100 text-blue-800', icon: PlayCircle },
  completado: { label: 'Completado', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  fallido: { label: 'Fallido', color: 'bg-red-100 text-red-800', icon: XCircle },
  pausado: { label: 'Pausado', color: 'bg-yellow-100 text-yellow-800', icon: Pause }
}

export default function EjecucionesPage() {
  const params = useParams()
  const router = useRouter()
  const campanaId = params.id as string
  const [ejecuciones, setEjecuciones] = useState<Ejecucion[]>([])
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarEjecuciones()
  }, [campanaId])

  const cargarEjecuciones = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/campanas/${campanaId}/ejecuciones`)
      
      if (!response.ok) {
        throw new Error('Error cargando ejecuciones')
      }

      const data = await response.json()
      setEjecuciones(data.ejecuciones || [])
      setMetricas(data.metricas || null)
    } catch (error) {
      console.error('Error cargando ejecuciones:', error)
      toast.error('Error cargando ejecuciones')
    } finally {
      setLoading(false)
    }
  }

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return 'N/A'
    try {
      return formatDistanceToNow(new Date(fecha), { addSuffix: true, locale: es })
    } catch {
      return fecha
    }
  }

  const formatearDuracion = (iniciado: string, completado: string | null) => {
    if (!completado) return 'En curso...'
    try {
      const inicio = new Date(iniciado).getTime()
      const fin = new Date(completado).getTime()
      const duracion = fin - inicio
      const segundos = Math.floor(duracion / 1000)
      const minutos = Math.floor(segundos / 60)
      const horas = Math.floor(minutos / 60)
      
      if (horas > 0) {
        return `${horas}h ${minutos % 60}m`
      } else if (minutos > 0) {
        return `${minutos}m ${segundos % 60}s`
      } else {
        return `${segundos}s`
      }
    } catch {
      return 'N/A'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/campanas/${campanaId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ejecuciones de Campaña</h1>
              <p className="text-gray-600 mt-1">Seguimiento de todas las ejecuciones</p>
            </div>
          </div>
        </div>

        {/* Métricas */}
        {metricas && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Completadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{metricas.completadas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Fallidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metricas.fallidas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tasa de Éxito</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.tasa_exito.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lista de Ejecuciones */}
        <Card>
          <CardHeader>
            <CardTitle>Ejecuciones Recientes</CardTitle>
            <CardDescription>
              {ejecuciones.length === 0 
                ? 'No hay ejecuciones registradas' 
                : `${ejecuciones.length} ejecución${ejecuciones.length !== 1 ? 'es' : ''} encontrada${ejecuciones.length !== 1 ? 's' : ''}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ejecuciones.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No hay ejecuciones registradas para esta campaña</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ejecuciones.map((ejecucion) => {
                  const EstadoIcon = ESTADOS_CONFIG[ejecucion.estado].icon
                  return (
                    <div
                      key={ejecucion.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/campanas/${campanaId}/ejecuciones/${ejecucion.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={ESTADOS_CONFIG[ejecucion.estado].color}>
                              <EstadoIcon className="h-3 w-3 mr-1" />
                              {ESTADOS_CONFIG[ejecucion.estado].label}
                            </Badge>
                            {ejecucion.deudores && (
                              <span className="text-sm text-gray-600">
                                {ejecucion.deudores.nombre} ({ejecucion.deudores.rut})
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Iniciado:</span>{' '}
                              {formatearFecha(ejecucion.iniciado_at)}
                            </div>
                            {ejecucion.completado_at && (
                              <div>
                                <span className="font-medium">Completado:</span>{' '}
                                {formatearFecha(ejecucion.completado_at)}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Duración:</span>{' '}
                              {formatearDuracion(ejecucion.iniciado_at, ejecucion.completado_at)}
                            </div>
                            <div>
                              <span className="font-medium">Paso actual:</span>{' '}
                              {ejecucion.paso_actual}
                            </div>
                          </div>
                          {ejecucion.resultado_final && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Resultado:</span>{' '}
                              {typeof ejecucion.resultado_final.programaciones_creadas === 'number' && ejecucion.resultado_final.programaciones_creadas > 0 && (
                                <span>
                                  {ejecucion.resultado_final.programaciones_creadas} programaciones creadas
                                </span>
                              )}
                              {typeof ejecucion.resultado_final.exitosas === 'number' && (
                                <span className="ml-2 text-green-600">
                                  {ejecucion.resultado_final.exitosas} exitosas
                                </span>
                              )}
                              {typeof ejecucion.resultado_final.fallidas === 'number' && (
                                <span className="ml-2 text-red-600">
                                  {ejecucion.resultado_final.fallidas} fallidas
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/campanas/${campanaId}/ejecuciones/${ejecucion.id}`)
                          }}
                        >
                          Ver detalles
                        </Button>
                      </div>
                    </div>
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

