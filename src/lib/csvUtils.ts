/**
 * Utilidades para manejo de archivos CSV con soporte completo para caracteres especiales
 * Incluye manejo de tildes, ñ, y otros caracteres del español
 */

/**
 * Normaliza texto para manejo correcto de caracteres especiales
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFC') // Normalizar a Forma Canónica Compuesta
    .trim();
}

/**
 * Parsea una línea CSV respetando comillas y caracteres especiales
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Comilla escapada
        current += '"';
        i++; // Saltar la siguiente comilla
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(normalizeText(current));
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(normalizeText(current));
  return result;
}

/**
 * Crea un archivo CSV con codificación UTF-8 correcta
 */
export function createCSVBlob(data: string): Blob {
  // Agregar BOM (Byte Order Mark) para UTF-8 para compatibilidad con Excel
  const BOM = '\uFEFF';
  const csvContent = BOM + data;
  
  return new Blob([csvContent], { 
    type: 'text/csv;charset=utf-8' 
  });
}

/**
 * Descarga un archivo CSV con codificación correcta
 */
export function downloadCSV(data: string, filename: string): void {
  const blob = createCSVBlob(data);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Lee un archivo CSV con codificación UTF-8
 */
export async function readCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        resolve(text);
      } else {
        reject(new Error('No se pudo leer el archivo'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    // Leer como texto con codificación UTF-8
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Valida que un archivo CSV tenga la estructura correcta
 */
export function validateCSVStructure(text: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    errors.push('El archivo debe tener al menos una fila de encabezados y una fila de datos');
    return { isValid: false, errors };
  }
  
  const headers = parseCSVLine(lines[0]);
  const requiredHeaders = ['nombre'];
  
  // Verificar que tenga al menos el campo nombre
  const hasRequiredFields = requiredHeaders.some(required => 
    headers.some(header => header.includes(required))
  );
  
  if (!hasRequiredFields) {
    errors.push('El archivo debe contener al menos una columna "nombre"');
  }
  
  // Verificar que todas las filas tengan la misma cantidad de columnas
  const expectedColumns = headers.length;
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== expectedColumns) {
      errors.push(`La fila ${i + 1} tiene ${values.length} columnas, se esperaban ${expectedColumns}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Mapea columnas CSV a campos de deudor
 */
export function mapCSVColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  headers.forEach((header) => {
    const normalizedHeader = header.toLowerCase().trim();
    
    if (normalizedHeader.includes('nombre') || normalizedHeader.includes('name')) {
      mapping.nombre = header;
    } else if (normalizedHeader.includes('rut')) {
      mapping.rut = header;
    } else if (normalizedHeader.includes('email') || normalizedHeader.includes('correo')) {
      mapping.email = header;
    } else if (normalizedHeader.includes('telefono') || normalizedHeader.includes('phone') || normalizedHeader.includes('teléfono')) {
      mapping.telefono = header;
    } else if (normalizedHeader.includes('monto') || normalizedHeader.includes('deuda') || normalizedHeader.includes('amount')) {
      mapping.monto_deuda = header;
    } else if (normalizedHeader.includes('fecha') || normalizedHeader.includes('vencimiento') || normalizedHeader.includes('date')) {
      mapping.fecha_vencimiento = header;
    }
  });
  
  return mapping;
}

/**
 * Valida un RUT chileno
 */
export function validateRUT(rut: string): { isValid: boolean; error?: string } {
  if (!rut || rut.trim() === '') {
    return { isValid: false, error: 'El RUT es obligatorio' };
  }
  
  const rutLimpio = rut.replace(/[^0-9kK]/g, '');
  if (rutLimpio.length < 8) {
    return { isValid: false, error: 'El RUT debe tener al menos 8 dígitos' };
  }
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toUpperCase();
  
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const resto = suma % 11;
  const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();
  
  if (dv !== dvCalculado) {
    return { isValid: false, error: 'El dígito verificador del RUT es incorrecto' };
  }
  
  return { isValid: true };
}

/**
 * Valida un email
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || email.trim() === '') {
    return { isValid: true }; // Email es opcional
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'El formato del email es inválido' };
  }
  
  return { isValid: true };
}

/**
 * Valida un teléfono
 */
export function validateTelefono(telefono: string): { isValid: boolean; error?: string } {
  if (!telefono || telefono.trim() === '') {
    return { isValid: true }; // Teléfono es opcional
  }
  
  const telefonoLimpio = telefono.replace(/[^0-9]/g, '');
  
  // Teléfono sin prefijo (8-9 dígitos)
  if (telefonoLimpio.length >= 8 && telefonoLimpio.length <= 9) {
    return { isValid: true };
  }
  
  // Teléfono con prefijo +56 (11-12 dígitos)
  if (telefonoLimpio.length >= 11 && telefonoLimpio.length <= 12) {
    if (telefonoLimpio.startsWith('56')) {
      return { isValid: true };
    }
  }
  
  return { isValid: false, error: 'El teléfono debe tener 8-9 dígitos o 11-12 dígitos con prefijo +56' };
}

/**
 * Valida un monto
 */
export function validateMonto(monto: string): { isValid: boolean; error?: string; value?: number } {
  if (!monto || monto.trim() === '') {
    return { isValid: false, error: 'El monto es obligatorio' };
  }
  
  const montoNum = parseFloat(monto);
  if (isNaN(montoNum)) {
    return { isValid: false, error: 'El monto debe ser un número válido' };
  }
  
  if (montoNum <= 0) {
    return { isValid: false, error: 'El monto debe ser mayor a 0' };
  }
  
  if (montoNum > 999999999) {
    return { isValid: false, error: 'El monto no puede ser mayor a 999,999,999' };
  }
  
  return { isValid: true, value: montoNum };
}

/**
 * Valida una fecha
 */
export function validateFecha(fecha: string): { isValid: boolean; error?: string } {
  if (!fecha || fecha.trim() === '') {
    return { isValid: false, error: 'La fecha de vencimiento es obligatoria' };
  }
  
  const fechaObj = new Date(fecha);
  if (isNaN(fechaObj.getTime())) {
    return { isValid: false, error: 'El formato de fecha es inválido (use YYYY-MM-DD)' };
  }
  
  const año = fechaObj.getFullYear();
  if (año < 1900 || año > 2100) {
    return { isValid: false, error: 'La fecha debe estar entre 1900 y 2100' };
  }
  
  return { isValid: true };
}

/**
 * Valida un nombre
 */
export function validateNombre(nombre: string): { isValid: boolean; error?: string } {
  if (!nombre || nombre.trim() === '') {
    return { isValid: false, error: 'El nombre es obligatorio' };
  }
  
  if (nombre.trim().length < 2) {
    return { isValid: false, error: 'El nombre debe tener al menos 2 caracteres' };
  }
  
  if (nombre.trim().length > 100) {
    return { isValid: false, error: 'El nombre no puede tener más de 100 caracteres' };
  }
  
  // Validar que solo contenga letras, espacios, tildes y ñ
  const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
  if (!nombreRegex.test(nombre.trim())) {
    return { isValid: false, error: 'El nombre solo puede contener letras, espacios, tildes y ñ' };
  }
  
  return { isValid: true };
}

/**
 * Resultado de validación de una fila
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  data?: {
    nombre: string;
    rut: string;
    email?: string;
    telefono?: string;
    monto_deuda: number;
    fecha_vencimiento: string;
  };
}

/**
 * Resultado de parseo y validación de CSV
 */
export interface CSVParseResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  validData: Array<{
    nombre: string;
    rut: string;
    email?: string;
    telefono?: string;
    monto_deuda: number;
    fecha_vencimiento: string;
  }>;
  columnMapping: Record<string, string>;
}

/**
 * Parsea y valida un archivo CSV completo
 */
export function parseAndValidateCSV(text: string): CSVParseResult {
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return {
      isValid: false,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: [{ row: 0, field: 'archivo', message: 'El archivo debe tener al menos una fila de encabezados y una fila de datos' }],
      validData: [],
      columnMapping: {}
    };
  }

  const headers = parseCSVLine(lines[0]);
  const columnMapping = mapCSVColumns(headers);
  
  // Verificar columnas obligatorias
  const requiredFields = ['nombre', 'rut', 'monto_deuda', 'fecha_vencimiento'];
  const missingFields = requiredFields.filter(field => !columnMapping[field]);
  
  if (missingFields.length > 0) {
    return {
      isValid: false,
      totalRows: lines.length - 1,
      validRows: 0,
      invalidRows: lines.length - 1,
      errors: [{ row: 0, field: 'archivo', message: `Faltan columnas obligatorias: ${missingFields.join(', ')}` }],
      validData: [],
      columnMapping
    };
  }

  const errors: Array<{ row: number; field: string; message: string }> = [];
  const validData: Array<{
    nombre: string;
    rut: string;
    email?: string;
    telefono?: string;
    monto_deuda: number;
    fecha_vencimiento: string;
  }> = [];

  // Validar cada fila de datos
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const rowNumber = i + 1; // +1 porque empezamos desde la fila 2
    
    // Verificar que tenga la misma cantidad de columnas
    if (values.length !== headers.length) {
      errors.push({
        row: rowNumber,
        field: 'estructura',
        message: `La fila tiene ${values.length} columnas, se esperaban ${headers.length}`
      });
      continue;
    }

    // Obtener valores por campo
    const nombre = values[headers.findIndex(h => h === columnMapping.nombre)] || '';
    const rut = values[headers.findIndex(h => h === columnMapping.rut)] || '';
    const email = columnMapping.email ? values[headers.findIndex(h => h === columnMapping.email)] || '' : '';
    const telefono = columnMapping.telefono ? values[headers.findIndex(h => h === columnMapping.telefono)] || '' : '';
    const monto = values[headers.findIndex(h => h === columnMapping.monto_deuda)] || '';
    const fecha = values[headers.findIndex(h => h === columnMapping.fecha_vencimiento)] || '';

    // Validar cada campo
    const nombreValidation = validateNombre(nombre);
    if (!nombreValidation.isValid) {
      errors.push({ row: rowNumber, field: 'nombre', message: nombreValidation.error! });
    }

    const rutValidation = validateRUT(rut);
    if (!rutValidation.isValid) {
      errors.push({ row: rowNumber, field: 'rut', message: rutValidation.error! });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      errors.push({ row: rowNumber, field: 'email', message: emailValidation.error! });
    }

    const telefonoValidation = validateTelefono(telefono);
    if (!telefonoValidation.isValid) {
      errors.push({ row: rowNumber, field: 'telefono', message: telefonoValidation.error! });
    }

    const montoValidation = validateMonto(monto);
    if (!montoValidation.isValid) {
      errors.push({ row: rowNumber, field: 'monto_deuda', message: montoValidation.error! });
    }

    const fechaValidation = validateFecha(fecha);
    if (!fechaValidation.isValid) {
      errors.push({ row: rowNumber, field: 'fecha_vencimiento', message: fechaValidation.error! });
    }

    // Si todos los campos son válidos, agregar a los datos válidos
    if (nombreValidation.isValid && rutValidation.isValid && emailValidation.isValid && 
        telefonoValidation.isValid && montoValidation.isValid && fechaValidation.isValid) {
      validData.push({
        nombre: nombre.trim(),
        rut: rut.trim(),
        email: email.trim() || undefined,
        telefono: telefono.trim() || undefined,
        monto_deuda: montoValidation.value!,
        fecha_vencimiento: fecha.trim()
      });
    }
  }

  const totalRows = lines.length - 1;
  const validRows = validData.length;
  const invalidRows = totalRows - validRows;

  return {
    isValid: errors.length === 0,
    totalRows,
    validRows,
    invalidRows,
    errors,
    validData,
    columnMapping
  };
}
