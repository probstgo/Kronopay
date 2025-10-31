'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { MiniKpiCard } from './MiniKpiCard'
import { Phone, Mail, CheckCircle, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import type { FiltrosDashboard } from '../types'

interface ContactabilidadData {
  intentosTotales: number
  contactosEfectivos: number
  tasaContacto: number
  llamadasHoy: number
}

interface ContactabilidadCardProps {
  filtros: FiltrosDashboard
}

export function ContactabilidadCard({ filtros }: ContactabilidadCardProps) {
  const [data, setData] = useState<ContactabilidadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    
    // Auto-refresh cada 60 segundos (opcional)
    const interval = setInterval(() => {
      fetchData()
    }, 60000)

    return () => clearInterval(interval)
  }, [filtros])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Usar filtros de fecha o fecha de hoy por defecto
      const desde = filtros.rangoFechas.desde
        ? new Date(filtros.rangoFechas.desde)
        : (() => {
            const hoy = new Date()
            hoy.setHours(0, 0, 0, 0)
            return hoy
          })()
      const hasta = filtros.rangoFechas.hasta
        ? new Date(filtros.rangoFechas.hasta + 'T23:59:59')
        : (() => {
            const finHoy = new Date()
            finHoy.setHours(23, 59, 59, 999)
            return finHoy
          })()

      // Fetch en paralelo
      const params = new URLSearchParams()
      params.set('from', desde.toISOString())
      params.set('to', hasta.toISOString())

      const [metricsRes, llamadasRes] = await Promise.all([
        fetch(`/api/historial/metrics?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/telefono/llamadas/stats', { cache: 'no-store' })
      ])

      if (!metricsRes.ok) {
        throw new Error('Error al cargar métricas de historial')
      }
      if (!llamadasRes.ok) {
        throw new Error('Error al cargar estadísticas de llamadas')
      }

      const metricsData = await metricsRes.json()
      const llamadasData = await llamadasRes.json()

      // Calcular métricas de contactabilidad
      const intentosTotales = metricsData.totales?.enviados || 0
      const contactosEfectivos = metricsData.totales?.entregadosCompletados || 0
      const tasaContacto = intentosTotales > 0 
        ? (contactosEfectivos / intentosTotales) * 100 
        : 0
      const llamadasHoy = llamadasData.hoy || 0

      setData({
        intentosTotales,
        contactosEfectivos,
        tasaContacto,
        llamadasHoy,
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Contactabilidad (Hoy)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Métricas de Contactabilidad
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
          <CardTitle>Métricas de Contactabilidad</CardTitle>
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
        <CardTitle>Métricas de Contactabilidad (Hoy)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <MiniKpiCard
            title="Intentos Totales"
            value={data.intentosTotales}
            icon={Mail}
            loading={loading}
          />
          <MiniKpiCard
            title="Contactos Efectivos"
            value={data.contactosEfectivos}
            icon={CheckCircle}
            loading={loading}
          />
          <MiniKpiCard
            title="Tasa de Contacto"
            value={`${data.tasaContacto.toFixed(1)}%`}
            subtitle={`${data.contactosEfectivos} de ${data.intentosTotales}`}
            icon={TrendingUp}
            loading={loading}
          />
          <MiniKpiCard
            title="Llamadas Hoy"
            value={data.llamadasHoy}
            icon={Phone}
            loading={loading}
          />
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex gap-2">
            <Link href="/historial" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Ver Historial
              </Button>
            </Link>
            <Link href="/telefono" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Ver Teléfono
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

