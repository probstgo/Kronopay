'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  Mail, 
  Phone,
  MoreHorizontal 
} from 'lucide-react';
import { Deudor, ESTADOS_DEUDA, ESTADOS_DEUDA_CONFIG, formatearMonto, formatearRUT, formatearTelefono, calcularDiasVencidos, getDeudores, deleteDeudor } from '@/lib/database';
import { toast } from 'sonner';
import { EstadoBadge } from './EstadoBadge';
import { SelectorEstado } from './SelectorEstado';
import { DeudorForm } from './DeudorForm';
import { ConfirmarEliminacion } from './ConfirmarEliminacion';
import { ImportCSVModal } from './ImportCSVModal';

interface DeudoresTableProps {
  onAgregarDeudor?: () => void;
  onEditarDeudor?: (deudor: Deudor) => void;
  onEliminarDeudor?: (deudor: Deudor) => void;
  onEnviarRecordatorio?: (deudor: Deudor) => void;
  onImportarCSV?: () => void;
  onExportarDatos?: () => void;
}

export function DeudoresTable({
  onAgregarDeudor,
  onEditarDeudor,
  onEliminarDeudor,
  onEnviarRecordatorio,
  onImportarCSV,
  onExportarDatos
}: DeudoresTableProps) {
  const [deudores, setDeudores] = useState<Deudor[]>([]);
  const [filtrados, setFiltrados] = useState<Deudor[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(10);
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
    if (busqueda) {
      resultado = resultado.filter(deudor =>
        deudor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        deudor.rut?.toLowerCase().includes(busqueda.toLowerCase()) ||
        deudor.email?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(deudor => deudor.estado === filtroEstado);
    }

    setFiltrados(resultado);
    setPaginaActual(1);
  }, [deudores, busqueda, filtroEstado]);

  const cargarDeudores = async () => {
    try {
      setIsLoading(true);
      const data = await getDeudores();
      setDeudores(data || []);
    } catch (error) {
      console.error('Error al cargar deudores:', error);
      // En caso de error, mostrar array vacío
      setDeudores([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPaginas = Math.ceil(filtrados.length / elementosPorPagina);
  const inicio = (paginaActual - 1) * elementosPorPagina;
  const fin = inicio + elementosPorPagina;
  const deudoresPagina = filtrados.slice(inicio, fin);

  const handleCambioEstado = (deudorId: string, nuevoEstado: string) => {
    setDeudores(prev => prev.map(deudor => 
      deudor.id === deudorId 
        ? { ...deudor, estado: nuevoEstado as any }
        : deudor
    ));
  };

  const recargarDatos = () => {
    cargarDeudores();
  };

  // Funciones para manejar el modal
  const handleAgregarDeudor = () => {
    setDeudorEditando(null);
    setIsFormOpen(true);
  };

  const handleEditarDeudor = (deudor: Deudor) => {
    setDeudorEditando(deudor);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    recargarDatos();
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setDeudorEditando(null);
  };

  // Funciones para manejar la eliminación
  const handleEliminarDeudor = (deudor: Deudor) => {
    setDeudorEliminando(deudor);
    setIsDeleteOpen(true);
  };

  const handleConfirmarEliminacion = async () => {
    if (!deudorEliminando) return;

    setIsDeleting(true);
    try {
      await deleteDeudor(deudorEliminando.id);
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
      {/* Header con botones de acción */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Deudores</h2>
          <p className="text-gray-500">Administra tu lista de deudores</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleAgregarDeudor} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Deudor
          </Button>
          <Button variant="outline" onClick={handleImportarCSV}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button variant="outline" onClick={onExportarDatos}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros y Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, RUT o email..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
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
            <div className="w-full sm:w-32">
              <Select value={elementosPorPagina.toString()} onValueChange={(value) => setElementosPorPagina(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="30">30 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  const diasVencidos = deudor.fecha_vencimiento 
                    ? calcularDiasVencidos(deudor.fecha_vencimiento)
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
                        {formatearMonto(deudor.monto_deuda)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{deudor.fecha_vencimiento || '-'}</div>
                          {diasVencidos > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {diasVencidos} días vencido
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <EstadoBadge estado={deudor.estado} />
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
