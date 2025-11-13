'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Deuda } from '@/lib/database';
import { Trash2, AlertTriangle } from 'lucide-react';
import { formatearMonto } from '@/lib/database';

// Tipo para deuda con información del deudor
interface DeudaConDeudor extends Deuda {
  deudor: {
    id: string;
    nombre: string;
    rut: string;
    email?: string;
    telefono?: string;
  };
}

interface ConfirmarEliminacionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deuda: DeudaConDeudor | null;
  isLoading?: boolean;
}

export function ConfirmarEliminacion({ 
  isOpen, 
  onClose, 
  onConfirm, 
  deuda, 
  isLoading = false 
}: ConfirmarEliminacionProps) {
  if (!deuda) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Eliminación de Deuda
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que quieres eliminar esta deuda de <strong>{deuda.deudor.nombre}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 my-4">
          <div className="text-sm text-yellow-800 font-medium mb-2">
            📋 Información de la deuda:
          </div>
          <div className="text-sm text-yellow-700 space-y-1">
            <div><strong>Monto:</strong> {formatearMonto(deuda.monto)}</div>
            <div><strong>Vencimiento:</strong> {deuda.fecha_vencimiento}</div>
            <div><strong>Estado:</strong> {deuda.estado}</div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-md p-3 my-4">
          <div className="text-sm text-red-800 font-medium">
            ⚠️ Esta acción archivará la deuda (soft delete)
          </div>
          <div className="text-sm text-red-700 mt-1">
            Se cancelarán las programaciones pendientes y se mantendrá el historial.
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Deuda
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
