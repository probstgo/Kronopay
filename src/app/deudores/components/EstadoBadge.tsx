'use client';

import { Badge } from '@/components/ui/badge';
import { ESTADOS_DEUDA_CONFIG } from '@/lib/database';

interface EstadoBadgeProps {
  estado: keyof typeof ESTADOS_DEUDA_CONFIG;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EstadoBadge({ estado, showIcon = true, size = 'md' }: EstadoBadgeProps) {
  const config = ESTADOS_DEUDA_CONFIG[estado];
  
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
