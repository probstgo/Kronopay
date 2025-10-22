'use client';

import { useState } from 'react';
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
import { ESTADOS_DEUDA, ESTADOS_DEUDA_CONFIG } from '@/lib/database';

interface FiltrosDeudoresProps {
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

export function FiltrosDeudores({ onFiltrosCambiados, onLimpiarFiltros }: FiltrosDeudoresProps) {
  const [filtros, setFiltros] = useState<FiltrosAplicados>({
    busqueda: '',
    estado: 'todos',
    rangoMonto: { min: null, max: null },
    rangoFechas: { desde: '', hasta: '' },
    tieneContacto: null
  });

  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  const handleFiltroChange = (campo: keyof FiltrosAplicados, valor: any) => {
    const nuevosFiltros = { ...filtros, [campo]: valor };
    setFiltros(nuevosFiltros);
    onFiltrosCambiados(nuevosFiltros);
  };

  const handleLimpiarFiltros = () => {
    const filtrosLimpios: FiltrosAplicados = {
      busqueda: '',
      estado: 'todos',
      rangoMonto: { min: null, max: null },
      rangoFechas: { desde: '', hasta: '' },
      tieneContacto: null
    };
    setFiltros(filtrosLimpios);
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
                    type="number"
                    placeholder="Mínimo"
                    value={filtros.rangoMonto.min || ''}
                    onChange={(e) => handleFiltroChange('rangoMonto', {
                      ...filtros.rangoMonto,
                      min: e.target.value ? Number(e.target.value) : null
                    })}
                  />
                  <Input
                    type="number"
                    placeholder="Máximo"
                    value={filtros.rangoMonto.max || ''}
                    onChange={(e) => handleFiltroChange('rangoMonto', {
                      ...filtros.rangoMonto,
                      max: e.target.value ? Number(e.target.value) : null
                    })}
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
                  Búsqueda: "{filtros.busqueda}"
                </span>
              )}
              {filtros.estado !== 'todos' && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Estado: {ESTADOS_DEUDA_CONFIG[filtros.estado as keyof typeof ESTADOS_DEUDA_CONFIG]?.label}
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
}
