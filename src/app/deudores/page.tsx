'use client';

import { useState, useCallback, useRef } from 'react';
import { DeudoresTable } from './components/DeudoresTable';
import { FiltrosDeudores, FiltrosAplicados } from './components/FiltrosDeudores';
import { HeaderDeudores } from './components/HeaderDeudores';
import { Deudor } from '@/lib/database';

// Tipo para el deudor con datos combinados
interface DeudorConDatos {
  id: string;
  usuario_id: string;
  rut: string;
  nombre: string;
  created_at: string;
  deudas: unknown[];
  contactos: unknown[];
  email?: string;
  telefono?: string;
  monto_total?: number;
  fecha_vencimiento_mas_reciente?: string;
  estado_general?: string;
}
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

  const handleFiltrosCambiados = useCallback((nuevosFiltros: FiltrosAplicados) => {
    setFiltros(nuevosFiltros);
    console.log('Filtros aplicados:', nuevosFiltros);
  }, []);

  const handleLimpiarFiltros = useCallback(() => {
    setFiltros({
      busqueda: '',
      estado: 'todos',
      rangoMonto: { min: null, max: null },
      rangoFechas: { desde: '', hasta: '' },
      tieneContacto: null
    });
  }, []);

  // Referencias para conectar con DeudoresTable
  const deudoresTableRef = useRef<{
    handleAgregarDeudor: () => void;
    handleEditarDeudor: (deudor: DeudorConDatos) => void;
    handleEliminarDeudor: (deudor: DeudorConDatos) => void;
    handleImportarCSV: () => void;
  } | null>(null);

  const handleAgregarDeudor = () => {
    if (deudoresTableRef.current?.handleAgregarDeudor) {
      deudoresTableRef.current.handleAgregarDeudor();
    }
  };

  const handleEnviarRecordatorio = (deudor: Deudor) => {
    toast.success(`Recordatorio enviado a: ${deudor.nombre}`);
    // Aquí se enviaría el recordatorio
  };

  const handleImportarCSV = () => {
    if (deudoresTableRef.current?.handleImportarCSV) {
      deudoresTableRef.current.handleImportarCSV();
    }
  };

  const handleExportarDatos = () => {
    toast.info('Funcionalidad de exportar datos - Próximamente');
    // Aquí se exportarían los datos
  };

  return (
    <Protected>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* 1. Título y botones */}
          <HeaderDeudores
            onAgregarDeudor={handleAgregarDeudor}
            onImportarCSV={handleImportarCSV}
            onExportarDatos={handleExportarDatos}
          />
          
          {/* 2. Filtros */}
          <FiltrosDeudores
            filtros={filtros}
            onFiltrosCambiados={handleFiltrosCambiados}
            onLimpiarFiltros={handleLimpiarFiltros}
          />
          
          {/* 3. Tabla de deudores */}
          <DeudoresTable
            ref={deudoresTableRef}
            filtros={filtros}
            onEnviarRecordatorio={handleEnviarRecordatorio}
          />
        </div>
      </div>
    </Protected>
  );
}
