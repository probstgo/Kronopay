'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle, Info } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatearMontoCLP } from '@/lib/formateo'
import Link from 'next/link'
import type { AgingBucket, FiltrosDashboard } from '../types'

interface AgingData {
  buckets: AgingBucket[]
  total: number
}

interface SaludCarteraCardProps {
  filtros: FiltrosDashboard
}

export const SaludCarteraCard = memo(function SaludCarteraCard({ filtros }: SaludCarteraCardProps) {
  const [data, setData] = useState<AgingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [filtros])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filtros.rangoMonto.min !== null) {
        params.set('montoMin', filtros.rangoMonto.min.toString())
      }
      if (filtros.rangoMonto.max !== null) {
        params.set('montoMax', filtros.rangoMonto.max.toString())
      }

      const queryString = params.toString()
      const url = queryString ? `/api/deudores/aging?${queryString}` : '/api/deudores/aging'
      const response = await fetch(url, { cache: 'no-store' })
      
      if (!response.ok) {
        throw new Error('Error al cargar datos de aging')
      }

      const agingData = await response.json()
      setData(agingData)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    if (!data) return []
    return data.buckets.map((bucket) => ({
      name: bucket.label,
      monto: bucket.monto,
      rango: bucket.rango,
    }))
  }, [data])

  const getColor = (rango: string) => {
    switch (rango) {
      case '0-30':
        return '#22c55e' // green
      case '31-60':
        return '#eab308' // yellow
      case '61-90':
        return '#f97316' // orange
      case '+90':
        return '#ef4444' // red
      default:
        return '#6b7280'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Salud de Cartera
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Distribución de la deuda por antigüedad</p>
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Salud de Cartera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchData} variant="outline" size="sm">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Salud de Cartera</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">No hay deudas pendientes</p>
          <Link href="/deudores">
            <Button variant="outline" size="sm">
              Ver Deudores
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Salud de Cartera
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Distribución de la deuda por antigüedad</p>
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
          <div className="text-sm text-muted-foreground">Total deuda pendiente</div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
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
              formatter={(value: number) => formatearMontoCLP(value)}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            />
            <Bar dataKey="monto" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.rango)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {data.buckets.map((bucket) => {
            const porcentaje = data.total > 0 ? (bucket.monto / data.total) * 100 : 0
            return (
              <div key={bucket.rango} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getColor(bucket.rango) }}
                  />
                  <span>{bucket.label}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatearMontoCLP(bucket.monto)}</div>
                  <div className="text-xs text-muted-foreground">
                    {porcentaje.toFixed(1)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Link href="/deudores">
            <Button variant="outline" size="sm" className="w-full">
              Ver detalles
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
})

