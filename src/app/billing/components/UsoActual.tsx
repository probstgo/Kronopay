'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, TrendingUp, DollarSign } from 'lucide-react'

interface UsoData {
  periodo: string
  emails_enviados: number
  llamadas_ejecutadas: number
  sms_enviados: number
  whatsapp_enviados: number
  duracion_llamadas: number
  memoria_db_usada: number
  costo_total: number
}

interface PlanLimits {
  limite_emails: number
  limite_llamadas: number
  limite_sms: number
  limite_whatsapp: number
  limite_memoria_mb: number
}

export default function UsoActual() {
  const [usoData, setUsoData] = useState<UsoData | null>(null)
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usoResponse, planResponse] = await Promise.all([
        fetch('/api/suscripciones/uso'),
        fetch('/api/suscripciones/actual')
      ])

      if (!usoResponse.ok || !planResponse.ok) {
        throw new Error('Error al cargar datos de uso')
      }

      const [usoData, planData] = await Promise.all([
        usoResponse.json(),
        planResponse.json()
      ])

      setUsoData(usoData)
      setPlanLimits(planData.plan || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const getProgressPercentage = (usado: number, limite: number) => {
    if (limite === 0) return 0
    return Math.min((usado / limite) * 100, 100)
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  const getAlertLevel = (percentage: number) => {
    if (percentage >= 90) return 'critical'
    if (percentage >= 75) return 'warning'
    return 'normal'
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uso del Mes Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
            ))}
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
        </CardContent>
      </Card>
    )
  }

  if (!usoData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uso del Mes Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No se pudo cargar la información de uso</p>
        </CardContent>
      </Card>
    )
  }

  // Caso: Usuario sin plan asignado
  if (!planLimits) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uso del Mes Actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Sin plan activo
              </h3>
              <p className="text-gray-500 mb-6">
                Selecciona un plan para ver el detalle de uso
              </p>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">Uso actual (sin límites)</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>📧 {usoData.emails_enviados.toLocaleString()} emails</div>
                <div>📞 {usoData.llamadas_ejecutadas.toLocaleString()} llamadas</div>
                <div>💬 {usoData.sms_enviados.toLocaleString()} SMS</div>
                <div>📱 {usoData.whatsapp_enviados.toLocaleString()} WhatsApp</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const usageItems = [
    {
      label: 'Emails Enviados',
      icon: '📧',
      usado: usoData.emails_enviados,
      limite: planLimits.limite_emails,
      unidad: 'emails'
    },
    {
      label: 'Llamadas Ejecutadas',
      icon: '📞',
      usado: usoData.llamadas_ejecutadas,
      limite: planLimits.limite_llamadas,
      unidad: 'llamadas'
    },
    {
      label: 'SMS Enviados',
      icon: '💬',
      usado: usoData.sms_enviados,
      limite: planLimits.limite_sms,
      unidad: 'SMS'
    },
    {
      label: 'WhatsApp Enviados',
      icon: '📱',
      usado: usoData.whatsapp_enviados,
      limite: planLimits.limite_whatsapp,
      unidad: 'mensajes'
    },
    {
      label: 'Memoria Utilizada',
      icon: '💾',
      usado: usoData.memoria_db_usada,
      limite: planLimits.limite_memoria_mb,
      unidad: 'MB',
      formatter: formatBytes
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Uso del Mes Actual</span>
          <span className="text-sm font-normal text-gray-500">
            {usoData.periodo}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {usageItems.map((item) => {
          const percentage = getProgressPercentage(item.usado, item.limite)
          const alertLevel = getAlertLevel(percentage)
          const displayValue = item.formatter ? item.formatter(item.usado) : item.usado.toLocaleString()

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {displayValue} / {item.limite.toLocaleString()} {item.unidad}
                  </span>
                  {alertLevel === 'critical' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  {alertLevel === 'warning' && (
                    <TrendingUp className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              </div>
              <Progress 
                value={percentage} 
                className="h-2"
              />
              <div className="text-xs text-gray-500">
                {percentage.toFixed(1)}% utilizado
              </div>
            </div>
          )
        })}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-medium">Costo Estimado del Mes</span>
            </div>
            <span className="text-2xl font-bold text-green-600">
              ${usoData.costo_total.toLocaleString('es-ES')}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Duración total de llamadas: {formatMinutes(usoData.duracion_llamadas)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
