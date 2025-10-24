// Parsear entrada del usuario (con coma chilena) a número
export function parsearMontoCLP(input: string): number {
  // Remover puntos de miles y reemplazar coma por punto
  const limpio = input
    .replace(/\./g, '')  // Quitar puntos
    .replace(',', '.')   // Cambiar coma por punto
    .replace(/[^\d.-]/g, '') // Quitar cualquier otro carácter
  
  return parseFloat(limpio) || 0
}

// Formatear número a formato CLP para mostrar
export function formatearMontoCLP(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(monto)
}

// Validar formato de entrada
export function validarMontoCLP(input: string): boolean {
  const patron = /^[\d.,\s]+$/
  return patron.test(input)
}

// Formatear monto para input (con separadores de miles)
export function formatearMontoInput(monto: number): string {
  return monto.toLocaleString('es-CL')
}

// Convertir monto a formato de entrada (con puntos de miles)
export function montoParaInput(monto: number): string {
  return monto.toLocaleString('es-CL')
}
