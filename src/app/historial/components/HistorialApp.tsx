"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Separator } from '@/components/ui/separator'

import FiltrosHistorial from './FiltrosHistorial'
import MetricasHeader from './MetricasHeader'
import HistorialTable from './HistorialTable'
import DetalleModal from './DetalleModal'

type Canal = 'email' | 'llamada' | 'sms' | 'whatsapp'
type Estado = 'iniciado' | 'entregado' | 'completado' | 'fallido' | string

type HistorialItem = {
  id: string
  fecha: string
  tipo_accion: Canal
  estado: Estado
  destino: string
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

export default function HistorialApp() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [listado, setListado] = useState<ListadoResponse | null>(null)
  const [metricas, setMetricas] = useState<MetricasResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detalleId, setDetalleId] = useState<string | null>(null)

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
    </div>
  )
}


