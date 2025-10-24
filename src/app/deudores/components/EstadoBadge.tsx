'use client';

import { Badge } from '@/components/ui/badge';

// Configuración de estados para la nueva estructura
const ESTADOS_CONFIG = {
  sin_deudas: {
    label: 'Sin deudas',
    icon: '✅',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  pendiente: {
    label: 'Pendiente',
    icon: '⏳',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  vencida: {
    label: 'Vencida',
    icon: '⚠️',
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  pagada: {
    label: 'Pagada',
    icon: '✅',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  }
} as const;

type EstadoType = keyof typeof ESTADOS_CONFIG;

interface EstadoBadgeProps {
  estado: EstadoType | string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EstadoBadge({ estado, showIcon = true, size = 'md' }: EstadoBadgeProps) {
  const config = ESTADOS_CONFIG[estado as EstadoType];
  
  if (!config) {
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
        Estado desconocido
      </Badge>
    );
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge 
      variant="secondary" 
      className={`${config.color} ${sizeClasses[size]} font-medium`}
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
}
