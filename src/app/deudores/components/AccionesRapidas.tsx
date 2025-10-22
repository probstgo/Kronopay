'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MessageSquare,
  AlertTriangle 
} from 'lucide-react';
import { Deudor } from '@/lib/database';
import { toast } from 'sonner';

interface AccionesRapidasProps {
  deudor: Deudor;
  onEditar?: (deudor: Deudor) => void;
  onEliminar?: (deudor: Deudor) => void;
  onEnviarEmail?: (deudor: Deudor) => void;
  onLlamar?: (deudor: Deudor) => void;
  onEnviarSMS?: (deudor: Deudor) => void;
}

export function AccionesRapidas({
  deudor,
  onEditar,
  onEliminar,
  onEnviarEmail,
  onLlamar,
  onEnviarSMS
}: AccionesRapidasProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEliminar = async () => {
    setIsLoading(true);
    try {
      // Aquí iría la llamada a la API para eliminar
      // await deleteDeudor(deudor.id);
      toast.success(`Deudor ${deudor.nombre} eliminado exitosamente`);
      onEliminar?.(deudor);
    } catch (error) {
      console.error('Error al eliminar deudor:', error);
      toast.error('Error al eliminar el deudor');
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleEnviarEmail = () => {
    if (!deudor.email) {
      toast.error('Este deudor no tiene email registrado');
      return;
    }
    onEnviarEmail?.(deudor);
  };

  const handleLlamar = () => {
    if (!deudor.telefono) {
      toast.error('Este deudor no tiene teléfono registrado');
      return;
    }
    onLlamar?.(deudor);
  };

  const handleEnviarSMS = () => {
    if (!deudor.telefono) {
      toast.error('Este deudor no tiene teléfono registrado');
      return;
    }
    onEnviarSMS?.(deudor);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEditar?.(deudor)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          
          {deudor.email && (
            <DropdownMenuItem onClick={handleEnviarEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Enviar Email
            </DropdownMenuItem>
          )}
          
          {deudor.telefono && (
            <>
              <DropdownMenuItem onClick={handleLlamar}>
                <Phone className="h-4 w-4 mr-2" />
                Llamar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEnviarSMS}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Enviar SMS
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar al deudor <strong>{deudor.nombre}</strong>?
              <br />
              <br />
              Esta acción no se puede deshacer y se eliminará toda la información relacionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
