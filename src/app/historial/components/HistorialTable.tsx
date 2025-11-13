"use client"

import { useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

type HistorialItem = {
  id: string
  fecha: string
  tipo_accion: 'email' | 'llamada' | 'sms' | 'whatsapp'
  estado: string
  destino: string
  campana_id: string | null
  campana_nombre: string | null
  origen: string | null
}

export default function HistorialTable({
  data,
  page,
  size,
  total,
  loading,
  error,
  onPageChange,
  onSizeChange,
  onVerDetalle,
}: {
  data: HistorialItem[]
  page: number
  size: number
  total: number
  loading: boolean
  error: string | null
  onPageChange: (p: number) => void
  onSizeChange: (s: number) => void
  onVerDetalle: (id: string) => void
}) {
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, size))), [total, size])

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Tabla de historial */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 py-3">Fecha</TableHead>
                  <TableHead className="px-4 py-3">Canal</TableHead>
                  <TableHead className="px-4 py-3">Estado</TableHead>
                  <TableHead className="px-4 py-3">Destino</TableHead>
                  <TableHead className="px-4 py-3">Campaña</TableHead>
                  <TableHead className="px-4 py-3">Origen</TableHead>
                  <TableHead className="px-4 py-3">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && data.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12 px-4">
                      No hay datos
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="px-4 py-3 font-medium">
                        {new Date(row.fecha).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">
                          {row.tipo_accion}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant={row.estado === 'fallido' ? 'destructive' : 
                                   row.estado === 'completado' || row.estado === 'entregado' ? 'default' : 
                                   'secondary'}>
                          {row.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-sm">
                        {row.destino}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                        {row.campana_nombre || row.campana_id || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                        {row.origen || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onVerDetalle(row.id)}
                        >
                          Ver detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginación */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm text-gray-500">
          Mostrando {total > 0 ? ((page - 1) * size) + 1 : 0} a {Math.min(page * size, total)} de {total} resultados
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(size)} onValueChange={(v) => onSizeChange(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((s) => (
                <SelectItem key={s} value={String(s)}>{s} / pág</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


