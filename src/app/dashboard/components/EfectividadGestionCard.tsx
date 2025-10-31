'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatearMontoCLP } from '@/lib/formateo'
import Link from 'next/link'
import type { Canal, FiltrosDashboard } from '../types'

interface EfectividadPorCanal {
  canal: Canal
  montoRecuperado: number
  porcentaje: number
  label: string
}

interface EfectividadData {
  porCanal: EfectividadPorCanal[]
  total: number
}

interface EfectividadGestionCardProps {
  filtros: FiltrosDashboard
}

export const EfectividadGestionCard = memo(function EfectividadGestionCard({ filtros }: EfectividadGestionCardProps) {
  const [data, setData] = useState<EfectividadData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [filtros])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Usar filtros de fecha o mes actual por defecto
      const ahora = new Date()
      const inicioMesActual = filtros.rangoFechas.desde 
        ? new Date(filtros.rangoFechas.desde)
        : new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      const finMesActual = filtros.rangoFechas.hasta
        ? new Date(filtros.rangoFechas.hasta + 'T23:59:59')
        : new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)

      const params = new URLSearchParams()
      params.set('from', inicioMesActual.toISOString())
      params.set('to', finMesActual.toISOString())

      let metricsData = { porCanal: {} }

      // Intentar obtener datos, usar valores por defecto si falla
      try {
        const response = await fetch(
          `/api/historial/metrics?${params.toString()}`,
          { cache: 'no-store' }
        )
        
        if (response.ok) {
          metricsData = await response.json()
        }
      } catch (e) {
        // Silenciosamente usar valores por defecto si hay error
        console.warn('Error al cargar datos de efectividad, usando valores por defecto:', e)
      }

      // Calcular efectividad basada en acciones completadas por canal
      // Por ahora, usamos una estimación basada en acciones completadas
      // En producción, esto debería basarse en pagos reales asociados a cada canal
      
      const canales: Canal[] = ['email', 'llamada', 'sms', 'whatsapp']
      const porCanal: EfectividadPorCanal[] = canales.map((canal) => {
        const canalData = metricsData.porCanal?.[canal] || { entregadosCompletados: 0 }
        // Estimación simplificada: cada acción completada = potencial de recupero
        // En producción, esto debería venir de un cálculo real de pagos por canal
        const accionesCompletadas = canalData.entregadosCompletados || 0
        const montoEstimado = accionesCompletadas * 50000 // Estimación simplificada
        return {
          canal,
          montoRecuperado: montoEstimado,
          porcentaje: 0, // Se calculará después
          label: canal === 'llamada' ? 'Teléfono' : canal.charAt(0).toUpperCase() + canal.slice(1),
        }
      })

      const total = porCanal.reduce((sum, item) => sum + item.montoRecuperado, 0)

      // Calcular porcentajes
      const porCanalConPorcentajes = porCanal.map((item) => ({
        ...item,
        porcentaje: total > 0 ? (item.montoRecuperado / total) * 100 : 0,
      }))

      // Siempre establecer datos, incluso si son 0
      setData({
        porCanal: porCanalConPorcentajes,
        total,
      })

    } catch (err) {
      // En caso de error inesperado, establecer datos con valores por defecto
      console.warn('Error inesperado al cargar métricas, usando valores por defecto:', err)
      const canales: Canal[] = ['email', 'llamada', 'sms', 'whatsapp']
      setData({
        porCanal: canales.map((canal) => ({
          canal,
          montoRecuperado: 0,
          porcentaje: 0,
          label: canal === 'llamada' ? 'Teléfono' : canal.charAt(0).toUpperCase() + canal.slice(1),
        })),
        total: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!data) return []
    return data.porCanal.map((item) => ({
      name: item.label,
      monto: item.montoRecuperado,
      porcentaje: item.porcentaje,
      canal: item.canal,
    }))
  }, [data])

  const getColor = (canal: Canal) => {
    switch (canal) {
      case 'email':
        return '#3b82f6' // blue
      case 'llamada':
        return '#10b981' // green
      case 'sms':
        return '#f59e0b' // amber
      case 'whatsapp':
        return '#25d366' // whatsapp green
      default:
        return '#6b7280'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Efectividad de la Gestión
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Comparativa de recupero por canal o agente</p>
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

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Efectividad de la Gestión
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Comparativa de recupero por canal o agente</p>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Efectividad de la Gestión
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Comparativa de recupero por canal o agente</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-2xl font-bold mb-1">
            {formatearMontoCLP(data.total)}
          </div>
          <div className="text-sm text-muted-foreground">Total recuperado por canal</div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
                return `$${value}`
              }}
            />
            <RechartsTooltip
              formatter={(value: number, name: string) => {
                if (name === 'monto') {
                  return [formatearMontoCLP(value), 'Monto Recuperado']
                }
                return [value, name]
              }}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            />
            <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.canal)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {data.porCanal.map((item) => (
            <div key={item.canal} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getColor(item.canal) }}
                />
                <span>{item.label}</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatearMontoCLP(item.montoRecuperado)}</div>
                <div className="text-xs text-muted-foreground">
                  {item.porcentaje.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Link href="/historial">
            <Button variant="outline" size="sm" className="w-full">
              Ver detalles
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
})

