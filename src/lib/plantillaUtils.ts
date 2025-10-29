// Variables disponibles en el sistema (basadas en BD/documentación)
export const VARIABLES_SISTEMA = [
  { variable: '{{nombre}}', nombre: 'nombre', descripcion: 'Nombre del deudor', valorDummy: 'Juan Pérez' },
  { variable: '{{monto}}', nombre: 'monto', descripcion: 'Monto de la deuda', valorDummy: '$150.000' },
  { variable: '{{fecha_vencimiento}}', nombre: 'fecha_vencimiento', descripcion: 'Fecha de vencimiento', valorDummy: '15 de enero, 2025' },
  { variable: '{{empresa}}', nombre: 'empresa', descripcion: 'Nombre de tu empresa', valorDummy: 'Mi Empresa' },
  { variable: '{{telefono}}', nombre: 'telefono', descripcion: 'Teléfono de contacto', valorDummy: '+56912345678' },
  { variable: '{{email}}', nombre: 'email', descripcion: 'Email de contacto', valorDummy: 'contacto@miempresa.com' }
] as const

/**
 * Detecta todas las variables en un contenido usando regex
 * @param contenido - Contenido donde buscar variables
 * @returns Array de nombres de variables únicos (sin las llaves {{}})
 */
export function detectarVariables(contenido: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(contenido)) !== null) {
    const nombreVariable = match[1].trim()
    if (nombreVariable && !variables.includes(nombreVariable)) {
      variables.push(nombreVariable)
    }
  }

  return variables
}

/**
 * Obtiene información completa de las variables detectadas
 * @param variablesDetectadas - Array de nombres de variables detectadas
 * @returns Array con información completa de cada variable
 */
export function obtenerVariablesConInfo(
  variablesDetectadas: string[]
): Array<{ variable: string; nombre: string; descripcion: string; valorDummy: string }> {
  return variablesDetectadas.map(nombre => {
    const variableSistema = VARIABLES_SISTEMA.find(v => v.nombre === nombre)
    
    if (variableSistema) {
      return {
        variable: variableSistema.variable,
        nombre: variableSistema.nombre,
        descripcion: variableSistema.descripcion,
        valorDummy: variableSistema.valorDummy
      }
    }
    
    // Variable desconocida - usar valores genéricos
    return {
      variable: `{{${nombre}}}`,
      nombre,
      descripcion: 'Variable personalizada',
      valorDummy: 'Valor personalizado'
    }
  })
}

/**
 * Reemplaza todas las variables en un contenido con los valores proporcionados
 * @param contenido - Contenido con variables a reemplazar
 * @param variables - Objeto con los valores de las variables (ej: { nombre: 'Juan', monto: '$100' })
 * @returns Contenido con variables reemplazadas
 */
export function reemplazarVariables(contenido: string, variables: Record<string, string>): string {
  let resultado = contenido
  
  // Reemplazar cada variable encontrada
  Object.entries(variables).forEach(([nombre, valor]) => {
    const regex = new RegExp(`\\{\\{${nombre}\\}\\}`, 'g')
    resultado = resultado.replace(regex, valor)
  })
  
  return resultado
}

