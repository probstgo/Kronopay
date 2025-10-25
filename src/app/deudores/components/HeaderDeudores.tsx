'use client';

import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Download, 
  Upload
} from 'lucide-react';

interface HeaderDeudoresProps {
  onAgregarDeudor?: () => void;
  onImportarCSV?: () => void;
  onExportarDatos?: () => void;
}

export function HeaderDeudores({
  onAgregarDeudor,
  onImportarCSV,
  onExportarDatos
}: HeaderDeudoresProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 className="text-2xl font-bold">Gestión de Deudores</h2>
        <p className="text-gray-500">Administra tu lista de deudores</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onAgregarDeudor} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Deudor
        </Button>
        <Button variant="outline" onClick={onImportarCSV}>
          <Upload className="h-4 w-4 mr-2" />
          Importar CSV
        </Button>
        <Button variant="outline" onClick={onExportarDatos}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>
    </div>
  );
}
