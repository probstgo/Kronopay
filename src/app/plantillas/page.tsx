'use client'

import { useEffect, useState } from 'react'
import Protected from '@/components/Protected'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, FileText, Mail, Volume2, MessageSquare, Edit, Trash2, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

interface Plantilla {
  id: string
  nombre: string
  tipo: 'email' | 'voz' | 'sms' | 'whatsapp'
  contenido: string
  created_at: string
}

const TIPOS_PLANTILLA = {
  email: { label: 'Email', icon: Mail, color: 'bg-blue-100 text-blue-800' },
  voz: { label: 'Voz', icon: Volume2, color: 'bg-purple-100 text-purple-800' },
  sms: { label: 'SMS', icon: MessageSquare, color: 'bg-green-100 text-green-800' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-100 text-green-800' }
}

export default function PlantillasPage() {
  const { user } = useAuth()
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  useEffect(() => {
    if (user) {
      cargarPlantillas()
    }
  }, [user])

  const cargarPlantillas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('plantillas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlantillas(data || [])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al cargar plantillas: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const eliminarPlantilla = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) return

    try {
      const { error } = await supabase
        .from('plantillas')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Plantilla eliminada exitosamente')
      cargarPlantillas()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al eliminar plantilla: ' + errorMessage)
    }
  }

  const duplicarPlantilla = async (plantilla: Plantilla) => {
    try {
      const { error } = await supabase
        .from('plantillas')
        .insert({
          nombre: `${plantilla.nombre} (Copia)`,
          tipo: plantilla.tipo,
          contenido: plantilla.contenido,
          usuario_id: user?.id
        })

      if (error) throw error
      
      toast.success('Plantilla duplicada exitosamente')
      cargarPlantillas()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al duplicar plantilla: ' + errorMessage)
    }
  }

  const plantillasFiltradas = plantillas.filter(plantilla => {
    const coincideBusqueda = plantilla.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                            plantilla.contenido.toLowerCase().includes(busqueda.toLowerCase())
    const coincideTipo = filtroTipo === 'todos' || plantilla.tipo === filtroTipo
    return coincideBusqueda && coincideTipo
  })

  if (loading) {
    return (
      <Protected>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando plantillas...</p>
            </div>
          </div>
        </div>
      </Protected>
    )
  }

  return (
    <Protected>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Plantillas</h1>
            <p className="text-gray-600 mt-1">Gestiona tus plantillas de mensajes para cobranza</p>
          </div>
          <Link href="/plantillas/nueva">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Plantilla
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar plantillas..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="voz">Voz</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(TIPOS_PLANTILLA).map(([tipo, config]) => {
            const cantidad = plantillas.filter(p => p.tipo === tipo).length
            const IconComponent = config.icon
            return (
              <Card key={tipo}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{config.label}</p>
                      <p className="text-2xl font-bold">{cantidad}</p>
                    </div>
                    <IconComponent className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Lista de Plantillas */}
        {plantillasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {plantillas.length === 0 ? 'No tienes plantillas' : 'No se encontraron plantillas'}
              </h3>
              <p className="text-gray-600 mb-4">
                {plantillas.length === 0 
                  ? 'Crea tu primera plantilla para comenzar a enviar mensajes automatizados'
                  : 'Intenta ajustar los filtros de búsqueda'
                }
              </p>
              {plantillas.length === 0 && (
                <Link href="/plantillas/nueva">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Plantilla
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plantillasFiltradas.map(plantilla => {
              const tipoConfig = TIPOS_PLANTILLA[plantilla.tipo]
              const IconComponent = tipoConfig.icon
              
              return (
                <Card key={plantilla.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-5 w-5 text-gray-600" />
                        <CardTitle className="text-lg">{plantilla.nombre}</CardTitle>
                      </div>
                      <Badge className={tipoConfig.color}>
                        {tipoConfig.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {plantilla.contenido.length > 100 
                        ? `${plantilla.contenido.substring(0, 100)}...`
                        : plantilla.contenido
                      }
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {new Date(plantilla.created_at).toLocaleDateString('es-CL')}
                      </span>
                      <div className="flex gap-1">
                        <Link href={`/plantillas/${plantilla.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => duplicarPlantilla(plantilla)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => eliminarPlantilla(plantilla.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </Protected>
  )
}