"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { downloadCSV } from '@/lib/csvUtils'

import { Separator } from '@/components/ui/separator'

import FiltrosHistorial from './FiltrosHistorial'
import MetricasHeader from './MetricasHeader'
import HistorialTable from './HistorialTable'
import DetalleModal from './DetalleModal'
import ExportarHistorialModal from './ExportarHistorialModal'

type Canal = 'email' | 'llamada' | 'sms' | 'whatsapp'
type Estado = 'iniciado' | 'entregado' | 'completado' | 'fallido' | string

type HistorialItem = {
  id: string
  fecha: string
  tipo_accion: Canal
  estado: Estado
  destino: string
  rut: string
  campana_id: string | null
  campana_nombre: string | null
  origen: string | null
}

type ListadoResponse = {
  items: HistorialItem[]
  page: number
  size: number
  total: number
}

type MetricasResponse = {
  totales: { enviados: number; entregadosCompletados: number; fallidos: number }
  porCanal: Record<Canal, { enviados: number; entregadosCompletados: number; fallidos: number }>
  duracionLlamadasSegundos: number
}

interface HistorialAppProps {
  exportModalOpen?: boolean
  onExportModalChange?: (open: boolean) => void
}

export default function HistorialApp({ exportModalOpen: externalExportModalOpen, onExportModalChange }: HistorialAppProps = {} as HistorialAppProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [listado, setListado] = useState<ListadoResponse | null>(null)
  const [metricas, setMetricas] = useState<MetricasResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [internalExportModalOpen, setInternalExportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Usar el estado externo si se proporciona, sino usar el interno
  const exportModalOpen = externalExportModalOpen !== undefined ? externalExportModalOpen : internalExportModalOpen
  const setExportModalOpen = onExportModalChange || setInternalExportModalOpen

  const paramsObj = useMemo(() => {
    const obj: Record<string, string> = {}
    searchParams.forEach((v, k) => {
      if (v !== '') obj[k] = v
    })
    return obj
  }, [searchParams])

  const updateParam = useCallback((key: string, value: string | null) => {
    const sp = new URLSearchParams(paramsObj)
    if (value === null || value === '') sp.delete(key)
    else sp.set(key, value)
    // reset page al cambiar filtros
    if (key !== 'page') sp.delete('page')
    router.replace(`${pathname}?${sp.toString()}`)
  }, [paramsObj, pathname, router])

  const debounceRef = useRef<number | null>(null)
  const debouncedUpdateParam = useCallback((key: string, value: string | null) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => {
      updateParam(key, value)
    }, 400)
  }, [updateParam])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = searchParams.toString()
      const [listadoRes, metricasRes] = await Promise.all([
        fetch(`/api/historial?${qs}`, { cache: 'no-store' }),
        fetch(`/api/historial/metrics?${qs}`, { cache: 'no-store' })
      ])

      if (!listadoRes.ok) throw new Error('Error obteniendo historial')
      if (!metricasRes.ok) throw new Error('Error obteniendo métricas')

      const listadoJson = await listadoRes.json() as ListadoResponse
      const metricasJson = await metricasRes.json() as MetricasResponse
      setListado(listadoJson)
      setMetricas(metricasJson)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error desconocido'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleExportCSV = useCallback(async (fechaDesde: string, fechaHasta: string) => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (fechaDesde) {
        // Convertir fecha a formato datetime-local para la API
        const desdeDate = new Date(fechaDesde)
        desdeDate.setHours(0, 0, 0, 0)
        params.set('from', desdeDate.toISOString())
      }
      if (fechaHasta) {
        // Convertir fecha a formato datetime-local para la API (fin del día)
        const hastaDate = new Date(fechaHasta)
        hastaDate.setHours(23, 59, 59, 999)
        params.set('to', hastaDate.toISOString())
      }
      params.set('export', 'true')

      const response = await fetch(`/api/historial?${params.toString()}`, { cache: 'no-store' })
      
      if (!response.ok) {
        throw new Error('Error al obtener los datos para exportar')
      }

      const data = await response.json() as ListadoResponse

      if (!data.items || data.items.length === 0) {
        toast.warning('No hay datos para exportar en el rango de fechas seleccionado')
        return
      }

      // Convertir datos a CSV
      const headers = ['Fecha', 'Canal', 'Estado', 'RUT', 'Destino', 'Campaña', 'Origen']
      const rows = data.items.map((item: HistorialItem) => [
        new Date(item.fecha).toLocaleString('es-CL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        item.tipo_accion,
        item.estado,
        item.rut,
        item.destino,
        item.campana_nombre || item.campana_id || '-',
        item.origen || '-',
      ])

      // Escapar comillas y crear CSV
      const escapeCSV = (value: string) => {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => escapeCSV(String(cell))).join(','))
      ].join('\n')

      // Generar nombre de archivo
      const fechaDesdeStr = fechaDesde || 'inicio'
      const fechaHastaStr = fechaHasta || 'fin'
      const filename = `historial_${fechaDesdeStr}_${fechaHastaStr}.csv`

      downloadCSV(csvContent, filename)
      toast.success(`Exportación completada: ${data.items.length} registros exportados`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al exportar'
      toast.error(message)
      console.error('Error al exportar CSV:', err)
    } finally {
      setIsExporting(false)
    }
  }, [])

  return (
    <div className="space-y-4">
      <FiltrosHistorial
        valores={{
          from: searchParams.get('from') || '',
          to: searchParams.get('to') || '',
          canal: (searchParams.get('canal') as Canal) || '',
          estado: searchParams.get('estado') || '',
          campanaId: searchParams.get('campanaId') || '',
          q: searchParams.get('q') || '',
          modoPrueba: searchParams.get('modoPrueba') || '',
        }}
        onChange={(key, value, debounced) => {
          if (debounced) debouncedUpdateParam(key, value)
          else updateParam(key, value)
        }}
        limpiarfiltros={() => {
          router.replace(pathname)
        }}
      />

      <Separator />

      <MetricasHeader metricas={metricas} loading={loading} />

      <HistorialTable
        data={listado?.items || []}
        page={listado?.page || 1}
        size={listado?.size || 25}
        total={listado?.total || 0}
        loading={loading}
        error={error}
        onPageChange={(p) => updateParam('page', String(p))}
        onSizeChange={(s) => updateParam('size', String(s))}
        onVerDetalle={(id) => setDetalleId(id)}
      />

      <DetalleModal id={detalleId} onClose={() => setDetalleId(null)} />

      <ExportarHistorialModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        onExport={handleExportCSV}
        isExporting={isExporting}
      />
    </div>
  )
}


