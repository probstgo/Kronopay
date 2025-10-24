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
// Configuración de estados para la nueva estructura
const ESTADOS_CONFIG = {
  sin_deudas: {
    label: 'Sin deudas',
    icon: '✅'
  },
  pendiente: {
    label: 'Pendiente',
    icon: '⏳'
  },
  vencida: {
    label: 'Vencida',
    icon: '⚠️'
  },
  pagada: {
    label: 'Pagada',
    icon: '✅'
  }
} as const;
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
      // TODO: Implementar lógica para cambiar estado en la nueva estructura
      // Por ahora solo notificamos el cambio
      toast.success(`Estado cambiado a ${ESTADOS_CONFIG[nuevoEstado as keyof typeof ESTADOS_CONFIG]?.label}`);
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
        {Object.entries(ESTADOS_CONFIG).map(([key, config]) => (
          <SelectItem key={key} value={key}>
            <div className="flex items-center gap-2">
              <span>{config.icon}</span>
              <span>{config.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
