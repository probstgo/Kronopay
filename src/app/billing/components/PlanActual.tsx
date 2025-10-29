'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, CreditCard, AlertCircle } from 'lucide-react'

interface Plan {
  id: string
  nombre: string
  precio_mensual: number
  limite_emails: number
  limite_llamadas: number
  limite_sms: number
  limite_whatsapp: number
  limite_memoria_mb: number
}

interface PlanActualData {
  plan: Plan
  estado_suscripcion: 'activo' | 'vencido' | 'cancelado' | 'suspendido'
  fecha_inicio_suscripcion: string | null
  fecha_renovacion: string | null
}

export default function PlanActual() {
  const [data, setData] = useState<PlanActualData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlanActual()
  }, [])

  const fetchPlanActual = async () => {
    try {
      const response = await fetch('/api/suscripciones/actual')
      if (!response.ok) {
        throw new Error('Error al cargar plan actual')
      }
      const data = await response.json()
      setData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo':
        return 'bg-green-100 text-green-800'
      case 'vencido':
        return 'bg-red-100 text-red-800'
      case 'cancelado':
        return 'bg-gray-100 text-gray-800'
      case 'suspendido':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'activo':
        return 'Activo'
      case 'vencido':
        return 'Vencido'
      case 'cancelado':
        return 'Cancelado'
      case 'suspendido':
        return 'Suspendido'
      default:
        return estado
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No disponible'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchPlanActual} variant="outline" className="mt-2">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No se pudo cargar la información del plan</p>
        </CardContent>
      </Card>
    )
  }

  // Caso: Usuario sin plan asignado
  if (!data.plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Plan Actual
            <Badge className="bg-gray-100 text-gray-800">
              Sin Plan
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No tienes un plan activo
              </h3>
              <p className="text-gray-500 mb-6">
                Selecciona un plan para comenzar a usar todas las funcionalidades
              </p>
            </div>
            
            <Button className="w-full">
              Ver Planes Disponibles
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Plan Actual
          <Badge className={getEstadoColor(data.estado_suscripcion)}>
            {getEstadoText(data.estado_suscripcion)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-2xl font-bold text-blue-600">{data.plan.nombre}</h3>
          <p className="text-3xl font-bold text-gray-900">
            ${data.plan.precio_mensual.toLocaleString('es-ES')}
            <span className="text-lg font-normal text-gray-500">/mes</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-gray-500">Inicio</p>
              <p className="font-medium">{formatDate(data.fecha_inicio_suscripcion)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-gray-500">Renovación</p>
              <p className="font-medium">{formatDate(data.fecha_renovacion)}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Límites del Plan</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>📧 {data.plan.limite_emails.toLocaleString()} emails</div>
            <div>📞 {data.plan.limite_llamadas.toLocaleString()} llamadas</div>
            <div>💬 {data.plan.limite_sms.toLocaleString()} SMS</div>
            <div>📱 {data.plan.limite_whatsapp.toLocaleString()} WhatsApp</div>
            <div className="col-span-2">💾 {data.plan.limite_memoria_mb.toLocaleString()} MB memoria</div>
          </div>
        </div>

        <div className="pt-4">
          <Button className="w-full" variant="outline">
            Cambiar Plan
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
