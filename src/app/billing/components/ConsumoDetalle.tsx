'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'

interface ConsumoDetalle {
  periodo: string
  emails_enviados: number
  llamadas_ejecutadas: number
  sms_enviados: number
  whatsapp_enviados: number
  duracion_llamadas: number
  memoria_db_usada: number
  costo_emails: number
  costo_llamadas: number
  costo_sms: number
  costo_whatsapp: number
  costo_db: number
  costo_total: number
}

interface PlanLimits {
  limite_emails: number
  limite_llamadas: number
  limite_sms: number
  limite_whatsapp: number
  limite_memoria_mb: number
}

export default function ConsumoDetalle() {
  const [consumoData, setConsumoData] = useState<ConsumoDetalle[]>([])
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')

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
        throw new Error('Error al cargar datos de consumo')
      }

      const [usoData, planData] = await Promise.all([
        usoResponse.json(),
        planResponse.json()
      ])

      // Simulamos datos históricos para el ejemplo
      // En producción, esto vendría de un endpoint específico
      const historicoData = [
        usoData,
        {
          ...usoData,
          periodo: getPreviousMonth(usoData.periodo),
          emails_enviados: Math.floor(usoData.emails_enviados * 0.8),
          llamadas_ejecutadas: Math.floor(usoData.llamadas_ejecutadas * 0.9),
          sms_enviados: Math.floor(usoData.sms_enviados * 0.7),
          costo_total: Math.floor(usoData.costo_total * 0.85)
        },
        {
          ...usoData,
          periodo: getPreviousMonth(getPreviousMonth(usoData.periodo)),
          emails_enviados: Math.floor(usoData.emails_enviados * 1.2),
          llamadas_ejecutadas: Math.floor(usoData.llamadas_ejecutadas * 1.1),
          sms_enviados: Math.floor(usoData.sms_enviados * 1.3),
          costo_total: Math.floor(usoData.costo_total * 1.15)
        }
      ]

      setConsumoData(historicoData)
      setPlanLimits(planData.plan || null)
      setSelectedPeriod(usoData.periodo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const getPreviousMonth = (periodo: string) => {
    const [year, month] = periodo.split('-').map(Number)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`
  }

  const formatPeriodo = (periodo: string) => {
    const [year, month] = periodo.split('-')
    const monthNames = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ]
    return `${monthNames[parseInt(month) - 1]} ${year}`
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

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-red-500" />
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-green-500" />
    }
    return null
  }

  const getTrendPercentage = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Consumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
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

  if (!consumoData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Consumo</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No se pudo cargar la información de consumo</p>
        </CardContent>
      </Card>
    )
  }

  // Caso: Usuario sin plan asignado
  if (!planLimits) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detalle de Consumo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Sin plan activo
              </h3>
              <p className="text-gray-500 mb-6">
                Selecciona un plan para ver el detalle de consumo
              </p>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-2">Consumo actual (sin límites)</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>📧 {consumoData[0]?.emails_enviados || 0} emails</div>
                <div>📞 {consumoData[0]?.llamadas_ejecutadas || 0} llamadas</div>
                <div>💬 {consumoData[0]?.sms_enviados || 0} SMS</div>
                <div>📱 {consumoData[0]?.whatsapp_enviados || 0} WhatsApp</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentData = consumoData[0]
  const previousData = consumoData[1]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Detalle de Consumo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumen Comparativo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Emails</p>
                <p className="text-2xl font-bold text-blue-900">
                  {currentData.emails_enviados.toLocaleString()}
                </p>
              </div>
              {previousData && getTrendIcon(currentData.emails_enviados, previousData.emails_enviados)}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Límite: {planLimits.limite_emails.toLocaleString()}
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Llamadas</p>
                <p className="text-2xl font-bold text-green-900">
                  {currentData.llamadas_ejecutadas.toLocaleString()}
                </p>
              </div>
              {previousData && getTrendIcon(currentData.llamadas_ejecutadas, previousData.llamadas_ejecutadas)}
            </div>
            <p className="text-xs text-green-600 mt-1">
              Límite: {planLimits.limite_llamadas.toLocaleString()}
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">SMS</p>
                <p className="text-2xl font-bold text-purple-900">
                  {currentData.sms_enviados.toLocaleString()}
                </p>
              </div>
              {previousData && getTrendIcon(currentData.sms_enviados, previousData.sms_enviados)}
            </div>
            <p className="text-xs text-purple-600 mt-1">
              Límite: {planLimits.limite_sms.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tabla de Consumo Histórico */}
        <div>
          <h3 className="font-medium mb-4">Consumo Histórico</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Emails</TableHead>
                  <TableHead>Llamadas</TableHead>
                  <TableHead>SMS</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Memoria</TableHead>
                  <TableHead className="text-right">Costo Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumoData.map((data, index) => (
                  <TableRow key={data.periodo}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {formatPeriodo(data.periodo)}
                        {data.periodo === selectedPeriod && (
                          <Badge variant="secondary">Actual</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{data.emails_enviados.toLocaleString()}</TableCell>
                    <TableCell>{data.llamadas_ejecutadas.toLocaleString()}</TableCell>
                    <TableCell>{data.sms_enviados.toLocaleString()}</TableCell>
                    <TableCell>{data.whatsapp_enviados.toLocaleString()}</TableCell>
                    <TableCell>{formatMinutes(data.duracion_llamadas)}</TableCell>
                    <TableCell>{formatBytes(data.memoria_db_usada)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${data.costo_total.toLocaleString('es-ES')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Desglose de Costos del Mes Actual */}
        <div>
          <h3 className="font-medium mb-4">Desglose de Costos - {formatPeriodo(currentData.periodo)}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-gray-600">Emails</p>
              <p className="font-bold">${currentData.costo_emails.toLocaleString('es-ES')}</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-gray-600">Llamadas</p>
              <p className="font-bold">${currentData.costo_llamadas.toLocaleString('es-ES')}</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-gray-600">SMS</p>
              <p className="font-bold">${currentData.costo_sms.toLocaleString('es-ES')}</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-gray-600">WhatsApp</p>
              <p className="font-bold">${currentData.costo_whatsapp.toLocaleString('es-ES')}</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-sm text-gray-600">Base de Datos</p>
              <p className="font-bold">${currentData.costo_db.toLocaleString('es-ES')}</p>
            </div>
            <div className="text-center p-3 border rounded-lg bg-green-50">
              <p className="text-sm text-green-600">Total</p>
              <p className="font-bold text-green-700">${currentData.costo_total.toLocaleString('es-ES')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
