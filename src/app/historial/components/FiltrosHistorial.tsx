"use client"

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Filter, Calendar, Search, X } from 'lucide-react'

type Canal = 'email' | 'llamada' | 'sms' | 'whatsapp'

type Valores = {
  from: string
  to: string
  canal: string
  estado: string
  campanaId: string
  q: string
}

export default function FiltrosHistorial({
  valores,
  onChange,
  limpiarfiltros,
}: {
  valores: Valores
  onChange: (key: keyof Valores, value: string | null, debounced?: boolean) => void
  limpiarfiltros: () => void
}) {
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false)

  const estados = useMemo(() => [
    'iniciado', 'entregado', 'completado', 'fallido'
  ], [])

  const canales: Canal[] = ['email', 'llamada', 'sms', 'whatsapp']

  const tieneFiltrosActivos = 
    valores.q !== '' ||
    valores.canal !== '' ||
    valores.estado !== '' ||
    valores.campanaId !== '' ||
    valores.from !== '' ||
    valores.to !== ''

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
          <div className="flex items-center gap-2">
            {tieneFiltrosActivos && (
              <Button
                variant="outline"
                size="sm"
                onClick={limpiarfiltros}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
            >
              {mostrarFiltrosAvanzados ? 'Ocultar' : 'Mostrar'} filtros avanzados
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Búsqueda principal */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por email, teléfono o RUT..."
                  value={valores.q}
                  onChange={(e) => onChange('q', e.target.value, true)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={valores.estado} onValueChange={(v) => onChange('estado', v === 'todos' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  {estados.map((e) => (
                    <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtros avanzados */}
          {mostrarFiltrosAvanzados && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
              {/* Canal */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Canal</label>
                <Select value={valores.canal} onValueChange={(v) => onChange('canal', v === 'todos' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los canales</SelectItem>
                    {canales.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rango de fechas */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Rango de fechas
                </label>
                <div className="flex gap-2">
                  <Input
                    type="datetime-local"
                    placeholder="Desde"
                    value={valores.from}
                    onChange={(e) => onChange('from', e.target.value || null)}
                  />
                  <Input
                    type="datetime-local"
                    placeholder="Hasta"
                    value={valores.to}
                    onChange={(e) => onChange('to', e.target.value || null)}
                  />
                </div>
              </div>

              {/* Campaña */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Campaña</label>
                <Input 
                  value={valores.campanaId}
                  onChange={(e) => onChange('campanaId', e.target.value || null)} 
                  placeholder="ID de campaña" 
                />
              </div>
            </div>
          )}

          {/* Resumen de filtros activos */}
          {tieneFiltrosActivos && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-gray-500">Filtros activos:</span>
              {valores.q && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Búsqueda: &quot;{valores.q}&quot;
                </span>
              )}
              {valores.estado && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Estado: {valores.estado}
                </span>
              )}
              {valores.canal && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  Canal: {valores.canal}
                </span>
              )}
              {valores.campanaId && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                  Campaña: {valores.campanaId}
                </span>
              )}
              {(valores.from || valores.to) && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                  Fechas: {valores.from || '∞'} - {valores.to || '∞'}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


