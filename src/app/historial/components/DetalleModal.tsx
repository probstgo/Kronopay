"use client"

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Canal = 'email' | 'llamada' | 'sms' | 'whatsapp'

type Detalle = {
  id: string
  fecha: string
  tipo_accion: Canal
  estado: string
  destino: string
  campana_id: string | null
  detalles: Record<string, unknown> | null
}

export default function DetalleModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [data, setData] = useState<Detalle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function run() {
      if (!id) return
      setLoading(true)
      setError(null)
      setData(null)
      try {
        const res = await fetch(`/api/historial/${id}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('Error obteniendo detalle')
        const json = await res.json() as Detalle
        if (active) setData(json)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Error desconocido'
        if (active) setError(message)
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => { active = false }
  }, [id])

  const open = Boolean(id)

  const renderDetallesEspecificos = () => {
    if (!data?.detalles) return null

    const detalles = data.detalles
    const tipo = data.tipo_accion

    // Campos comunes
    const camposComunes = [
      { label: 'External ID', valor: detalles.external_id },
      { label: 'Plantilla ID', valor: detalles.plantilla_id },
      { label: 'Plantilla Nombre', valor: detalles.plantilla_nombre },
      { label: 'Intento', valor: detalles.intento_n ? `${detalles.intento_n}/${detalles.max_intentos || 'N/A'}` : null },
      { label: 'Origen', valor: detalles.origen },
    ].filter(campo => campo.valor)

    // Campos específicos por tipo
    let camposEspecificos: Array<{ label: string; valor: unknown }> = []

    if (tipo === 'email') {
      camposEspecificos = [
        { label: 'Asunto', valor: detalles.asunto },
        { label: 'Delivered At', valor: detalles.delivered_at },
        { label: 'Opened At', valor: detalles.opened_at },
        { label: 'Clicked At', valor: detalles.clicked_at },
        { label: 'Bounce Code', valor: detalles.bounce_code },
        { label: 'Error Message', valor: detalles.error_message },
      ].filter(campo => campo.valor)
    } else if (tipo === 'llamada') {
      camposEspecificos = [
        { label: 'Duración (s)', valor: detalles.duracion },
        { label: 'Costo', valor: detalles.costo },
        { label: 'Motivo Fin', valor: detalles.motivo_fin },
        { label: 'Conversation ID', valor: detalles.conversation_id },
        { label: 'Agente Nombre', valor: detalles.agente_nombre },
      ].filter(campo => campo.valor)
    } else if (tipo === 'sms' || tipo === 'whatsapp') {
      camposEspecificos = [
        { label: 'Message Status', valor: detalles.message_status },
        { label: 'Error Code', valor: detalles.error_code },
        { label: 'Error Message', valor: detalles.error_message },
        { label: 'Preview', valor: detalles.preview },
      ].filter(campo => campo.valor)
    }

    return (
      <div className="space-y-4">
        {camposComunes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {camposComunes.map((campo, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{campo.label}:</span>
                  <span className="font-mono text-xs">{String(campo.valor)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {camposEspecificos.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Detalles de {tipo.charAt(0).toUpperCase() + tipo.slice(1)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {camposEspecificos.map((campo, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{campo.label}:</span>
                  <span className="font-mono text-xs">{String(campo.valor)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalle de Acción
            {data && (
              <Badge variant="outline" className="capitalize">
                {data.tipo_accion}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {!id ? null : loading ? (
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : !data ? null : (
          <div className="space-y-4">
            {/* Información básica */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Información Básica</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fecha: </span>
                    <span>{new Date(data.fecha).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado: </span>
                    <Badge variant={data.estado === 'fallido' ? 'destructive' : 
                               data.estado === 'completado' || data.estado === 'entregado' ? 'default' : 
                               'secondary'}>
                      {data.estado}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Destino: </span>
                    <span className="font-mono">{data.destino}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Campaña: </span>
                    <span>{data.campana_id || '-'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detalles específicos */}
            {renderDetallesEspecificos()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


