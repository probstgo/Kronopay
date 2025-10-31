'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Protected from '@/components/Protected'
import { MontoRecuperadoCard } from './components/MontoRecuperadoCard'
import { TasaRecuperoCard } from './components/TasaRecuperoCard'
import { SaludCarteraCard } from './components/SaludCarteraCard'
import { EfectividadGestionCard } from './components/EfectividadGestionCard'
import { ContactabilidadCard } from './components/ContactabilidadCard'
import { UsoPlanCostosCard } from './components/UsoPlanCostosCard'
import { FiltrosDashboard } from './components/FiltrosDashboard'
import type { FiltrosDashboard as FiltrosDashboardType } from './types'

function parseDate(value: string | null): string {
  if (!value) return ''
  return value
}

function parseNumber(value: string | null): number | null {
  if (!value) return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Inicializar filtros desde URL o valores por defecto
  const [filtros, setFiltros] = useState<FiltrosDashboardType>(() => {
    const desde = searchParams.get('desde') || ''
    const hasta = searchParams.get('hasta') || ''
    const montoMin = parseNumber(searchParams.get('montoMin'))
    const montoMax = parseNumber(searchParams.get('montoMax'))

    return {
      rangoFechas: {
        desde: parseDate(desde),
        hasta: parseDate(hasta),
      },
      rangoMonto: {
        min: montoMin,
        max: montoMax,
      },
    }
  })

  // Sincronizar filtros con URL
  useEffect(() => {
    const params = new URLSearchParams()

    if (filtros.rangoFechas.desde) {
      params.set('desde', filtros.rangoFechas.desde)
    }
    if (filtros.rangoFechas.hasta) {
      params.set('hasta', filtros.rangoFechas.hasta)
    }
    if (filtros.rangoMonto.min !== null) {
      params.set('montoMin', filtros.rangoMonto.min.toString())
    }
    if (filtros.rangoMonto.max !== null) {
      params.set('montoMax', filtros.rangoMonto.max.toString())
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '/dashboard'
    router.replace(newUrl, { scroll: false })
  }, [filtros, router])

  const handleFiltrosCambiados = useCallback((nuevosFiltros: FiltrosDashboardType) => {
    setFiltros(nuevosFiltros)
  }, [])

  return (
    <Protected>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Vista ejecutiva de resultados financieros y salud de cartera
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <FiltrosDashboard filtros={filtros} onFiltrosCambiados={handleFiltrosCambiados} />
        </div>

        {/* 👑 Fila 1: KPIs Principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <MontoRecuperadoCard filtros={filtros} />
          <TasaRecuperoCard filtros={filtros} />
        </div>

        {/* 📊 Fila 2: Salud de Cartera y Efectividad */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SaludCarteraCard filtros={filtros} />
          <EfectividadGestionCard filtros={filtros} />
        </div>

        {/* ⚙️ Fila 3: Operaciones y Costos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContactabilidadCard filtros={filtros} />
          <UsoPlanCostosCard />
        </div>
      </div>
    </Protected>
  )
}
