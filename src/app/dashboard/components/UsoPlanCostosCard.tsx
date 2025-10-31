'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DollarSign, Calendar, CreditCard, Info } from 'lucide-react'
import Link from 'next/link'
import type { PlanActualData } from '../types'

interface UsoPlanData {
  emailsUsado: number
  emailsLimite: number
  minutosUsado: number
  minutosLimite: number
  smsUsado: number
  smsLimite: number
  costoTotal: number
  planNombre: string
  fechaRenovacion: string | null
}

export function UsoPlanCostosCard() {
  const [usoData, setUsoData] = useState<UsoPlanData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      let usoJson = {
        emails_enviados: 0,
        duracion_llamadas: 0,
        sms_enviados: 0,
        costo_total: 0
      }
      let planJson: {
        plan: PlanActualData['plan'] | null
        estado_suscripcion?: PlanActualData['estado_suscripcion']
        fecha_inicio_suscripcion?: PlanActualData['fecha_inicio_suscripcion']
        fecha_renovacion?: PlanActualData['fecha_renovacion']
      } = {
        plan: null,
        estado_suscripcion: 'cancelado',
        fecha_inicio_suscripcion: null,
        fecha_renovacion: null
      }

      // Intentar obtener datos de uso, usar valores por defecto si falla
      try {
        const usoResponse = await fetch('/api/suscripciones/uso', { cache: 'no-store' })
        if (usoResponse.ok) {
          usoJson = await usoResponse.json()
        }
      } catch (e) {
        console.warn('Error al cargar datos de uso, usando valores por defecto:', e)
      }

      // Intentar obtener datos del plan, usar valores por defecto si falla
      try {
        const planResponse = await fetch('/api/suscripciones/actual', { cache: 'no-store' })
        if (planResponse.ok) {
          const responseData = await planResponse.json() as PlanActualData
          planJson = responseData
        }
      } catch (e) {
        console.warn('Error al cargar datos del plan, usando valores por defecto:', e)
      }

      // Obtener límites del plan (convertir límites de llamadas a minutos)
      const plan = planJson.plan
      const limiteEmails = plan?.limite_emails || 0
      const limiteLlamadas = plan?.limite_llamadas || 0
      const limiteMinutos = limiteLlamadas * 10 // Asumir 10 minutos por llamada
      const limiteSms = plan?.limite_sms || 0

      // Calcular minutos usados desde duracion_llamadas (en minutos)
      const minutosUsados = Math.round((usoJson.duracion_llamadas || 0) / 60)

      // Siempre establecer datos, incluso si son 0
      setUsoData({
        emailsUsado: usoJson.emails_enviados || 0,
        emailsLimite: limiteEmails,
        minutosUsado: minutosUsados,
        minutosLimite: limiteMinutos,
        smsUsado: usoJson.sms_enviados || 0,
        smsLimite: limiteSms,
        costoTotal: usoJson.costo_total || 0,
        planNombre: plan?.nombre || 'Sin Plan',
        fechaRenovacion: planJson.fecha_renovacion || null,
      })

    } catch (err) {
      // En caso de error inesperado, establecer datos con valores por defecto
      console.warn('Error inesperado al cargar datos, usando valores por defecto:', err)
      setUsoData({
        emailsUsado: 0,
        emailsLimite: 0,
        minutosUsado: 0,
        minutosLimite: 0,
        smsUsado: 0,
        smsLimite: 0,
        costoTotal: 0,
        planNombre: 'Sin Plan',
        fechaRenovacion: null,
      })
    } finally {
      setLoading(false)
    }
  }

  const getProgressPercentage = (usado: number, limite: number) => {
    if (limite === 0) return 0
    return Math.min((usado / limite) * 100, 100)
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-red-500'
    if (percentage >= 80) return 'bg-orange-500'
    return 'bg-green-500'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No disponible'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading && !usoData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Uso del Plan y Costos
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Uso actual del plan y costos asociados</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!usoData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Uso del Plan y Costos
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Uso actual del plan y costos asociados</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  const usageItems = [
    {
      label: 'Emails',
      usado: usoData.emailsUsado,
      limite: usoData.emailsLimite,
      unidad: 'emails',
    },
    {
      label: 'Minutos',
      usado: usoData.minutosUsado,
      limite: usoData.minutosLimite,
      unidad: 'minutos',
    },
    {
      label: 'SMS',
      usado: usoData.smsUsado,
      limite: usoData.smsLimite,
      unidad: 'SMS',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Uso del Plan y Costos
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Uso actual del plan y costos asociados</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Barras de progreso */}
        <div className="space-y-4">
          {usageItems.map((item) => {
            const percentage = getProgressPercentage(item.usado, item.limite)
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.usado.toLocaleString()} / {item.limite.toLocaleString()} {item.unidad}
                  </span>
                </div>
                <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${getProgressColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {percentage.toFixed(1)}% utilizado
                </div>
              </div>
            )
          })}
        </div>

        {/* Costo total del mes */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-medium">Costo Total del Mes</span>
            </div>
            <span className="text-2xl font-bold text-green-600">
              ${usoData.costoTotal.toLocaleString('es-ES')}
            </span>
          </div>
        </div>

        {/* Resumen del plan */}
        <div className="pt-4 border-t">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{usoData.planNombre}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Renueva el {formatDate(usoData.fechaRenovacion)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Link href="/billing">
            <Button variant="outline" size="sm" className="w-full">
              Ver detalles
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

