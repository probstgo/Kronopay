'use client';

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface HeaderHistorialProps {
  onExportClick?: () => void
}

export function HeaderHistorial({ onExportClick }: HeaderHistorialProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-2xl font-bold">Historial</h2>
        <p className="text-gray-500">Revisa el historial de acciones de cobranza</p>
      </div>
      {onExportClick && (
        <Button
          onClick={onExportClick}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      )}
    </div>
  );
}
