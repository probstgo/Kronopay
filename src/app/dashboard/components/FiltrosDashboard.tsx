'use client'

import { memo } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, DollarSign } from 'lucide-react'
import { parsearMontoCLP, validarMontoCLP, montoParaInput } from '@/lib/formateo'

export interface FiltrosDashboard {
  rangoMonto: {
    min: number | null
    max: number | null
  }
  rangoFechas: {
    desde: string
    hasta: string
  }
}

interface FiltrosDashboardProps {
  filtros: FiltrosDashboard
  onFiltrosCambiados: (filtros: FiltrosDashboard) => void
}

const FiltrosDashboardComponent = ({ filtros, onFiltrosCambiados }: FiltrosDashboardProps) => {
  const handleFiltroChange = <K extends keyof FiltrosDashboard>(
    campo: K,
    valor: FiltrosDashboard[K]
  ) => {
    const nuevosFiltros = { ...filtros, [campo]: valor } as FiltrosDashboard
    onFiltrosCambiados(nuevosFiltros)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Rango de montos */}
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              $ Rango de montos
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Mínimo (ej: 1.000.000)"
                value={filtros.rangoMonto.min ? montoParaInput(filtros.rangoMonto.min) : ''}
                onChange={(e) => {
                  const valor = e.target.value
                  if (!valor) {
                    handleFiltroChange('rangoMonto', { ...filtros.rangoMonto, min: null })
                  } else if (validarMontoCLP(valor)) {
                    handleFiltroChange('rangoMonto', {
                      ...filtros.rangoMonto,
                      min: parsearMontoCLP(valor)
                    })
                  }
                }}
                className="flex-1"
              />
              <Input
                type="text"
                placeholder="Máximo (ej: 5.000.000)"
                value={filtros.rangoMonto.max ? montoParaInput(filtros.rangoMonto.max) : ''}
                onChange={(e) => {
                  const valor = e.target.value
                  if (!valor) {
                    handleFiltroChange('rangoMonto', { ...filtros.rangoMonto, max: null })
                  } else if (validarMontoCLP(valor)) {
                    handleFiltroChange('rangoMonto', {
                      ...filtros.rangoMonto,
                      max: parsearMontoCLP(valor)
                    })
                  }
                }}
                className="flex-1"
              />
            </div>
          </div>

          {/* Rango de fechas */}
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Rango de fechas
            </label>
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="dd/mm/aaaa"
                value={filtros.rangoFechas.desde}
                onChange={(e) =>
                  handleFiltroChange('rangoFechas', {
                    ...filtros.rangoFechas,
                    desde: e.target.value
                  })
                }
                className="flex-1"
              />
              <Input
                type="date"
                placeholder="dd/mm/aaaa"
                value={filtros.rangoFechas.hasta}
                onChange={(e) =>
                  handleFiltroChange('rangoFechas', {
                    ...filtros.rangoFechas,
                    hasta: e.target.value
                  })
                }
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const FiltrosDashboard = memo(FiltrosDashboardComponent)

