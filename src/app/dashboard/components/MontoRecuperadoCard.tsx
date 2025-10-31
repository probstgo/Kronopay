'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, AlertCircle, Info } from 'lucide-react'
import { formatearMontoCLP } from '@/lib/formateo'
import Link from 'next/link'
import type { FiltrosDashboard } from '../types'

interface RecuperosData {
  montoRecuperadoMes: number
  montoRecuperadoMesAnterior: number
}

interface MontoRecuperadoCardProps {
  filtros: FiltrosDashboard
}

export const MontoRecuperadoCard = memo(function MontoRecuperadoCard({ filtros }: MontoRecuperadoCardProps) {
  const [data, setData] = useState<RecuperosData | null>(null)
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
      if (filtros.rangoFechas.desde) {
        params.set('from', filtros.rangoFechas.desde)
      }
      if (filtros.rangoFechas.hasta) {
        params.set('to', filtros.rangoFechas.hasta)
      }
      if (filtros.rangoMonto.min !== null) {
        params.set('montoMin', filtros.rangoMonto.min.toString())
      }
      if (filtros.rangoMonto.max !== null) {
        params.set('montoMax', filtros.rangoMonto.max.toString())
      }

      const queryString = params.toString()
      const url = queryString ? `/api/recuperos/metrics?${queryString}` : '/api/recuperos/metrics'
      const response = await fetch(url, { cache: 'no-store' })
      
      if (!response.ok) {
        throw new Error('Error al cargar datos de recuperos')
      }

      const recuperosData = await response.json()
      
      setData({
        montoRecuperadoMes: recuperosData.montoRecuperadoMes || 0,
        montoRecuperadoMesAnterior: recuperosData.montoRecuperadoMesAnterior || 0,
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const tendencia = useMemo(() => {
    if (!data) return null
    if (data.montoRecuperadoMesAnterior === 0) return null
    const cambio = ((data.montoRecuperadoMes - data.montoRecuperadoMesAnterior) / data.montoRecuperadoMesAnterior) * 100
    return cambio
  }, [data])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Monto Recuperado
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total de dinero recuperado en el mes actual</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-32 mb-4" />
          <Skeleton className="h-4 w-24" />
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
            Monto Recuperado
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

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monto Recuperado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">No se pudieron cargar los datos</p>
          <Link href="/historial">
            <Button variant="outline" size="sm">
              Ver Historial
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
          Monto Recuperado
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Total de dinero recuperado en el mes actual</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mb-2">
          <div className="text-4xl font-bold text-green-600">
            {formatearMontoCLP(data.montoRecuperadoMes)}
          </div>
        </div>
        
        {tendencia !== null && (
          <div className="flex items-center gap-2 text-sm">
            {tendencia > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-green-600">
                  +{tendencia.toFixed(1)}% vs mes anterior
                </span>
              </>
            ) : tendencia < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-red-600">
                  {tendencia.toFixed(1)}% vs mes anterior
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Sin cambio vs mes anterior</span>
            )}
          </div>
        )}

        {data.montoRecuperadoMesAnterior > 0 && (
          <div className="text-xs text-muted-foreground mt-2">
            Mes anterior: {formatearMontoCLP(data.montoRecuperadoMesAnterior)}
          </div>
        )}

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

