"use client"

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Deudor, getDeudores } from '@/lib/database'
import { formatearMontoCLP } from '@/lib/formateo'

interface SelectorDeudorProps {
  onDeudorSelect: (deudor: Deudor | null) => void
  selectedDeudor: Deudor | null
}

export default function SelectorDeudor({ onDeudorSelect, selectedDeudor }: SelectorDeudorProps) {
  const [deudores, setDeudores] = useState<Deudor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargarDeudores = async () => {
      try {
        setLoading(true)
        console.log('🔍 Cargando deudores directamente desde database.ts...')
        
        const data = await getDeudores()
        console.log('📊 Deudores obtenidos:', data?.length || 0)
        setDeudores(data || [])
      } catch (err) {
        console.error('❌ Error al cargar deudores:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    cargarDeudores()
  }, [])

  const getEstadoColor = (estado: string) => {
    const colors = {
      nueva: 'bg-blue-100 text-blue-800',
      en_proceso: 'bg-yellow-100 text-yellow-800',
      parcialmente_pagada: 'bg-orange-100 text-orange-800',
      pagada: 'bg-green-100 text-green-800',
      vencida: 'bg-red-100 text-red-800',
      cancelada: 'bg-gray-100 text-gray-800'
    }
    return colors[estado as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Deudor</CardTitle>
          <CardDescription>Cargando deudores...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Deudor</CardTitle>
          <CardDescription>Error al cargar deudores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm mb-4">{error}</div>
          <div className="text-xs text-gray-500">
            <p>Posibles soluciones:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Verifica que estés logueado en la aplicación</li>
              <li>Asegúrate de que hay deudores creados en la sección &quot;Gestión de Deudores&quot;</li>
              <li>Revisa la consola del navegador para más detalles</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (deudores.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Deudor</CardTitle>
          <CardDescription>No hay deudores disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No se encontraron deudores en la base de datos.</p>
            <div className="text-sm text-gray-400">
              <p>Para usar esta funcionalidad:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Ve a la sección &quot;Gestión de Deudores&quot;</li>
                <li>Agrega al menos un deudor con email</li>
                <li>Regresa a esta sección</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seleccionar Deudor</CardTitle>
        <CardDescription>
          Elige un deudor para enviar un email de prueba
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select
            value={selectedDeudor?.id || ""}
            onValueChange={(value) => {
              const deudor = deudores.find(d => d.id === value)
              onDeudorSelect(deudor || null)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un deudor..." />
            </SelectTrigger>
            <SelectContent>
              {deudores.map((deudor) => (
                <SelectItem key={deudor.id} value={deudor.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{deudor.nombre}</span>
                    <Badge className={`ml-2 ${getEstadoColor(deudor.estado)}`}>
                      {deudor.estado?.replace('_', ' ') || 'Sin estado'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedDeudor && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Deudor seleccionado:</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Nombre:</strong> {selectedDeudor.nombre}</p>
                {selectedDeudor.email && (
                  <p><strong>Email:</strong> {selectedDeudor.email}</p>
                )}
                {selectedDeudor.telefono && (
                  <p><strong>Teléfono:</strong> {selectedDeudor.telefono}</p>
                )}
                <p><strong>Monto deuda:</strong> {formatearMontoCLP(selectedDeudor.monto_deuda)}</p>
                <p><strong>Estado:</strong> 
                  <Badge className={`ml-2 ${getEstadoColor(selectedDeudor.estado)}`}>
                    {selectedDeudor.estado?.replace('_', ' ') || 'Sin estado'}
                  </Badge>
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
