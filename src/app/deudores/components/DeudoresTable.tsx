'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  Mail, 
  Phone
} from 'lucide-react';
import { Deudor, Deuda, Contacto, formatearRUT, formatearTelefono, calcularDiasVencidos, formatearMonto } from '@/lib/database';
import { toast } from 'sonner';
import { EstadoBadge } from './EstadoBadge';
import { DeudorForm } from './DeudorForm';
import { ConfirmarEliminacion } from './ConfirmarEliminacion';
import { ImportCSVModal } from './ImportCSVModal';
import { FiltrosAplicados } from './FiltrosDeudores';
import { supabase } from '@/lib/supabase';

// Tipos para la vista combinada
interface DeudorConDatos {
  id: string;
  usuario_id: string;
  rut: string;
  nombre: string;
  created_at: string;
  deudas: Deuda[];
  contactos: Contacto[];
  email?: string;
  telefono?: string;
  monto_total?: number;
  fecha_vencimiento_mas_reciente?: string;
  estado_general?: string;
}

interface DeudoresTableProps {
  filtros: FiltrosAplicados;
  onAgregarDeudor?: () => void;
  onEditarDeudor?: (deudor: Deudor) => void;
  onEliminarDeudor?: (deudor: Deudor) => void;
  onEnviarRecordatorio?: (deudor: Deudor) => void;
  onImportarCSV?: () => void;
  onExportarDatos?: () => void;
}

export function DeudoresTable({
  filtros,
  onAgregarDeudor,
  onEditarDeudor,
  onEliminarDeudor,
  onEnviarRecordatorio,
  onImportarCSV,
  onExportarDatos
}: DeudoresTableProps) {
  const [deudores, setDeudores] = useState<DeudorConDatos[]>([]);
  const [filtrados, setFiltrados] = useState<DeudorConDatos[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para el modal de formulario
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deudorEditando, setDeudorEditando] = useState<Deudor | null>(null);
  
  // Estados para el modal de eliminación
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deudorEliminando, setDeudorEliminando] = useState<Deudor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estados para el modal de importación CSV
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Cargar deudores
  useEffect(() => {
    cargarDeudores();
  }, []);

  // Filtrar deudores
  useEffect(() => {
    let resultado = deudores;

    // Filtro por búsqueda
    if (filtros.busqueda) {
      resultado = resultado.filter(deudor =>
        deudor.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        deudor.rut?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        deudor.email?.toLowerCase().includes(filtros.busqueda.toLowerCase())
      );
    }

    // Filtro por estado
    if (filtros.estado !== 'todos') {
      resultado = resultado.filter(deudor => deudor.estado_general === filtros.estado);
    }

    // Filtro por rango de montos
    if (filtros.rangoMonto.min !== null) {
      resultado = resultado.filter(deudor => 
        deudor.monto_total !== undefined && deudor.monto_total >= filtros.rangoMonto.min!
      );
    }
    if (filtros.rangoMonto.max !== null) {
      resultado = resultado.filter(deudor => 
        deudor.monto_total !== undefined && deudor.monto_total <= filtros.rangoMonto.max!
      );
    }

    // Filtro por rango de fechas
    if (filtros.rangoFechas.desde) {
      resultado = resultado.filter(deudor => 
        deudor.created_at >= filtros.rangoFechas.desde
      );
    }
    if (filtros.rangoFechas.hasta) {
      resultado = resultado.filter(deudor => 
        deudor.created_at <= filtros.rangoFechas.hasta
      );
    }

    // Filtro por contacto
    if (filtros.tieneContacto !== null) {
      resultado = resultado.filter(deudor => {
        const tieneContacto = deudor.contactos && deudor.contactos.length > 0;
        return filtros.tieneContacto ? tieneContacto : !tieneContacto;
      });
    }

    setFiltrados(resultado);
    setPaginaActual(1);
  }, [deudores, filtros]);

  const cargarDeudores = async () => {
    try {
      setIsLoading(true);
      
      // Obtener deudores
      const { data: deudoresData, error: deudoresError } = await supabase
        .from('deudores')
        .select('*')
        .order('created_at', { ascending: false });

      if (deudoresError) throw deudoresError;

      // Para cada deudor, obtener sus deudas y contactos
      const deudoresConDatos: DeudorConDatos[] = await Promise.all(
        (deudoresData || []).map(async (deudor) => {
          // Obtener deudas del deudor
          const { data: deudasData } = await supabase
            .from('deudas')
            .select('*')
            .eq('deudor_id', deudor.id)
            .order('fecha_vencimiento', { ascending: true });

          // Obtener contactos del deudor
          const { data: contactosData } = await supabase
            .from('contactos')
            .select('*')
            .eq('deudor_id', deudor.id);

          // Encontrar email y teléfono (preferidos o cualquier disponible)
          const emailPreferido = contactosData?.find(c => c.tipo_contacto === 'email' && c.preferido) || 
                                 contactosData?.find(c => c.tipo_contacto === 'email');
          const telefonoPreferido = contactosData?.find(c => c.tipo_contacto === 'telefono' && c.preferido) || 
                                   contactosData?.find(c => c.tipo_contacto === 'telefono');

          // Calcular monto total y fecha de vencimiento más reciente
          const montoTotal = deudasData?.reduce((sum, deuda) => sum + deuda.monto, 0) || 0;
          const fechaVencimientoMasReciente = deudasData?.[0]?.fecha_vencimiento;

          // Determinar estado general basado en las deudas
          let estadoGeneral = 'sin_deudas';
          if (deudasData && deudasData.length > 0) {
            const tieneDeudasPendientes = deudasData.some(d => d.estado === 'pendiente');
            const tieneDeudasVencidas = deudasData.some(d => {
              const diasVencidos = calcularDiasVencidos(d.fecha_vencimiento);
              return diasVencidos > 0 && d.estado === 'pendiente';
            });
            
            if (tieneDeudasVencidas) estadoGeneral = 'vencida';
            else if (tieneDeudasPendientes) estadoGeneral = 'pendiente';
            else estadoGeneral = 'pagada';
          }

          return {
            ...deudor,
            deudas: deudasData || [],
            contactos: contactosData || [],
            email: emailPreferido?.valor,
            telefono: telefonoPreferido?.valor,
            monto_total: montoTotal,
            fecha_vencimiento_mas_reciente: fechaVencimientoMasReciente,
            estado_general: estadoGeneral
          };
        })
      );

      setDeudores(deudoresConDatos);
    } catch (error) {
      console.error('Error al cargar deudores:', error);
      toast.error('Error al cargar los deudores');
      setDeudores([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPaginas = Math.ceil(filtrados.length / elementosPorPagina);
  const inicio = (paginaActual - 1) * elementosPorPagina;
  const fin = inicio + elementosPorPagina;
  const deudoresPagina = filtrados.slice(inicio, fin);


  const recargarDatos = () => {
    cargarDeudores();
  };

  // Funciones para manejar el modal
  const handleAgregarDeudor = () => {
    setDeudorEditando(null);
    setIsFormOpen(true);
  };

  const handleEditarDeudor = (deudor: DeudorConDatos) => {
    setDeudorEditando(deudor);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    recargarDatos();
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setDeudorEditando(null);
    // Asegurar que otros modales estén cerrados
    setIsDeleteOpen(false);
    setIsImportOpen(false);
  };

  // Funciones para manejar la eliminación
  const handleEliminarDeudor = (deudor: DeudorConDatos) => {
    setDeudorEliminando(deudor);
    setIsDeleteOpen(true);
  };

  const handleConfirmarEliminacion = async () => {
    if (!deudorEliminando) return;

    setIsDeleting(true);
    try {
      // Eliminar deudas asociadas primero
      await supabase
        .from('deudas')
        .delete()
        .eq('deudor_id', deudorEliminando.id);

      // Eliminar contactos asociados
      await supabase
        .from('contactos')
        .delete()
        .eq('deudor_id', deudorEliminando.id);

      // Eliminar el deudor
      await supabase
        .from('deudores')
        .delete()
        .eq('id', deudorEliminando.id);

      toast.success(`Deudor ${deudorEliminando.nombre} eliminado exitosamente`);
      recargarDatos();
      handleCerrarEliminacion();
    } catch (error) {
      console.error('Error al eliminar deudor:', error);
      toast.error('Error al eliminar el deudor. Inténtalo de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCerrarEliminacion = () => {
    setIsDeleteOpen(false);
    setDeudorEliminando(null);
    setIsDeleting(false);
    // Asegurar que otros modales estén cerrados
    setIsFormOpen(false);
    setIsImportOpen(false);
  };

  // Funciones para manejar la importación CSV
  const handleImportarCSV = () => {
    setIsImportOpen(true);
  };

  const handleImportSuccess = () => {
    recargarDatos();
    setIsImportOpen(false);
  };

  const handleImportClose = () => {
    setIsImportOpen(false);
    // Asegurar que otros modales estén cerrados
    setIsFormOpen(false);
    setIsDeleteOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Cargando deudores...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabla de deudores */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deudoresPagina.map((deudor) => {
                  const diasVencidos = deudor.fecha_vencimiento_mas_reciente 
                    ? calcularDiasVencidos(deudor.fecha_vencimiento_mas_reciente)
                    : 0;

                  return (
                    <TableRow key={deudor.id}>
                      <TableCell className="font-medium">
                        {deudor.nombre}
                      </TableCell>
                      <TableCell>
                        {deudor.rut ? formatearRUT(deudor.rut) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {deudor.email && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Mail className="h-3 w-3" />
                              {deudor.email}
                            </div>
                          )}
                          {deudor.telefono && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              {formatearTelefono(deudor.telefono)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {deudor.monto_total ? formatearMonto(deudor.monto_total) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{deudor.fecha_vencimiento_mas_reciente || '-'}</div>
                          {diasVencidos > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {diasVencidos} días vencido
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <EstadoBadge estado={deudor.estado_general || 'sin_deudas'} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditarDeudor(deudor)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEnviarRecordatorio?.(deudor)}
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEliminarDeudor(deudor)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-500">
                Mostrando {inicio + 1} a {Math.min(fin, filtrados.length)} de {filtrados.length} deudores
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(paginaActual - 1)}
                  disabled={paginaActual === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm">
                  Página {paginaActual} de {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaActual(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de formulario */}
      <DeudorForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        deudor={deudorEditando}
      />

      {/* Modal de confirmación de eliminación */}
      <ConfirmarEliminacion
        isOpen={isDeleteOpen}
        onClose={handleCerrarEliminacion}
        onConfirm={handleConfirmarEliminacion}
        deudor={deudorEliminando}
        isLoading={isDeleting}
      />

      {/* Modal de importación CSV */}
      <ImportCSVModal
        isOpen={isImportOpen}
        onClose={handleImportClose}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
