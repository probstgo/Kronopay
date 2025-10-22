'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ESTADOS_DEUDA, ESTADOS_DEUDA_CONFIG } from '@/lib/database';
import { cambiarEstadoDeuda } from '@/lib/database';
import { toast } from 'sonner';

interface SelectorEstadoProps {
  deudorId: string;
  estadoActual: string;
  onEstadoCambiado?: (nuevoEstado: string) => void;
  disabled?: boolean;
}

export function SelectorEstado({ 
  deudorId, 
  estadoActual, 
  onEstadoCambiado,
  disabled = false 
}: SelectorEstadoProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCambioEstado = async (nuevoEstado: string) => {
    if (nuevoEstado === estadoActual) return;

    setIsLoading(true);
    try {
      await cambiarEstadoDeuda(deudorId, nuevoEstado);
      toast.success(`Estado cambiado a ${ESTADOS_DEUDA_CONFIG[nuevoEstado as keyof typeof ESTADOS_DEUDA_CONFIG]?.label}`);
      onEstadoCambiado?.(nuevoEstado);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error('Error al cambiar el estado de la deuda');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Select
      value={estadoActual}
      onValueChange={handleCambioEstado}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Seleccionar estado" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ESTADOS_DEUDA).map(([key, value]) => {
          const config = ESTADOS_DEUDA_CONFIG[value as keyof typeof ESTADOS_DEUDA_CONFIG];
          return (
            <SelectItem key={key} value={value}>
              <div className="flex items-center gap-2">
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
