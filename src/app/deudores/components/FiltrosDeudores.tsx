'use client';

import { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  DollarSign,
  User
} from 'lucide-react';
import { parsearMontoCLP, validarMontoCLP, montoParaInput } from '@/lib/formateo';
// Configuración de estados para la nueva estructura
const ESTADOS_CONFIG = {
  sin_deudas: {
    label: 'Sin deudas',
    icon: '✅'
  },
  nueva: {
    label: 'Nueva',
    icon: '🆕'
  },
  vigente: {
    label: 'Vigente',
    icon: '🟢'
  },
  vencida: {
    label: 'Vencida',
    icon: '⚠️'
  },
  pagada: {
    label: 'Pagada',
    icon: '✅'
  },
  cancelada: {
    label: 'Cancelada',
    icon: '🛑'
  }
} as const;

interface FiltrosDeudoresProps {
  filtros: FiltrosAplicados;
  onFiltrosCambiados: (filtros: FiltrosAplicados) => void;
  onLimpiarFiltros: () => void;
}

export interface FiltrosAplicados {
  busqueda: string;
  estado: string;
  rangoMonto: {
    min: number | null;
    max: number | null;
  };
  rangoFechas: {
    desde: string;
    hasta: string;
  };
  tieneContacto: boolean | null;
}

const FiltrosDeudoresComponent = ({ filtros, onFiltrosCambiados, onLimpiarFiltros }: FiltrosDeudoresProps) => {

  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  const handleFiltroChange = <K extends keyof FiltrosAplicados>(
    campo: K,
    valor: FiltrosAplicados[K]
  ) => {
    const nuevosFiltros = { ...filtros, [campo]: valor } as FiltrosAplicados;
    onFiltrosCambiados(nuevosFiltros);
  };

  const handleLimpiarFiltros = () => {
    onLimpiarFiltros();
  };

  const tieneFiltrosActivos = 
    filtros.busqueda !== '' ||
    filtros.estado !== 'todos' ||
    filtros.rangoMonto.min !== null ||
    filtros.rangoMonto.max !== null ||
    filtros.rangoFechas.desde !== '' ||
    filtros.rangoFechas.hasta !== '' ||
    filtros.tieneContacto !== null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
          <div className="flex items-center gap-2">
            {tieneFiltrosActivos && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLimpiarFiltros}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
            >
              {mostrarFiltrosAvanzados ? 'Ocultar' : 'Mostrar'} filtros avanzados
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Búsqueda principal */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, RUT o email..."
                  value={filtros.busqueda}
                  onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={filtros.estado} onValueChange={(valor) => handleFiltroChange('estado', valor)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
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
            </div>
          </div>

          {/* Filtros avanzados */}
          {mostrarFiltrosAvanzados && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
              {/* Rango de montos */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Rango de montos
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Mínimo (ej: 1.000.000)"
                    value={filtros.rangoMonto.min ? montoParaInput(filtros.rangoMonto.min) : ''}
                    onChange={(e) => {
                      const valor = e.target.value;
                      if (!valor) {
                        handleFiltroChange('rangoMonto', { ...filtros.rangoMonto, min: null });
                      } else if (validarMontoCLP(valor)) {
                        handleFiltroChange('rangoMonto', { 
                          ...filtros.rangoMonto, 
                          min: parsearMontoCLP(valor) 
                        });
                      }
                    }}
                  />
                  <Input
                    type="text"
                    placeholder="Máximo (ej: 5.000.000)"
                    value={filtros.rangoMonto.max ? montoParaInput(filtros.rangoMonto.max) : ''}
                    onChange={(e) => {
                      const valor = e.target.value;
                      if (!valor) {
                        handleFiltroChange('rangoMonto', { ...filtros.rangoMonto, max: null });
                      } else if (validarMontoCLP(valor)) {
                        handleFiltroChange('rangoMonto', { 
                          ...filtros.rangoMonto, 
                          max: parsearMontoCLP(valor) 
                        });
                      }
                    }}
                  />
                </div>
              </div>

              {/* Rango de fechas */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Rango de fechas
                </label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="Desde"
                    value={filtros.rangoFechas.desde}
                    onChange={(e) => handleFiltroChange('rangoFechas', {
                      ...filtros.rangoFechas,
                      desde: e.target.value
                    })}
                  />
                  <Input
                    type="date"
                    placeholder="Hasta"
                    value={filtros.rangoFechas.hasta}
                    onChange={(e) => handleFiltroChange('rangoFechas', {
                      ...filtros.rangoFechas,
                      hasta: e.target.value
                    })}
                  />
                </div>
              </div>

              {/* Filtro de contacto */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Información de contacto
                </label>
                <Select 
                  value={filtros.tieneContacto === null ? 'todos' : filtros.tieneContacto ? 'si' : 'no'} 
                  onValueChange={(valor) => {
                    const tieneContacto = valor === 'todos' ? null : valor === 'si';
                    handleFiltroChange('tieneContacto', tieneContacto);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="si">Con contacto</SelectItem>
                    <SelectItem value="no">Sin contacto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Resumen de filtros activos */}
          {tieneFiltrosActivos && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-gray-500">Filtros activos:</span>
              {filtros.busqueda && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Búsqueda: &quot;{filtros.busqueda}&quot;
                </span>
              )}
              {filtros.estado !== 'todos' && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Estado: {ESTADOS_CONFIG[filtros.estado as keyof typeof ESTADOS_CONFIG]?.label}
                </span>
              )}
              {(filtros.rangoMonto.min !== null || filtros.rangoMonto.max !== null) && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  Monto: {filtros.rangoMonto.min || '0'} - {filtros.rangoMonto.max || '∞'}
                </span>
              )}
              {(filtros.rangoFechas.desde || filtros.rangoFechas.hasta) && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                  Fechas: {filtros.rangoFechas.desde || '∞'} - {filtros.rangoFechas.hasta || '∞'}
                </span>
              )}
              {filtros.tieneContacto !== null && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                  Contacto: {filtros.tieneContacto ? 'Sí' : 'No'}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const FiltrosDeudores = memo(FiltrosDeudoresComponent);
