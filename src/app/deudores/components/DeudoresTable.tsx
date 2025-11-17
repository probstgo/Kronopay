'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
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
  Edit, 
  Trash2, 
  Mail, 
  Phone
} from 'lucide-react';
import { Deuda, Contacto, formatearRUT, formatearTelefono, calcularDiasVencidos, formatearMonto } from '@/lib/database';
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

interface DeudoresTableProps {
  filtros: FiltrosAplicados;
}

type DeudoresTableHandle = {
  handleAgregarDeudor: () => void;
  handleEditarDeudor: (deudor: DeudorConDatos) => void;
  handleEliminarDeudor: (deudor: DeudorConDatos) => void;
  handleImportarCSV: () => void;
};

export const DeudoresTable = forwardRef<DeudoresTableHandle, DeudoresTableProps>(({
  filtros,
}, ref) => {
  const [deudas, setDeudas] = useState<DeudaConDeudor[]>([]);
  const [filtrados, setFiltrados] = useState<DeudaConDeudor[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para el modal de formulario
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deudorEditando, setDeudorEditando] = useState<DeudorConDatos | null>(null);
  const [deudaEditandoId, setDeudaEditandoId] = useState<string | null>(null);
  
  // Estados para el modal de eliminación
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deudaEliminando, setDeudaEliminando] = useState<DeudaConDeudor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estados para el modal de importación CSV
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Exponer funciones al componente padre
  useImperativeHandle(ref, () => ({
    handleAgregarDeudor,
    handleEditarDeudor,
    handleEliminarDeudor: () => {
      // Función mantenida por compatibilidad pero no implementada
      // La eliminación ahora se hace por deuda individual
      console.warn('handleEliminarDeudor está deprecado. Use handleEliminarDeuda en cada fila.');
    },
    handleImportarCSV
  }));

  // Cargar deudores
  useEffect(() => {
    cargarDeudores();
  }, []);

  // Memoizar los filtros aplicados para evitar re-renders innecesarios
  const deudasFiltradas = useMemo(() => {
    let resultado = deudas;

    // Filtro por búsqueda
    if (filtros.busqueda) {
      resultado = resultado.filter(deuda =>
        deuda.deudor.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        deuda.deudor.rut?.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        deuda.deudor.email?.toLowerCase().includes(filtros.busqueda.toLowerCase())
      );
    }

    // Filtro por estado (de la deuda individual)
    if (filtros.estado !== 'todos') {
      resultado = resultado.filter(deuda => {
        if (filtros.estado === 'vencida') {
          const diasVencidos = calcularDiasVencidos(deuda.fecha_vencimiento);
          return diasVencidos > 0 && (deuda.estado === 'pendiente' || deuda.estado === 'nueva');
        }
        if (filtros.estado === 'pendiente') return deuda.estado === 'pendiente';
        if (filtros.estado === 'nueva') return deuda.estado === 'nueva';
        if (filtros.estado === 'pagada') return deuda.estado === 'pagado';
        return false;
      });
    }

    // Filtro por rango de montos (monto de la deuda individual)
    if (filtros.rangoMonto.min !== null) {
      resultado = resultado.filter(deuda => deuda.monto >= filtros.rangoMonto.min!);
    }
    if (filtros.rangoMonto.max !== null) {
      resultado = resultado.filter(deuda => deuda.monto <= filtros.rangoMonto.max!);
    }

    // Filtro por rango de fechas (fecha de vencimiento de la deuda)
    if (filtros.rangoFechas.desde) {
      resultado = resultado.filter(deuda => deuda.fecha_vencimiento >= filtros.rangoFechas.desde);
    }
    if (filtros.rangoFechas.hasta) {
      resultado = resultado.filter(deuda => deuda.fecha_vencimiento <= filtros.rangoFechas.hasta);
    }

    // Filtro por contacto
    if (filtros.tieneContacto !== null) {
      resultado = resultado.filter(deuda => {
        const tieneContacto = deuda.deudor.email || deuda.deudor.telefono;
        return filtros.tieneContacto ? !!tieneContacto : !tieneContacto;
      });
    }

    return resultado;
  }, [deudas, filtros]);

  // Actualizar filtrados cuando cambien las deudas filtradas
  useEffect(() => {
    setFiltrados(deudasFiltradas);
    setPaginaActual(1);
  }, [deudasFiltradas]);

  const cargarDeudores = async () => {
    try {
      setIsLoading(true);
      
      // Consulta 1: Obtener todos los deudores
      const { data: deudoresData, error: deudoresError } = await supabase
        .from('deudores')
        .select('*')
        .order('created_at', { ascending: false });

      if (deudoresError) throw deudoresError;

      // Consulta 2: Obtener todas las deudas activas con información del deudor
      const { data: deudasData, error: deudasError } = await supabase
        .from('deudas')
        .select(`
          *,
          deudores!inner(id, nombre, rut)
        `)
        .is('eliminada_at', null)  // Solo deudas activas (soft delete)
        .order('fecha_vencimiento', { ascending: true });

      if (deudasError) throw deudasError;

      // Consulta 3: Obtener todos los contactos con información del deudor
      const { data: contactosData, error: contactosError } = await supabase
        .from('contactos')
        .select(`
          *,
          deudores!inner(id, nombre, rut)
        `);

      if (contactosError) throw contactosError;

      // Agrupar contactos por deudor_id
      const contactosPorDeudor = (contactosData || []).reduce((acc, contacto) => {
        if (!acc[contacto.deudor_id]) acc[contacto.deudor_id] = [];
        acc[contacto.deudor_id].push(contacto);
        return acc;
      }, {} as Record<string, Contacto[]>);

      // Crear array de deudas con información del deudor
      const deudasConDeudor: DeudaConDeudor[] = (deudasData || []).map((deuda) => {
        const deudor = deudoresData?.find(d => d.id === deuda.deudor_id);
        const contactosDelDeudor = contactosPorDeudor[deuda.deudor_id] || [];

        // Encontrar email y teléfono (preferidos o cualquier disponible)
        const emailPreferido = contactosDelDeudor.find((c: Contacto) => c.tipo_contacto === 'email' && c.preferido) || 
                               contactosDelDeudor.find((c: Contacto) => c.tipo_contacto === 'email');
        const telefonoPreferido = contactosDelDeudor.find((c: Contacto) => c.tipo_contacto === 'telefono' && c.preferido) || 
                                 contactosDelDeudor.find((c: Contacto) => c.tipo_contacto === 'telefono');

        return {
          ...deuda,
          deudor: {
            id: deudor?.id || '',
            nombre: deudor?.nombre || '',
            rut: deudor?.rut || '',
            email: emailPreferido?.valor,
            telefono: telefonoPreferido?.valor,
          }
        };
      });

      setDeudas(deudasConDeudor);
    } catch (error) {
      console.error('Error al cargar deudas:', error);
      toast.error('Error al cargar las deudas');
      setDeudas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPaginas = Math.ceil(filtrados.length / elementosPorPagina);
  const inicio = (paginaActual - 1) * elementosPorPagina;
  const fin = inicio + elementosPorPagina;
  const deudasPagina = filtrados.slice(inicio, fin);


  const recargarDatos = () => {
    cargarDeudores();
  };

  // Funciones para manejar el modal
  const handleAgregarDeudor = () => {
    setDeudorEditando(null);
    setDeudaEditandoId(null);
    setIsFormOpen(true);
  };

  const handleEditarDeudor = (deudor: DeudorConDatos, deudaId?: string) => {
    setDeudorEditando(deudor);
    setDeudaEditandoId(deudaId || null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    recargarDatos();
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setDeudorEditando(null);
    setDeudaEditandoId(null);
    // Asegurar que otros modales estén cerrados
    setIsDeleteOpen(false);
    setIsImportOpen(false);
  };

  // Funciones para manejar la eliminación de deuda individual
  const handleEliminarDeuda = (deuda: DeudaConDeudor) => {
    setDeudaEliminando(deuda);
    setIsDeleteOpen(true);
  };

  const handleConfirmarEliminacion = async () => {
    if (!deudaEliminando) return;

    setIsDeleting(true);
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuario no autenticado');
        return;
      }

      // 1. Cancelar programaciones pendientes de esta deuda específica
      const { error: programacionesError } = await supabase
        .from('programaciones')
        .update({ estado: 'cancelado' })
        .eq('deuda_id', deudaEliminando.id)
        .eq('estado', 'pendiente');

      if (programacionesError) {
        console.error('Error al cancelar programaciones:', programacionesError);
        // Continuar con la eliminación aunque falle la cancelación
      }

      // 2. Soft delete de la deuda específica
      const { error: deudaError } = await supabase
        .from('deudas')
        .update({
          eliminada_at: new Date().toISOString(),
          eliminada_por: user.id
        })
        .eq('id', deudaEliminando.id)
        .is('eliminada_at', null); // Solo si no está ya eliminada

      if (deudaError) throw deudaError;

      toast.success(`Deuda de ${deudaEliminando.deudor.nombre} eliminada exitosamente`);
      recargarDatos();
      handleCerrarEliminacion();
    } catch (error) {
      console.error('Error al eliminar deuda:', error);
      toast.error('Error al eliminar la deuda. Inténtalo de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCerrarEliminacion = () => {
    setIsDeleteOpen(false);
    setDeudaEliminando(null);
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
              <p className="mt-2 text-gray-500">Cargando deudas...</p>
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
                {deudasPagina.map((deuda) => {
                  const diasVencidos = calcularDiasVencidos(deuda.fecha_vencimiento);
                  
                  // Crear objeto DeudorConDatos para compatibilidad con funciones existentes
                  // Incluimos la deuda específica que se está editando
                  const deudorParaEditar: DeudorConDatos = {
                    id: deuda.deudor.id,
                    usuario_id: deuda.usuario_id,
                    rut: deuda.deudor.rut,
                    nombre: deuda.deudor.nombre,
                    created_at: '',
                    deudas: [deuda], // Incluir la deuda específica
                    contactos: [],
                    email: deuda.deudor.email,
                    telefono: deuda.deudor.telefono,
                  };

                  return (
                    <TableRow key={deuda.id}>
                      <TableCell className="font-medium">
                        {deuda.deudor.nombre}
                      </TableCell>
                      <TableCell>
                        {deuda.deudor.rut ? formatearRUT(deuda.deudor.rut) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {deuda.deudor.email && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Mail className="h-3 w-3" />
                              {deuda.deudor.email}
                            </div>
                          )}
                          {deuda.deudor.telefono && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              {formatearTelefono(deuda.deudor.telefono)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatearMonto(deuda.monto)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{deuda.fecha_vencimiento || '-'}</div>
                          {diasVencidos > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {diasVencidos} días vencido
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <EstadoBadge estado={deuda.estado} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditarDeudor(deudorParaEditar, deuda.id)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEliminarDeuda(deuda)}
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
                Mostrando {inicio + 1} a {Math.min(fin, filtrados.length)} de {filtrados.length} deudas
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
        deudaId={deudaEditandoId}
      />

      {/* Modal de confirmación de eliminación */}
      <ConfirmarEliminacion
        isOpen={isDeleteOpen}
        onClose={handleCerrarEliminacion}
        onConfirm={handleConfirmarEliminacion}
        deuda={deudaEliminando}
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
});

DeudoresTable.displayName = 'DeudoresTable';
