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
import { Deudor } from '@/lib/database';
import { Trash2, AlertTriangle } from 'lucide-react';

interface ConfirmarEliminacionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deudor: Deudor | null;
  isLoading?: boolean;
}

export function ConfirmarEliminacion({ 
  isOpen, 
  onClose, 
  onConfirm, 
  deudor, 
  isLoading = false 
}: ConfirmarEliminacionProps) {
  if (!deudor) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Eliminación
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que quieres eliminar al deudor <strong>{deudor.nombre}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="bg-red-50 border border-red-200 rounded-md p-3 my-4">
          <div className="text-sm text-red-800 font-medium">
            ⚠️ Esta acción no se puede deshacer
          </div>
          <div className="text-sm text-red-700 mt-1">
            Se eliminarán todos los datos relacionados con este deudor, incluyendo:
          </div>
          <ul className="text-sm text-red-700 mt-1 ml-4 list-disc">
            <li>Información personal del deudor</li>
            <li>Historial de emails enviados</li>
            <li>Registros de pagos</li>
          </ul>
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
                Eliminar Definitivamente
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
