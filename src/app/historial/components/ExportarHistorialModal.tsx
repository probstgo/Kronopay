"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar, AlertCircle } from 'lucide-react'

interface ExportarHistorialModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (fechaDesde: string, fechaHasta: string) => Promise<void>
  isExporting?: boolean
}

export default function ExportarHistorialModal({
  open,
  onOpenChange,
  onExport,
  isExporting = false,
}: ExportarHistorialModalProps) {
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setError(null)

    // Validar que al menos una fecha esté seleccionada
    if (!fechaDesde && !fechaHasta) {
      setError('Debes seleccionar al menos una fecha')
      return
    }

    // Validar que si ambas fechas están seleccionadas, desde <= hasta
    if (fechaDesde && fechaHasta) {
      const desde = new Date(fechaDesde)
      const hasta = new Date(fechaHasta)
      if (desde > hasta) {
        setError('La fecha &quot;desde&quot; debe ser anterior o igual a la fecha &quot;hasta&quot;')
        return
      }
    }

    try {
      await onExport(fechaDesde, fechaHasta)
      // Limpiar formulario después de exportar exitosamente
      setFechaDesde('')
      setFechaHasta('')
      onOpenChange(false)
    } catch {
      // El error ya se maneja en la función onExport
    }
  }

  const handleClose = () => {
    if (!isExporting) {
      setFechaDesde('')
      setFechaHasta('')
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exportar Historial a CSV</DialogTitle>
          <DialogDescription>
            Selecciona el rango de fechas para exportar todos los registros del historial
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fecha-desde" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fecha desde
            </Label>
            <Input
              id="fecha-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value)
                setError(null)
              }}
              disabled={isExporting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha-hasta" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fecha hasta
            </Label>
            <Input
              id="fecha-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value)
                setError(null)
              }}
              disabled={isExporting}
              min={fechaDesde || undefined}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="text-sm text-gray-500">
            <p>• Si solo seleccionas &quot;desde&quot;, se exportarán todos los registros desde esa fecha</p>
            <p>• Si solo seleccionas &quot;hasta&quot;, se exportarán todos los registros hasta esa fecha</p>
            <p>• Si seleccionas ambas, se exportarán los registros en ese rango</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || (!fechaDesde && !fechaHasta)}
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exportando...
              </>
            ) : (
              'Exportar CSV'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

