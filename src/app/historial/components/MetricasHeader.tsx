"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type Canal = 'email' | 'llamada' | 'sms' | 'whatsapp'

type Metricas = {
  totales: { enviados: number; entregadosCompletados: number; fallidos: number }
  porCanal: Record<Canal, { enviados: number; entregadosCompletados: number; fallidos: number }>
  duracionLlamadasSegundos: number
} | null

export default function MetricasHeader({ metricas, loading }: { metricas: Metricas; loading: boolean }) {
  if (loading && !metricas) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Card>
        <CardContent className="py-4">
          <div className="text-sm text-muted-foreground">Enviados</div>
          <div className="text-2xl font-semibold">{metricas?.totales.enviados ?? 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4">
          <div className="text-sm text-muted-foreground">Entregados/Completados</div>
          <div className="text-2xl font-semibold">{metricas?.totales.entregadosCompletados ?? 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4">
          <div className="text-sm text-muted-foreground">Fallidos</div>
          <div className="text-2xl font-semibold">{metricas?.totales.fallidos ?? 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4">
          <div className="text-sm text-muted-foreground">Duración llamadas (s)</div>
          <div className="text-2xl font-semibold">{metricas?.duracionLlamadasSegundos ?? 0}</div>
        </CardContent>
      </Card>
    </div>
  )
}


