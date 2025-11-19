'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type TipoEvento = 'deuda_creada' | 'dias_antes_vencimiento' | 'dia_vencimiento' | 'dias_despues_vencimiento' | 'pago_registrado'

export interface EventTimingConfig {
  tipo_evento?: TipoEvento
  dias_relativos?: number | null
}

const eventosConfiguracion: Array<{ value: TipoEvento; label: string }> = [
  { value: 'deuda_creada', label: 'Cuando se crea la deuda' },
  { value: 'dias_antes_vencimiento', label: 'X días antes del vencimiento' },
  { value: 'dia_vencimiento', label: 'El día del vencimiento' },
  { value: 'dias_despues_vencimiento', label: 'X días después del vencimiento' },
  { value: 'pago_registrado', label: 'Cuando se registra un pago' }
]

export const requiereDiasRelativos = (tipo?: TipoEvento): boolean => {
  return tipo === 'dias_antes_vencimiento' || tipo === 'dias_despues_vencimiento'
}

interface EventTimingSelectorProps {
  value: EventTimingConfig
  onChange: (config: EventTimingConfig) => void
  error?: string | null
}

export function EventTimingSelector({ value, onChange, error }: EventTimingSelectorProps) {
  const tipoActual = value.tipo_evento || 'deuda_creada'
  const diasActuales = value.dias_relativos ?? null
  const mostrarInputDias = requiereDiasRelativos(tipoActual)
  const esDiaVencimiento = tipoActual === 'dia_vencimiento'

  const handleTipoChange = (nuevoTipo: TipoEvento) => {
    let dias: number | null = null
    if (nuevoTipo === 'dia_vencimiento') {
      dias = 0
    } else if (requiereDiasRelativos(nuevoTipo)) {
      dias = diasActuales
    }

    onChange({
      tipo_evento: nuevoTipo,
      dias_relativos: dias
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium text-gray-700">Cuándo enviar</Label>
        <Select value={tipoActual} onValueChange={(value) => handleTipoChange(value as TipoEvento)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona un evento" />
          </SelectTrigger>
          <SelectContent>
            {eventosConfiguracion.map((evento) => (
              <SelectItem key={evento.value} value={evento.value}>
                {evento.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mostrarInputDias && (
        <div>
          <Label className="text-sm font-medium text-gray-700">Días relativos</Label>
          <Input
            type="number"
            min={0}
            value={diasActuales !== null ? diasActuales : ''}
            onChange={(e) =>
              onChange({
                tipo_evento: tipoActual,
                dias_relativos: e.target.value ? Number(e.target.value) : null
              })
            }
            placeholder="Ej: 15"
          />
        </div>
      )}

      {esDiaVencimiento && (
        <div>
          <Label className="text-sm font-medium text-gray-700">Días relativos</Label>
          <Input type="number" value="0" disabled />
          <p className="text-xs text-gray-500 mt-1">Se ejecuta exactamente el día del vencimiento.</p>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

