'use client'

import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Eye } from 'lucide-react'
import { PreviewPlantilla } from './PreviewPlantilla'
import { reemplazarVariables } from '@/lib/plantillaUtils'

type VariablesSistema = {
  nombre: string
  monto: string
  fecha_vencimiento: string
  empresa: string
  telefono: string
  email: string
}

interface PreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nombre?: string
  asunto?: string
  tipo: 'email' | 'sms' | 'whatsapp'
  tipoContenido: 'texto' | 'html'
  contenido: string
  variables?: Partial<VariablesSistema>
}

export function PreviewDialog({ open, onOpenChange, nombre, asunto, tipo, tipoContenido, contenido, variables }: PreviewDialogProps) {
  const asuntoProcesado = useMemo(() => {
    const vars: Record<string, string> = {
      nombre: variables?.nombre ?? 'Juan Pérez',
      monto: variables?.monto ?? '$150.000',
      fecha_vencimiento: variables?.fecha_vencimiento ?? '15 de enero, 2025',
      empresa: variables?.empresa ?? 'Mi Empresa',
      telefono: variables?.telefono ?? '+56912345678',
      email: variables?.email ?? 'contacto@miempresa.com'
    }
    return reemplazarVariables(asunto || '', vars)
  }, [asunto, variables])

  const variablesCompletas: VariablesSistema = useMemo(() => ({
    nombre: variables?.nombre ?? 'Juan Pérez',
    monto: variables?.monto ?? '$150.000',
    fecha_vencimiento: variables?.fecha_vencimiento ?? '15 de enero, 2025',
    empresa: variables?.empresa ?? 'Mi Empresa',
    telefono: variables?.telefono ?? '+56912345678',
    email: variables?.email ?? 'contacto@miempresa.com'
  }), [variables])

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
            variables={variablesCompletas}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}


