import { createClient } from '@supabase/supabase-js'

// Cliente con service_role para operaciones del servidor
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Interfaz para programar una acción desde un nodo
 */
export interface ProgramarAccionParams {
  usuario_id: string
  deuda_id: string
  rut: string
  contacto_id?: string
  campana_id?: string
  tipo_accion: 'email' | 'llamada' | 'sms' | 'whatsapp'
  fecha_programada: string // ISO string
  plantilla_id?: string
  agente_id?: string
  vars?: Record<string, string>
  voz_config?: Record<string, unknown>
}

/**
 * Programa una acción en la tabla programaciones
 */
export async function programarAccion(params: ProgramarAccionParams): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase
      .from('programaciones')
      .insert({
        usuario_id: params.usuario_id,
        deuda_id: params.deuda_id,
        rut: params.rut,
        contacto_id: params.contacto_id || null,
        campana_id: params.campana_id || null,
        tipo_accion: params.tipo_accion,
        fecha_programada: params.fecha_programada,
        plantilla_id: params.plantilla_id || null,
        agente_id: params.agente_id || null,
        vars: params.vars || {},
        voz_config: params.voz_config || {},
        estado: 'pendiente'
      })
      .select('id')
      .single()

    if (error) {
      // Si es error de duplicado, ignorar (ya existe la programación)
      if (error.code === '23505') {
        console.log('Programación duplicada ignorada:', params)
        return null
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error programando acción:', error)
    throw error
  }
}

/**
 * Calcula la próxima fecha considerando días laborables y zona horaria
 */
export function calcularProximaFecha(
  fechaBase: Date,
  duracion: { tipo: 'minutos' | 'horas' | 'dias' | 'semanas', cantidad: number },
  configuracion: {
    solo_dias_laborables?: boolean
    excluir_fines_semana?: boolean
    zona_horaria?: string
    horario_trabajo?: { inicio: string, fin: string }
  }
): Date {
  let fecha = new Date(fechaBase)

  // Aplicar zona horaria si se especifica
  if (configuracion.zona_horaria) {
    // Convertir a la zona horaria especificada
    const fechaStr = fecha.toLocaleString('en-US', { timeZone: configuracion.zona_horaria })
    fecha = new Date(fechaStr)
  }

  // Calcular fecha base según duración
  switch (duracion.tipo) {
    case 'minutos':
      fecha.setMinutes(fecha.getMinutes() + duracion.cantidad)
      break
    case 'horas':
      fecha.setHours(fecha.getHours() + duracion.cantidad)
      break
    case 'dias':
      fecha.setDate(fecha.getDate() + duracion.cantidad)
      break
    case 'semanas':
      fecha.setDate(fecha.getDate() + (duracion.cantidad * 7))
      break
  }

  // Si solo días laborables, ajustar para evitar fines de semana
  if (configuracion.solo_dias_laborables || configuracion.excluir_fines_semana) {
    while (fecha.getDay() === 0 || fecha.getDay() === 6) {
      fecha.setDate(fecha.getDate() + 1)
    }
  }

  // Ajustar horario si se especifica horario de trabajo
  if (configuracion.horario_trabajo) {
    const [horaInicio, minutoInicio] = configuracion.horario_trabajo.inicio.split(':').map(Number)
    const [horaFin, minutoFin] = configuracion.horario_trabajo.fin.split(':').map(Number)
    
    const horaActual = fecha.getHours()
    const minutoActual = fecha.getMinutes()

    // Si está fuera del horario, mover al inicio del siguiente día laborable
    if (horaActual < horaInicio || (horaActual === horaInicio && minutoActual < minutoInicio)) {
      fecha.setHours(horaInicio, minutoInicio, 0, 0)
    } else if (horaActual > horaFin || (horaActual === horaFin && minutoActual > minutoFin)) {
      fecha.setDate(fecha.getDate() + 1)
      fecha.setHours(horaInicio, minutoInicio, 0, 0)
      
      // Si cae en fin de semana, mover al lunes
      if (configuracion.solo_dias_laborables || configuracion.excluir_fines_semana) {
        while (fecha.getDay() === 0 || fecha.getDay() === 6) {
          fecha.setDate(fecha.getDate() + 1)
        }
      }
    }
  }

  return fecha
}

/**
 * Programa múltiples acciones para una lista de deudores
 */
export async function programarAccionesMultiples(
  deudores: Array<{
    deuda_id: string
    rut: string
    contacto_id?: string
    vars?: Record<string, string>
  }>,
  params: Omit<ProgramarAccionParams, 'deuda_id' | 'rut' | 'contacto_id'> & { vars?: Record<string, string> }
): Promise<{ exitosas: number, fallidas: number }> {
  let exitosas = 0
  let fallidas = 0

  for (const deudor of deudores) {
    try {
      const resultado = await programarAccion({
        ...params,
        deuda_id: deudor.deuda_id,
        rut: deudor.rut,
        contacto_id: deudor.contacto_id,
        vars: { ...params.vars, ...deudor.vars }
      })
      
      if (resultado) {
        exitosas++
      }
    } catch (error) {
      console.error(`Error programando acción para deudor ${deudor.deuda_id}:`, error)
      fallidas++
    }
  }

  return { exitosas, fallidas }
}

/**
 * Obtiene la fecha actual en formato ISO
 */
export function obtenerFechaActual(): string {
  return new Date().toISOString()
}

/**
 * Calcula días vencidos desde una fecha de vencimiento
 */
export function calcularDiasVencidos(fechaVencimiento: string): number {
  const fechaVenc = new Date(fechaVencimiento)
  const ahora = new Date()
  const diffTime = ahora.getTime() - fechaVenc.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

