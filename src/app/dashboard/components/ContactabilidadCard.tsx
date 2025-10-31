'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

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

      // Valores por defecto
      let metricsData = { totales: { enviados: 0, entregadosCompletados: 0, fallidos: 0 } }
      let llamadasData = { hoy: 0, esta_semana: 0, duracion_promedio: 0, tasa_exito: 0 }

      // Intentar obtener métricas de historial - nunca mostrar error, usar valores por defecto si falla
      try {
        if (metricsRes.ok) {
          const parsed = await metricsRes.json()
          metricsData = parsed
        }
      } catch (e) {
        // Silenciosamente usar valores por defecto si hay error
        console.warn('Error al cargar métricas de historial, usando valores por defecto:', e)
      }

      // Intentar obtener estadísticas de llamadas - nunca mostrar error, usar valores por defecto si falla
      try {
        if (llamadasRes.ok) {
          const parsed = await llamadasRes.json()
          llamadasData = parsed
        }
      } catch (e) {
        // Silenciosamente usar valores por defecto si hay error
        console.warn('Error al cargar estadísticas de llamadas, usando valores por defecto:', e)
      }

      // Calcular métricas de contactabilidad
      const intentosTotales = metricsData.totales?.enviados || 0
      const contactosEfectivos = metricsData.totales?.entregadosCompletados || 0
      const tasaContacto = intentosTotales > 0 
        ? (contactosEfectivos / intentosTotales) * 100 
        : 0
      const llamadasHoy = llamadasData.hoy || 0

      // Siempre establecer datos, nunca mostrar error
      setData({
        intentosTotales,
        contactosEfectivos,
        tasaContacto,
        llamadasHoy,
      })

    } catch (err) {
      // En caso de error inesperado, establecer datos con valores por defecto en lugar de error
      console.warn('Error inesperado al cargar métricas, usando valores por defecto:', err)
      setData({
        intentosTotales: 0,
        contactosEfectivos: 0,
        tasaContacto: 0,
        llamadasHoy: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => {
    fetchData()
    
    // Auto-refresh cada 60 segundos (opcional)
    const interval = setInterval(() => {
      fetchData()
    }, 60000)

    return () => clearInterval(interval)
  }, [fetchData])

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Contactabilidad</CardTitle>
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

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Contactabilidad</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas de Contactabilidad</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <MiniKpiCard
            title="Intentos Totales"
            value={data.intentosTotales}
            icon={Mail}
            loading={loading}
            iconColor="text-blue-600"
          />
          <MiniKpiCard
            title="Contactos Efectivos"
            value={data.contactosEfectivos}
            icon={CheckCircle}
            loading={loading}
            iconColor="text-green-600"
          />
          <MiniKpiCard
            title="Tasa de Contacto"
            value={`${data.tasaContacto.toFixed(1)}%`}
            subtitle={`${data.contactosEfectivos} de ${data.intentosTotales}`}
            icon={TrendingUp}
            loading={loading}
            iconColor="text-purple-600"
          />
          <MiniKpiCard
            title="Llamadas Hoy"
            value={data.llamadasHoy}
            icon={Phone}
            loading={loading}
            iconColor="text-orange-600"
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

