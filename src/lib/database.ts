/**
 * Configuración y utilidades para la base de datos
 * Incluye tipos TypeScript y funciones helper
 */

import { supabase } from './supabase';

// =============================================
// TIPOS TYPESCRIPT PARA LAS TABLAS
// =============================================

export interface Deudor {
  id: string;
  usuario_id: string;
  nombre: string;
  rut?: string;
  email?: string;
  telefono?: string;
  monto_deuda: number;
  fecha_vencimiento?: string;
  estado: 'nueva' | 'en_proceso' | 'parcialmente_pagada' | 'pagada' | 'vencida' | 'cancelada';
  created_at: string;
  updated_at: string;
}

export interface HistorialEmail {
  id: string;
  usuario_id: string;
  deudor_id: string;
  email_destinatario: string;
  asunto: string;
  estado: 'enviado' | 'fallido' | 'abierto' | 'rebotado';
  fecha_envio: string;
  detalles?: unknown;
  created_at: string;
}

export interface CreateDeudorData {
  nombre: string;
  rut?: string;
  email?: string;
  telefono?: string;
  monto_deuda: number;
  fecha_vencimiento?: string;
  estado?: 'nueva' | 'en_proceso' | 'parcialmente_pagada' | 'pagada' | 'vencida' | 'cancelada';
}

export interface CreateEmailData {
  deudor_id: string;
  email_destinatario: string;
  asunto: string;
  estado?: 'enviado' | 'fallido' | 'abierto' | 'rebotado';
  detalles?: unknown;
}

export interface UserStats {
  total_deudores: number;
  deuda_total: number;
  emails_enviados: number;
  emails_abiertos: number;
  emails_fallidos: number;
}

export interface DeudorVencido {
  id: string;
  nombre: string;
  monto_deuda: number;
  fecha_vencimiento: string;
  dias_vencido: number;
}

// =============================================
// FUNCIONES PARA DEUDORES
// =============================================

export async function createDeudor(data: CreateDeudorData) {
  // Validar sesión y obtener usuario (requerido por RLS)
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    throw new Error('No hay sesión activa. Inicia sesión para crear deudores.');
  }

  // Determinar estado automático si no se proporciona
  const estadoAutomatico = data.estado || determinarEstadoAutomatico(data.fecha_vencimiento);

  // Normalizar datos antes de insertar
  const payload = {
    usuario_id: userData.user.id,
    nombre: data.nombre.trim(),
    rut: data.rut ? normalizarRUT(data.rut) : null,
    email: data.email?.trim() || null,
    telefono: data.telefono?.trim() || null,
    monto_deuda: data.monto_deuda,
    fecha_vencimiento: data.fecha_vencimiento || null,
    estado: estadoAutomatico,
  };

  const { data: result, error } = await supabase
    .from('deudores')
    .insert([payload])
    .select()
    .single();

  if (error) {
    // Log adicional para depuración
    console.error('Error al crear deudor:', error, 'payload:', payload);
    throw error;
  }
  return result;
}

export async function getDeudores() {
  const { data, error } = await supabase
    .from('deudores')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getDeudorById(id: string) {
  const { data, error } = await supabase
    .from('deudores')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateDeudor(id: string, updates: Partial<CreateDeudorData>) {
  const updatesToSave: Partial<CreateDeudorData> = { ...updates };

  // Normalizar/eliminar RUT si viene en la actualización
  if (Object.prototype.hasOwnProperty.call(updatesToSave, 'rut')) {
    const nuevoRut = updatesToSave.rut as string | undefined;
    updatesToSave.rut = nuevoRut ? normalizarRUT(nuevoRut) : undefined;
  }

  const { data, error } = await supabase
    .from('deudores')
    .update(updatesToSave)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDeudor(id: string) {
  const { error } = await supabase
    .from('deudores')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function createDeudoresMasivo(deudores: CreateDeudorData[]) {
  if (deudores.length === 0) {
    throw new Error('No hay deudores para insertar');
  }

  // Obtener usuario actual para cumplir RLS (usuario_id es obligatorio)
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    throw new Error('No hay sesión activa. Inicia sesión para importar deudores.');
  }
  const usuarioId = userData.user.id;

  // Validar y preparar datos para inserción masiva
  const datosParaInsertar = deudores.map((deudor, index) => {
    // Validar campos obligatorios
    if (!deudor.nombre || deudor.nombre.trim() === '') {
      throw new Error(`Deudor ${index + 1}: El nombre es obligatorio`);
    }
    if (!deudor.monto_deuda || deudor.monto_deuda <= 0) {
      throw new Error(`Deudor ${index + 1}: El monto debe ser mayor a 0`);
    }

    // Preparar datos con valores por defecto
    return {
      usuario_id: usuarioId,
      nombre: deudor.nombre.trim(),
      rut: deudor.rut ? normalizarRUT(deudor.rut) : null,
      email: deudor.email?.trim() || null,
      telefono: deudor.telefono?.trim() || null,
      monto_deuda: deudor.monto_deuda,
      fecha_vencimiento: deudor.fecha_vencimiento || null,
      estado: deudor.estado || 'nueva'
    };
  });

  console.log('Datos preparados para inserción:', datosParaInsertar.slice(0, 2)); // Log de los primeros 2 para debug

  const { data, error } = await supabase
    .from('deudores')
    .insert(datosParaInsertar)
    .select();

  if (error) {
    console.error('Error en inserción masiva:', error);
    console.error('Datos que causaron el error:', datosParaInsertar);
    throw new Error(`Error al insertar deudores: ${error.message || 'Error desconocido'}`);
  }

  return data;
}

// =============================================
// FUNCIONES PARA GESTIÓN DE ESTADOS
// =============================================

export async function cambiarEstadoDeuda(deudorId: string, nuevoEstado: string) {
  const { data, error } = await supabase.rpc('cambiar_estado_deuda', {
    deudor_id_param: deudorId,
    nuevo_estado: nuevoEstado,
    usuario_uuid: (await supabase.auth.getUser()).data.user?.id
  });

  if (error) throw error;
  return data;
}

export async function getDeudoresPorEstado(estado?: string) {
  const { data, error } = await supabase.rpc('get_deudores_por_estado', {
    user_uuid: (await supabase.auth.getUser()).data.user?.id,
    estado_filtro: estado || null
  });

  if (error) throw error;
  return data;
}

export async function getEstadisticasEstados() {
  const { data, error } = await supabase.rpc('get_user_stats', {
    user_uuid: (await supabase.auth.getUser()).data.user?.id
  });

  if (error) throw error;
  return data;
}

// =============================================
// FUNCIONES PARA HISTORIAL DE EMAILS
// =============================================

export async function createEmailRecord(data: CreateEmailData) {
  const { data: result, error } = await supabase
    .from('historial_emails')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function getEmailHistory(deudorId?: string) {
  let query = supabase
    .from('historial_emails')
    .select(`
      *,
      deudores (
        id,
        nombre
      )
    `)
    .order('fecha_envio', { ascending: false });

  if (deudorId) {
    query = query.eq('deudor_id', deudorId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function updateEmailStatus(id: string, estado: HistorialEmail['estado'], detalles?: unknown) {
  const { data, error } = await supabase
    .from('historial_emails')
    .update({ estado, detalles })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// FUNCIONES DE ESTADÍSTICAS
// =============================================

export async function getUserStats(): Promise<UserStats> {
  const { data, error } = await supabase.rpc('get_user_stats');

  if (error) throw error;
  return data;
}

export async function getDeudoresVencidos(): Promise<DeudorVencido[]> {
  const { data, error } = await supabase.rpc('get_deudores_vencidos');

  if (error) throw error;
  return data;
}

// =============================================
// FUNCIONES DE BÚSQUEDA Y FILTROS
// =============================================

export async function searchDeudores(searchTerm: string) {
  const { data, error } = await supabase
    .from('deudores')
    .select('*')
    .ilike('nombre', `%${searchTerm}%`)
    .order('nombre');

  if (error) throw error;
  return data;
}

export async function getDeudoresByVencimiento(dias: number) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + dias);

  const { data, error } = await supabase
    .from('deudores')
    .select('*')
    .lte('fecha_vencimiento', fechaLimite.toISOString().split('T')[0])
    .order('fecha_vencimiento');

  if (error) throw error;
  return data;
}

// =============================================
// FUNCIONES DE UTILIDAD
// =============================================

export async function getDeudorWithEmails(deudorId: string) {
  const { data, error } = await supabase
    .from('deudores')
    .select(`
      *,
      historial_emails (
        id,
        email_destinatario,
        asunto,
        estado,
        fecha_envio
      )
    `)
    .eq('id', deudorId)
    .single();

  if (error) throw error;
  return data;
}

export async function getEmailStats() {
  const { data, error } = await supabase
    .from('historial_emails')
    .select('estado')
    .order('fecha_envio', { ascending: false });

  if (error) throw error;

  const stats = data.reduce((acc, email) => {
    acc[email.estado] = (acc[email.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return stats;
}

// =============================================
// CONSTANTES ÚTILES
// =============================================

export const EMAIL_ESTADOS = {
  ENVIADO: 'enviado' as const,
  FALLIDO: 'fallido' as const,
  ABIERTO: 'abierto' as const,
  REBOTADO: 'rebotado' as const,
} as const;

export const DEUDA_ESTADOS = {
  VIGENTE: 'vigente',
  VENCIDA: 'vencida',
  PRONTO_VENCER: 'pronto_vencer',
} as const;

// =============================================
// CONSTANTES PARA ESTADOS DE DEUDAS
// =============================================

export const ESTADOS_DEUDA = {
  NUEVA: 'nueva',
  EN_PROCESO: 'en_proceso',
  PARCIALMENTE_PAGADA: 'parcialmente_pagada',
  PAGADA: 'pagada',
  VENCIDA: 'vencida',
  CANCELADA: 'cancelada',
} as const;

export const ESTADOS_DEUDA_CONFIG = {
  [ESTADOS_DEUDA.NUEVA]: {
    label: 'Nueva',
    color: 'bg-blue-100 text-blue-800',
    icon: '🆕',
    description: 'Deuda recién registrada'
  },
  [ESTADOS_DEUDA.EN_PROCESO]: {
    label: 'En Proceso',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '🔄',
    description: 'Cobrando activamente'
  },
  [ESTADOS_DEUDA.PARCIALMENTE_PAGADA]: {
    label: 'Parcialmente Pagada',
    color: 'bg-orange-100 text-orange-800',
    icon: '🟠',
    description: 'Pago parcial recibido'
  },
  [ESTADOS_DEUDA.PAGADA]: {
    label: 'Pagada',
    color: 'bg-green-100 text-green-800',
    icon: '✅',
    description: 'Completamente saldada'
  },
  [ESTADOS_DEUDA.VENCIDA]: {
    label: 'Vencida',
    color: 'bg-red-100 text-red-800',
    icon: '🔴',
    description: 'Pasó la fecha límite'
  },
  [ESTADOS_DEUDA.CANCELADA]: {
    label: 'Cancelada',
    color: 'bg-gray-100 text-gray-800',
    icon: '⚫',
    description: 'No se puede cobrar'
  },
} as const;

// =============================================
// FUNCIONES DE UTILIDAD PARA DEUDORES
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
