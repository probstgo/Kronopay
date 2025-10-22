'use client';

import { useState } from 'react';
import { DeudoresTable } from './components/DeudoresTable';
import { FiltrosDeudores, FiltrosAplicados } from './components/FiltrosDeudores';
import { Deudor } from '@/lib/database';
import { toast } from 'sonner';
import Protected from "@/components/Protected";

export default function DeudoresPage() {
  const [filtros, setFiltros] = useState<FiltrosAplicados>({
    busqueda: '',
    estado: 'todos',
    rangoMonto: { min: null, max: null },
    rangoFechas: { desde: '', hasta: '' },
    tieneContacto: null
  });

  const handleFiltrosCambiados = (nuevosFiltros: FiltrosAplicados) => {
    setFiltros(nuevosFiltros);
    console.log('Filtros aplicados:', nuevosFiltros);
  };

  const handleLimpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      estado: 'todos',
      rangoMonto: { min: null, max: null },
      rangoFechas: { desde: '', hasta: '' },
      tieneContacto: null
    });
  };

  const handleAgregarDeudor = () => {
    // La funcionalidad se maneja directamente en DeudoresTable
  };

  const handleEditarDeudor = (deudor: Deudor) => {
    // La funcionalidad se maneja directamente en DeudoresTable
  };

  const handleEliminarDeudor = (deudor: Deudor) => {
    toast.success(`Deudor ${deudor.nombre} eliminado exitosamente`);
    // Aquí se confirmaría la eliminación y se recargarían los datos
  };

  const handleEnviarRecordatorio = (deudor: Deudor) => {
    toast.success(`Recordatorio enviado a: ${deudor.nombre}`);
    // Aquí se enviaría el recordatorio
  };

  const handleImportarCSV = () => {
    toast.info('Funcionalidad de importar CSV - Próximamente');
    // Aquí se abriría el modal de importar CSV
  };

  const handleExportarDatos = () => {
    toast.info('Funcionalidad de exportar datos - Próximamente');
    // Aquí se exportarían los datos
  };

  return (
    <Protected>
      <div className="container mx-auto px-4 py-8">
        <DeudoresTable
          onAgregarDeudor={handleAgregarDeudor}
          onEditarDeudor={handleEditarDeudor}
          onEliminarDeudor={handleEliminarDeudor}
          onEnviarRecordatorio={handleEnviarRecordatorio}
          onImportarCSV={handleImportarCSV}
          onExportarDatos={handleExportarDatos}
        />
      </div>
    </Protected>
  );
}
