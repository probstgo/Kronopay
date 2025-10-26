'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X,
  Download,
  Eye,
  FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import { parseCSVLine, downloadCSV, readCSVFile, mapCSVColumns, parseAndValidateCSV, CSVParseResult } from '@/lib/csvUtils';
import { supabase } from '@/lib/supabase';
import { parsearMontoCLP, validarMontoCLP } from '@/lib/formateo';

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CSVData {
  nombre: string;
  rut?: string;
  email?: string;
  telefono?: string;
  monto_deuda: number;
  fecha_vencimiento?: string;
  estado?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export function ImportCSVModal({ isOpen, onClose, onSuccess }: ImportCSVModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [previewData, setPreviewData] = useState<CSVData[]>([]);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Por favor selecciona un archivo CSV válido');
        return;
      }
      setSelectedFile(file);
      setCsvData([]);
      setValidationErrors([]);
      setPreviewData([]);
      setParseResult(null);
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      setSelectedFile(file);
      setCsvData([]);
      setValidationErrors([]);
      setPreviewData([]);
      setParseResult(null);
    } else {
      toast.error('Por favor selecciona un archivo CSV válido');
    }
  };

  // const parseCSV = (text: string): CSVData[] => {
  //   const lines = text.split('\n').filter(line => line.trim());
  //   if (lines.length < 2) return [];

  //   const headers = parseCSVLine(lines[0]);
  //   const columnMapping = mapCSVColumns(headers);
  //   const data: CSVData[] = [];

  //   for (let i = 1; i < lines.length; i++) {
  //     const values = parseCSVLine(lines[i]);
  //     const row: Partial<CSVData> = {};

  //     // Mapear datos usando el mapeo de columnas
  //     Object.entries(columnMapping).forEach(([field, headerName]) => {
  //       const headerIndex = headers.findIndex(h => h === headerName);
  //       if (headerIndex !== -1) {
  //         const value = values[headerIndex] || '';
  //         
  //         switch (field) {
  //           case 'nombre':
  //             row.nombre = value;
  //             break;
  //           case 'rut':
  //             row.rut = value;
  //             break;
  //           case 'email':
  //             row.email = value;
  //             break;
  //           case 'telefono':
  //             row.telefono = value;
  //             break;
  //           case 'monto_deuda':
  //             // Intentar parsear como monto CLP primero, luego como número normal
  //             if (validarMontoCLP(value)) {
  //               row.monto_deuda = parsearMontoCLP(value);
  //             } else {
  //               row.monto_deuda = parseFloat(value) || 0;
  //             }
  //             break;
  //           case 'fecha_vencimiento':
  //             row.fecha_vencimiento = value;
  //             break;
  //         }
  //       }
  //     });

  //     // Validar que tenga al menos nombre y monto y construir objeto tipado
  //     if (row.nombre && (row.monto_deuda ?? 0) > 0) {
  //       const typedRow: CSVData = {
  //         nombre: row.nombre,
  //         rut: row.rut,
  //         email: row.email,
  //         telefono: row.telefono,
  //         monto_deuda: row.monto_deuda!,
  //         fecha_vencimiento: row.fecha_vencimiento,
  //         estado: row.estado,
  //       };
  //       data.push(typedRow);
  //     }
  //   }

  //   return data;
  // };

  // const validateCSVData = (data: CSVData[]): ValidationError[] => {
  //   const errors: ValidationError[] = [];
  //   
  //   data.forEach((row, index) => {
  //     const rowNumber = index + 2; // +2 porque empezamos desde la fila 2 (después del header)
  //     
  //     if (!row.nombre || row.nombre.trim() === '') {
  //       errors.push({
  //         row: rowNumber,
  //         field: 'nombre',
  //         message: 'El nombre es obligatorio'
  //       });
  //     }

  //     if (row.monto_deuda <= 0) {
  //       errors.push({
  //         row: rowNumber,
  //         field: 'monto_deuda',
  //         message: 'El monto debe ser mayor a 0'
  //       });
  //     }

  //     if (row.rut && row.rut.trim() !== '') {
  //       // Aquí podrías agregar validación de RUT si quieres
  //     }

  //     if (row.email && row.email.trim() !== '') {
  //       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  //       if (!emailRegex.test(row.email)) {
  //         errors.push({
  //           row: rowNumber,
  //           field: 'email',
  //           message: 'Email inválido'
  //         });
  //       }
  //     }
  //   });

  //   return errors;
  // };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsValidating(true);
    try {
      // Leer el archivo con codificación UTF-8 correcta
      const text = await readCSVFile(selectedFile);
      
      // Usar el nuevo parser con validaciones completas
      const result = parseAndValidateCSV(text);
      setParseResult(result);
      
      if (result.totalRows === 0) {
        toast.error('No se encontraron datos válidos en el archivo CSV');
        return;
      }

      // Convertir datos válidos al formato esperado por el componente
      const csvData = result.validData.map(item => ({
        nombre: item.nombre,
        rut: item.rut,
        email: item.email || '',
        telefono: item.telefono || '',
        monto_deuda: item.monto_deuda,
        fecha_vencimiento: item.fecha_vencimiento,
        estado: 'nueva'
      }));

      setCsvData(csvData);
      setPreviewData(csvData.slice(0, 5)); // Mostrar solo los primeros 5 registros

      // Convertir errores al formato esperado
      const errors = result.errors.map(error => ({
        row: error.row,
        field: error.field,
        message: error.message
      }));
      setValidationErrors(errors);

      if (result.invalidRows > 0) {
        toast.warning(`Se encontraron ${result.invalidRows} registros con errores de ${result.totalRows} total`);
      } else {
        toast.success(`Archivo procesado correctamente. ${result.validRows} registros válidos encontrados`);
      }
    } catch (error) {
      console.error('Error al procesar archivo:', error);
      toast.error('Error al procesar el archivo CSV');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (csvData.length === 0) return;

    setIsProcessing(true);
    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      let deudoresInsertados = 0;
      let errores = 0;

      // Procesar cada deudor individualmente
      for (const deudor of csvData) {
        try {
          // Insertar el deudor básico
          const { data: deudorData, error: deudorError } = await supabase
            .from('deudores')
            .insert({
              usuario_id: user.id,
              nombre: deudor.nombre,
              rut: deudor.rut || null
            })
            .select()
            .single();

          if (deudorError) throw deudorError;

          // Si hay email, crear contacto
          if (deudor.email) {
            await supabase
              .from('contactos')
              .insert({
                usuario_id: user.id,
                deudor_id: deudorData.id,
                rut: deudor.rut || '',
                tipo_contacto: 'email',
                valor: deudor.email,
                preferido: true
              });
          }

          // Si hay teléfono, crear contacto
          if (deudor.telefono) {
            await supabase
              .from('contactos')
              .insert({
                usuario_id: user.id,
                deudor_id: deudorData.id,
                rut: deudor.rut || '',
                tipo_contacto: 'telefono',
                valor: deudor.telefono,
                preferido: true
              });
          }

          // Crear la deuda
          await supabase
            .from('deudas')
            .insert({
              usuario_id: user.id,
              deudor_id: deudorData.id,
              rut: deudor.rut || '',
              monto: deudor.monto_deuda,
              fecha_vencimiento: deudor.fecha_vencimiento || null,
              estado: 'nueva'
            });

          deudoresInsertados++;
        } catch (error) {
          console.error('Error al importar deudor:', deudor.nombre, error);
          errores++;
        }
      }
      
      // Generar reporte de importación
      const reporte = {
        total: csvData.length,
        insertados: deudoresInsertados,
        errores: errores + (parseResult?.invalidRows || 0),
        fecha: new Date().toLocaleString('es-CL')
      };

      toast.success(`${reporte.insertados} deudores importados exitosamente`);
      
      // Mostrar reporte detallado
      if (reporte.errores > 0) {
        toast.warning(`${reporte.errores} registros tenían errores y no se importaron`);
      }
      
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error al importar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al importar los datos: ${errorMessage}`);
      
      // Mostrar detalles del error en consola para debug
      if (error instanceof Error) {
        console.error('Detalles del error:', {
          message: error.message,
          stack: error.stack,
          csvData: csvData.slice(0, 2) // Mostrar solo los primeros 2 registros para debug
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCsvData([]);
    setValidationErrors([]);
    setPreviewData([]);
    setParseResult(null);
    onClose();
  };

  const downloadTemplate = () => {
    const template = 'nombre,rut,email,telefono,monto_deuda,fecha_vencimiento\n"Juan Pérez",12345678-9,juan@ejemplo.com,912345678,100000,2024-12-31\n"María González",87654321-0,maria@ejemplo.com,987654321,150000,2024-11-30';
    downloadCSV(template, 'plantilla_deudores.csv');
  };

  const downloadErrorLog = () => {
    if (!parseResult || parseResult.errors.length === 0) {
      toast.warning('No hay errores para descargar');
      return;
    }

    // Crear contenido del log de errores
    const errorLogContent = [
      'Fila,Campo,Error,Valor Original',
      ...parseResult.errors.map(error => 
        `${error.row},"${error.field}","${error.message}","N/A"`
      )
    ].join('\n');

    // Agregar encabezado con información del reporte
    const reportHeader = [
      'REPORTE DE ERRORES DE IMPORTACIÓN CSV',
      `Fecha: ${new Date().toLocaleString('es-CL')}`,
      `Archivo: ${selectedFile?.name || 'N/A'}`,
      `Total registros: ${parseResult.totalRows}`,
      `Registros válidos: ${parseResult.validRows}`,
      `Registros con errores: ${parseResult.invalidRows}`,
      `Porcentaje de éxito: ${parseResult.validRows > 0 ? Math.round((parseResult.validRows / parseResult.totalRows) * 100) : 0}%`,
      '',
      'DETALLE DE ERRORES:',
      ''
    ].join('\n');

    const fullContent = reportHeader + errorLogContent;
    downloadCSV(fullContent, `log_errores_importacion_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Log de errores descargado exitosamente');
  };

  const downloadFullReport = () => {
    if (!parseResult) {
      toast.warning('No hay datos para generar reporte');
      return;
    }

    // Crear reporte completo con estadísticas y datos
    const reportContent = [
      'REPORTE COMPLETO DE IMPORTACIÓN CSV',
      `Fecha: ${new Date().toLocaleString('es-CL')}`,
      `Archivo: ${selectedFile?.name || 'N/A'}`,
      `Tamaño: ${selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'N/A'}`,
      '',
      'ESTADÍSTICAS:',
      `Total registros: ${parseResult.totalRows}`,
      `Registros válidos: ${parseResult.validRows}`,
      `Registros con errores: ${parseResult.invalidRows}`,
      `Porcentaje de éxito: ${parseResult.validRows > 0 ? Math.round((parseResult.validRows / parseResult.totalRows) * 100) : 0}%`,
      '',
      'DATOS VÁLIDOS:',
      'Nombre,RUT,Email,Teléfono,Monto,Fecha Vencimiento',
      ...parseResult.validData.map(item => 
        `"${item.nombre}","${item.rut || ''}","${item.email || ''}","${item.telefono || ''}",${item.monto_deuda},"${item.fecha_vencimiento || ''}"`
      ),
      '',
      'ERRORES ENCONTRADOS:',
      'Fila,Campo,Error,Valor Original',
      ...parseResult.errors.map(error => 
        `${error.row},"${error.field}","${error.message}","N/A"`
      )
    ].join('\n');

    downloadCSV(reportContent, `reporte_completo_importacion_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Reporte completo descargado exitosamente');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Deudores desde CSV
          </DialogTitle>
          <DialogDescription>
            Selecciona un archivo CSV con los datos de los deudores. Se validarán los datos antes de la importación. 
            Todos los deudores importados tendrán estado &quot;nueva&quot; por defecto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selector de archivo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Seleccionar Archivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 mx-auto text-green-600" />
                    <p className="font-medium text-green-600">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cambiar archivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-gray-400" />
                    <p className="font-medium">Arrastra tu archivo CSV aquí</p>
                    <p className="text-sm text-gray-500">o haz clic para seleccionar</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botón de procesar */}
          {selectedFile && csvData.length === 0 && (
            <div className="flex justify-center">
              <Button
                onClick={handleProcessFile}
                disabled={isValidating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isValidating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Procesar Archivo
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Previsualización de datos */}
          {previewData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  2. Previsualización de Datos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Mostrando {previewData.length} de {parseResult?.validRows || csvData.length} registros válidos
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        {parseResult?.validRows || csvData.length} válidos
                      </Badge>
                      {parseResult && parseResult.invalidRows > 0 && (
                        <Badge variant="outline" className="bg-red-100 text-red-800">
                          {parseResult.invalidRows} con errores
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Nombre</th>
                          <th className="text-left p-2">RUT</th>
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Teléfono</th>
                          <th className="text-left p-2">Monto</th>
                          <th className="text-left p-2">Vencimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">{row.nombre}</td>
                            <td className="p-2">{row.rut || '-'}</td>
                            <td className="p-2">{row.email || '-'}</td>
                            <td className="p-2">{row.telefono || '-'}</td>
                            <td className="p-2">${row.monto_deuda.toLocaleString('es-CL')}</td>
                            <td className="p-2">{row.fecha_vencimiento || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errores de validación */}
          {validationErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  3. Errores Encontrados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Se encontraron {validationErrors.length} errores en el archivo
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadErrorLog}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Descargar Log de Errores
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {validationErrors.map((error, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        <div className="text-sm">
                          <span className="font-medium">Fila {error.row}:</span>
                          <span className="ml-1">{error.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reporte de importación */}
          {parseResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Resumen de Importación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{parseResult.totalRows}</div>
                      <div className="text-sm text-blue-800">Total registros</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{parseResult.validRows}</div>
                      <div className="text-sm text-green-800">Válidos</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{parseResult.invalidRows}</div>
                      <div className="text-sm text-red-800">Con errores</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">
                        {parseResult.validRows > 0 ? Math.round((parseResult.validRows / parseResult.totalRows) * 100) : 0}%
                      </div>
                      <div className="text-sm text-gray-800">Éxito</div>
                    </div>
                  </div>
                  
                  {/* Información adicional del reporte */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Archivo procesado:</span>
                        <span className="ml-2 text-gray-600">{selectedFile?.name}</span>
                      </div>
                      <div>
                        <span className="font-medium">Fecha de procesamiento:</span>
                        <span className="ml-2 text-gray-600">{new Date().toLocaleString('es-CL')}</span>
                      </div>
                      <div>
                        <span className="font-medium">Tamaño del archivo:</span>
                        <span className="ml-2 text-gray-600">
                          {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Estado del procesamiento:</span>
                        <span className="ml-2 text-green-600 font-medium">Completado</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones para descargar reportes */}
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={downloadFullReport}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Reporte Completo
                    </Button>
                    {parseResult.errors.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={downloadErrorLog}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        Solo Errores
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plantilla de ejemplo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plantilla de Ejemplo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Descarga una plantilla con el formato correcto para importar tus datos.
                </p>
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Plantilla CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancelar
          </Button>
          {csvData.length > 0 && validationErrors.length === 0 && (
            <Button
              onClick={handleImport}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Importar {csvData.length} Deudores
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
