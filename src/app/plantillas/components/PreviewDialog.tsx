'use client'

import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Eye } from 'lucide-react'
import { PreviewPlantilla } from './PreviewPlantilla'
import { reemplazarVariables } from '@/lib/plantillaUtils'

interface PreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nombre?: string
  asunto?: string
  tipo: 'email' | 'sms' | 'whatsapp'
  tipoContenido: 'texto' | 'html'
  contenido: string
  variables: Record<string, string>
}

export function PreviewDialog({ open, onOpenChange, nombre, asunto, tipo, tipoContenido, contenido, variables }: PreviewDialogProps) {
  const asuntoProcesado = useMemo(() => {
    return reemplazarVariables(asunto || '', variables)
  }, [asunto, variables])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Vista Previa{nombre ? ` - ${nombre}` : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {tipo === 'email' && asunto != null && asunto !== '' && (
            <div className="mb-2 text-sm"><strong>Asunto:</strong> {asuntoProcesado}</div>
          )}
          <PreviewPlantilla
            tipo={tipo}
            contenido={contenido}
            tipoContenido={tipoContenido}
            variables={variables}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}


