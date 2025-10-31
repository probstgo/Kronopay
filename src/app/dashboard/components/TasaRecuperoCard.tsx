'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, AlertCircle, Info } from 'lucide-react'
import Link from 'next/link'
import type { FiltrosDashboard } from '../types'

interface TasaRecuperoData {
  tasaRecupero: number
  tasaRecuperoMesAnterior: number
  montoAsignadoTotal: number
}

interface TasaRecuperoCardProps {
  filtros: FiltrosDashboard
}

export const TasaRecuperoCard = memo(function TasaRecuperoCard({ filtros }: TasaRecuperoCardProps) {
  const [data, setData] = useState<TasaRecuperoData | null>(null)
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
        tasaRecupero: recuperosData.tasaRecupero || 0,
        tasaRecuperoMesAnterior: recuperosData.tasaRecuperoMesAnterior || 0,
        montoAsignadoTotal: recuperosData.montoAsignadoTotal || 0,
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const tendencia = useMemo(() => {
    if (!data) return null
    if (data.tasaRecuperoMesAnterior === 0) return null
    return data.tasaRecupero - data.tasaRecuperoMesAnterior
  }, [data])

  const saludColor = useMemo(() => {
    if (!data) return 'bg-gray-100 text-gray-800'
    if (data.tasaRecupero >= 70) return 'bg-green-100 text-green-800'
    if (data.tasaRecupero >= 50) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }, [data])

  const saludLabel = useMemo(() => {
    if (!data) return 'N/A'
    if (data.tasaRecupero >= 70) return 'Excelente'
    if (data.tasaRecupero >= 50) return 'Regular'
    return 'Bajo'
  }, [data])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Tasa de Recupero
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Porcentaje de dinero recuperado sobre el monto asignado</p>
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
            Tasa de Recupero
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
          <CardTitle>Tasa de Recupero</CardTitle>
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
          Tasa de Recupero
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Porcentaje de dinero recuperado sobre el monto asignado</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mb-2">
          <div className="text-4xl font-bold">
            {data.tasaRecupero.toFixed(1)}%
          </div>
          <Badge className={saludColor}>
            {saludLabel}
          </Badge>
        </div>
        
        {tendencia !== null && (
          <div className="flex items-center gap-2 text-sm mb-2">
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

        {data.tasaRecuperoMesAnterior > 0 && (
          <div className="text-xs text-muted-foreground">
            Mes anterior: {data.tasaRecuperoMesAnterior.toFixed(1)}%
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

