'use client'

import { useEffect, useState } from 'react'
import Protected from '@/components/Protected'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Search, Megaphone, Edit, Trash2, Copy, Calendar, MoreVertical, Play, Pause, Archive, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Campana {
  id: string
  nombre: string
  descripcion: string | null
  estado: 'borrador' | 'activo' | 'pausado' | 'archivado'
  version: number
  creado_at: string
  actualizado_at: string
  ejecutado_at: string | null
}

const ESTADOS_CONFIG = {
  borrador: { label: 'Borrador', color: 'bg-gray-100 text-gray-800' },
  activo: { label: 'Activa', color: 'bg-green-100 text-green-800' },
  pausado: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-800' },
  archivado: { label: 'Archivada', color: 'bg-gray-100 text-gray-600' }
}

export default function CampanasPage() {
  const { user } = useAuth()
  const [campanas, setCampanas] = useState<Campana[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  useEffect(() => {
    if (user) {
      cargarCampanas()
    }
  }, [user])

  const cargarCampanas = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/campanas')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al cargar campañas')
      }

      setCampanas(result.data || [])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al cargar campañas: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const eliminarCampana = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la campaña "${nombre}"?`)) return

    try {
      const response = await fetch(`/api/campanas/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar campaña')
      }

      toast.success('Campaña eliminada exitosamente')
      cargarCampanas()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al eliminar campaña: ' + errorMessage)
    }
  }

  const duplicarCampana = async (id: string) => {
    try {
      const response = await fetch(`/api/campanas/${id}/duplicar`, {
        method: 'POST'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al duplicar campaña')
      }

      toast.success('Campaña duplicada exitosamente')
      cargarCampanas()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al duplicar campaña: ' + errorMessage)
    }
  }

  const cambiarEstado = async (id: string, nuevoEstado: 'borrador' | 'activo' | 'pausado' | 'archivado') => {
    try {
      const response = await fetch(`/api/campanas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al cambiar estado')
      }

      const estadoLabels: Record<string, string> = {
        borrador: 'borrador',
        activo: 'activa',
        pausado: 'pausada',
        archivado: 'archivada'
      }

      toast.success(`Campaña marcada como ${estadoLabels[nuevoEstado]}`)
      cargarCampanas()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al cambiar estado: ' + errorMessage)
    }
  }

  const campanasFiltradas = campanas.filter(campana => {
    const coincideBusqueda = campana.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (campana.descripcion && campana.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
    const coincideEstado = filtroEstado === 'todos' || campana.estado === filtroEstado
    return coincideBusqueda && coincideEstado
  })

  return (
    <Protected>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Campañas de Cobranza</h1>
            <p className="text-gray-600 mt-1">Gestiona tus flujos de cobranza automatizados</p>
          </div>
          <Link href="/campanas/nueva">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nueva Campaña
            </Button>
          </Link>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar campañas..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="activo">Activa</SelectItem>
              <SelectItem value="pausado">Pausada</SelectItem>
              <SelectItem value="archivado">Archivada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando campañas...</p>
          </div>
        )}

        {/* Lista vacía */}
        {!loading && campanas.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay campañas</h3>
              <p className="text-gray-600 mb-4">Crea tu primera campaña de cobranza para comenzar</p>
              <Link href="/campanas/nueva">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Campaña
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Lista de campañas */}
        {!loading && campanasFiltradas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campanasFiltradas.map((campana) => {
              const estadoConfig = ESTADOS_CONFIG[campana.estado]
              return (
                <Card key={campana.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{campana.nombre}</CardTitle>
                        <Badge className={estadoConfig.color}>
                          {estadoConfig.label}
                        </Badge>
                      </div>
                      <Megaphone className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {campana.descripcion && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {campana.descripcion}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(campana.actualizado_at).toLocaleDateString('es-CL')}
                        </span>
                      </div>
                      <span>v{campana.version}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/campanas/${campana.id}`} className="flex-1">
                        <Button variant="default" size="sm" className="w-full">
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </Link>
                      <Link href={`/campanas/${campana.id}/ejecuciones`}>
                        <Button variant="outline" size="sm" title="Ver ejecuciones">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => duplicarCampana(campana.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {campana.estado !== 'activo' && (
                            <DropdownMenuItem onClick={() => cambiarEstado(campana.id, 'activo')}>
                              <Play className="h-4 w-4 mr-2" />
                              Activar
                            </DropdownMenuItem>
                          )}
                          {campana.estado !== 'pausado' && campana.estado !== 'borrador' && (
                            <DropdownMenuItem onClick={() => cambiarEstado(campana.id, 'pausado')}>
                              <Pause className="h-4 w-4 mr-2" />
                              Pausar
                            </DropdownMenuItem>
                          )}
                          {campana.estado !== 'archivado' && (
                            <DropdownMenuItem onClick={() => cambiarEstado(campana.id, 'archivado')}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archivar
                            </DropdownMenuItem>
                          )}
                          {campana.estado === 'archivado' && (
                            <DropdownMenuItem onClick={() => cambiarEstado(campana.id, 'borrador')}>
                              <Edit className="h-4 w-4 mr-2" />
                              Desarchivar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => eliminarCampana(campana.id, campana.nombre)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Sin resultados de búsqueda */}
        {!loading && campanas.length > 0 && campanasFiltradas.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron resultados</h3>
              <p className="text-gray-600">Intenta con otros términos de búsqueda</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Protected>
  )
}
