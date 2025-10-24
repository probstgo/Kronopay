"use client"

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Deudor, formatearMonto } from '@/lib/database'
import { supabase } from '@/lib/supabase'

// Tipo para deudor con datos combinados
interface DeudorConDatos extends Deudor {
  email?: string;
  telefono?: string;
  monto_deuda?: number;
  estado?: string;
}

interface SelectorDeudorProps {
  onDeudorSelect: (deudor: DeudorConDatos | null) => void
  selectedDeudor: DeudorConDatos | null
}

export default function SelectorDeudor({ onDeudorSelect, selectedDeudor }: SelectorDeudorProps) {
  const [deudores, setDeudores] = useState<DeudorConDatos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargarDeudores = async () => {
      try {
        setLoading(true)
        console.log('🔍 Cargando deudores desde Supabase...')
        
        // Obtener deudores con sus deudas y contactos
        const { data: deudoresData, error: deudoresError } = await supabase
          .from('deudores')
          .select(`
            *,
            deudas(*),
            contactos(*)
          `)
          .order('created_at', { ascending: false });

        if (deudoresError) throw deudoresError;

        // Transformar datos al formato esperado por el componente
        const deudoresTransformados: DeudorConDatos[] = (deudoresData || []).map(deudor => {
          const emailPreferido = deudor.contactos?.find((c: { tipo_contacto: string; preferido: boolean }) => c.tipo_contacto === 'email' && c.preferido);
          const telefonoPreferido = deudor.contactos?.find((c: { tipo_contacto: string; preferido: boolean }) => c.tipo_contacto === 'telefono' && c.preferido);
          const montoTotal = deudor.deudas?.reduce((sum: number, deuda: { monto: number }) => sum + deuda.monto, 0) || 0;
          
          return {
            ...deudor,
            email: emailPreferido?.valor,
            telefono: telefonoPreferido?.valor,
            monto_deuda: montoTotal,
            estado: montoTotal > 0 ? 'pendiente' : 'sin_deudas'
          };
        });

        console.log('📊 Deudores obtenidos:', deudoresTransformados.length)
        setDeudores(deudoresTransformados)
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
      sin_deudas: 'bg-gray-100 text-gray-800',
      pendiente: 'bg-yellow-100 text-yellow-800',
      vencida: 'bg-red-100 text-red-800',
      pagada: 'bg-green-100 text-green-800'
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
                    <Badge className={`ml-2 ${getEstadoColor(deudor.estado || 'sin_deudas')}`}>
                      {(deudor.estado || 'sin_deudas').replace('_', ' ')}
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
                <p><strong>Monto deuda:</strong> {selectedDeudor.monto_deuda ? formatearMonto(selectedDeudor.monto_deuda) : '$0'}</p>
                <p><strong>Estado:</strong> 
                  <Badge className={`ml-2 ${getEstadoColor(selectedDeudor.estado || 'sin_deudas')}`}>
                    {(selectedDeudor.estado || 'sin_deudas').replace('_', ' ')}
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
