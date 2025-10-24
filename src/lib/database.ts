/**
 * Configuración y utilidades para la base de datos
 * Tipos TypeScript y funciones helper para la nueva estructura de BD
 */

// =============================================
// CONSTANTES DE ESTADOS DE DEUDA
// =============================================

export const ESTADOS_DEUDA = {
  NUEVA: 'nueva',
  PENDIENTE: 'pendiente',
  PAGADO: 'pagado',
} as const;

export const ESTADOS_DEUDA_CONFIG = {
  nueva: {
    label: 'Nueva',
    color: 'bg-blue-100 text-blue-800',
    icon: '🆕',
  },
  pendiente: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '⏳',
  },
  pagado: {
    label: 'Pagado',
    color: 'bg-green-100 text-green-800',
    icon: '✅',
  },
} as const;

// =============================================
// TIPOS TYPESCRIPT PARA LAS TABLAS (NUEVA ESTRUCTURA)
// =============================================

export interface Usuario {
  id: string;
  email: string;
  nombre_empresa: string;
  plan_suscripcion_id?: string;
  created_at: string;
}

export interface Deudor {
  id: string;
  usuario_id: string;
  rut: string;  // Normalizado: "19090595-0"
  nombre: string;
  created_at: string;
}

export interface Contacto {
  id: string;
  usuario_id: string;
  deudor_id: string;
  rut: string;
  tipo_contacto: 'email' | 'telefono' | 'sms' | 'whatsapp';
  valor: string;  // El email o teléfono
  preferido: boolean;
  created_at: string;
}

export interface Deuda {
  id: string;
  usuario_id: string;
  deudor_id: string;
  rut: string;
  monto: number;
  fecha_vencimiento: string;
  estado: 'nueva' | 'pendiente' | 'pagado';
  created_at: string;
}

export interface Campana {
  id: string;
  usuario_id: string;
  nombre: string;
  tipo: 'email' | 'llamada' | 'sms' | 'whatsapp' | 'mixto';
  plantilla_id?: string;
  programacion: Record<string, unknown>;  // JSONB
  deudas_asignadas: string[];  // Array de UUIDs
  activa: boolean;
  created_at: string;
}

export interface Plantilla {
  id: string;
  usuario_id: string;
  nombre: string;
  tipo: 'email' | 'voz' | 'sms' | 'whatsapp';
  contenido: string;
  created_at: string;
}

export interface Historial {
  id: string;
  usuario_id: string;
  deuda_id: string;
  rut: string;
  contacto_id?: string;
  campana_id?: string;
  tipo_accion: 'email' | 'llamada' | 'sms' | 'whatsapp';
  fecha: string;
  estado: string;
  detalles?: Record<string, unknown>;  // JSONB
  created_at: string;
}

export interface Pago {
  id: string;
  usuario_id: string;
  deuda_id: string;
  rut: string;
  monto_pagado: number;
  fecha_pago: string;
  metodo: string;
  estado: 'confirmado' | 'pendiente';
  referencia_externa?: string;
  created_at: string;
}

export interface Programacion {
  id: string;
  usuario_id: string;
  deuda_id: string;
  rut: string;
  contacto_id?: string;
  campana_id?: string;
  tipo_accion: 'email' | 'llamada' | 'sms' | 'whatsapp';
  fecha_programada: string;
  plantilla_id?: string;
  estado: 'pendiente' | 'ejecutado' | 'cancelado';
  created_at: string;
}

export interface AgenteConversacion {
  id: string;
  usuario_id: string;
  agente_id?: string;
  historial_id?: string;
  external_conversation_id?: string;
  resumen?: string;
  metrics?: Record<string, unknown>;  // JSONB
  created_at: string;
}

export interface AgenteConversacionTurno {
  id: string;
  conversacion_id: string;
  turno: number;
  who: 'agente' | 'deudor';
  text: string;
  started_at: string;
  ended_at?: string;
}

export interface PagoUsuario {
  id: string;
  usuario_id: string;
  suscripcion_id: string;
  monto: number;
  fecha_pago: string;
  metodo: string;
  estado: 'confirmado' | 'pendiente' | 'fallido';
  referencia_externa?: string;
  created_at: string;
}

export interface Uso {
  id: string;
  usuario_id: string;
  periodo: string;  // YYYY-MM
  emails_enviados: number;
  llamadas_ejecutadas: number;
  duracion_llamadas: number;
  costo_llamadas: number;
  sms_enviados: number;
  whatsapp_enviados: number;
  costo_total: number;
  created_at: string;
}

export interface Configuracion {
  id: string;
  usuario_id?: string;  // null para configuraciones globales
  clave: string;
  valor: Record<string, unknown>;  // JSONB
  created_at: string;
}

export interface Suscripcion {
  id: string;
  nombre: string;
  descripcion?: string;
  precio_mensual: number;
  limite_emails: number;
  limite_llamadas: number;
  limite_sms: number;
  limite_whatsapp: number;
  limite_memoria_mb: number;
  activo: boolean;
  created_at: string;
}

export interface LlamadaAgente {
  id: string;
  usuario_id: string;
  nombre: string;
  descripcion?: string;
  voz_id: string;
  prompt_sistema: string;
  configuracion: Record<string, unknown>;  // JSONB
  activo: boolean;
  created_at: string;
}

// =============================================
// FUNCIONES DE UTILIDAD (MANTENIDAS DEL ARCHIVO ANTERIOR)
// =============================================

/**
 * Valida un RUT chileno
 */
export function validarRUT(rut: string): boolean {
  if (!rut || rut.trim() === '') return false;
  
  const rutLimpio = rut.replace(/[^0-9kK]/g, '');
  if (rutLimpio.length < 8) return false;
  
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
  
  return dv === dvCalculado;
}

/**
 * Formatea un RUT chileno
 */
export function formatearRUT(rut: string): string {
  if (!rut) return '';
  
  const rutLimpio = rut.replace(/[^0-9kK]/g, '');
  if (rutLimpio.length < 8) return rut;
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toUpperCase();
  
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

/**
 * Normaliza un RUT a formato canónico para almacenar en DB: "cuerpo-DV"
 * - Remueve todo excepto dígitos y K/k
 * - DV en mayúscula
 * - Sin puntos; con guion
 */
export function normalizarRUT(rut: string): string {
  if (!rut) return '';
  const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) return '';
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

/**
 * Valida un email
 */
export function validarEmail(email: string): boolean {
  if (!email || email.trim() === '') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida un teléfono chileno (con o sin prefijo)
 */
export function validarTelefono(telefono: string): boolean {
  if (!telefono || telefono.trim() === '') return false;
  const telefonoLimpio = telefono.replace(/[^0-9]/g, '');
  
  // Teléfono chileno sin prefijo (8-9 dígitos)
  if (telefonoLimpio.length >= 8 && telefonoLimpio.length <= 9) {
    return true;
  }
  
  // Teléfono chileno con prefijo +56 (11-12 dígitos)
  if (telefonoLimpio.length >= 11 && telefonoLimpio.length <= 12) {
    // Verificar que empiece con 56 (prefijo de Chile)
    return telefonoLimpio.startsWith('56');
  }
  
  return false;
}

/**
 * Formatea un teléfono chileno (con o sin prefijo)
 */
export function formatearTelefono(telefono: string): string {
  if (!telefono) return '';
  
  const telefonoLimpio = telefono.replace(/[^0-9]/g, '');
  
  // Teléfono sin prefijo (8-9 dígitos)
  if (telefonoLimpio.length === 8) {
    return `${telefonoLimpio.slice(0, 4)} ${telefonoLimpio.slice(4)}`;
  } else if (telefonoLimpio.length === 9) {
    return `${telefonoLimpio.slice(0, 1)} ${telefonoLimpio.slice(1, 5)} ${telefonoLimpio.slice(5)}`;
  }
  
  // Teléfono con prefijo +56 (11-12 dígitos)
  if (telefonoLimpio.length === 11 && telefonoLimpio.startsWith('56')) {
    // +56 9 1234 5678
    return `+${telefonoLimpio.slice(0, 2)} ${telefonoLimpio.slice(2, 3)} ${telefonoLimpio.slice(3, 7)} ${telefonoLimpio.slice(7)}`;
  } else if (telefonoLimpio.length === 12 && telefonoLimpio.startsWith('56')) {
    // +56 9 1234 5678
    return `+${telefonoLimpio.slice(0, 2)} ${telefonoLimpio.slice(2, 3)} ${telefonoLimpio.slice(3, 7)} ${telefonoLimpio.slice(7)}`;
  }
  
  return telefono;
}

/**
 * Formatea un monto de dinero
 */
export function formatearMonto(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(monto);
}

/**
 * Calcula días vencidos desde una fecha
 */
export function calcularDiasVencidos(fechaVencimiento: string): number {
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diferencia = hoy.getTime() - vencimiento.getTime();
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

/**
 * Determina el estado automático de una deuda según la fecha
 */
export function determinarEstadoAutomatico(fechaVencimiento?: string): 'nueva' | 'vencida' {
  if (!fechaVencimiento) return 'nueva';
  
  const diasVencidos = calcularDiasVencidos(fechaVencimiento);
  return diasVencidos > 0 ? 'vencida' : 'nueva';
}
