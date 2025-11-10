import { createClient } from '@supabase/supabase-js'

// Cliente con service_role para operaciones del servidor
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Interfaz para registrar un log de ejecución
 */
export interface LogEjecucionParams {
  ejecucion_id: string
  nodo_id: string
  paso_numero: number
  tipo_accion: 'email' | 'llamada' | 'sms' | 'espera' | 'condicion' | 'filtro' | 'whatsapp'
  estado: 'iniciado' | 'completado' | 'fallido' | 'saltado'
  datos_entrada?: Record<string, unknown>
  datos_salida?: Record<string, unknown>
  error_message?: string
  duracion_ms?: number
}

/**
 * Registra un log de ejecución en la tabla logs_ejecucion
 * Si falla, no bloquea la ejecución (solo loguea el error)
 */
export async function registrarLogEjecucion(params: LogEjecucionParams): Promise<void> {
  try {
    const { error } = await supabase
      .from('logs_ejecucion')
      .insert({
        ejecucion_id: params.ejecucion_id,
        nodo_id: params.nodo_id,
        paso_numero: params.paso_numero,
        tipo_accion: params.tipo_accion,
        estado: params.estado,
        datos_entrada: params.datos_entrada || null,
        datos_salida: params.datos_salida || null,
        error_message: params.error_message || null,
        duracion_ms: params.duracion_ms || null,
        ejecutado_at: new Date().toISOString()
      })

    if (error) {
      // No lanzar error, solo loguear para no bloquear la ejecución
      console.error('Error registrando log de ejecución:', error)
    }
  } catch (error) {
    // No lanzar error, solo loguear para no bloquear la ejecución
    console.error('Error registrando log de ejecución:', error)
  }
}

/**
 * Crea una ejecución de workflow en la tabla ejecuciones_workflow
 * Retorna el ID de la ejecución creada
 */
export async function crearEjecucionWorkflow(params: {
  workflow_id: string
  deudor_id: string
  usuario_id: string
  contexto_datos?: Record<string, unknown>
}): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('ejecuciones_workflow')
      .insert({
        workflow_id: params.workflow_id,
        deudor_id: params.deudor_id,
        estado: 'ejecutando',
        paso_actual: 0,
        contexto_datos: params.contexto_datos || {},
        iniciado_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creando ejecución de workflow:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('Error creando ejecución de workflow:', error)
    return null
  }
}

/**
 * Actualiza el estado de una ejecución de workflow
 */
export async function actualizarEjecucionWorkflow(
  ejecucion_id: string,
  updates: {
    estado?: 'pendiente' | 'ejecutando' | 'completado' | 'fallido' | 'pausado'
    paso_actual?: number
    contexto_datos?: Record<string, unknown>
    resultado_final?: Record<string, unknown>
    proxima_ejecucion?: string
  }
): Promise<void> {
  try {
    const updateData: Record<string, unknown> = {}

    if (updates.estado) {
      updateData.estado = updates.estado
    }
    if (updates.paso_actual !== undefined) {
      updateData.paso_actual = updates.paso_actual
    }
    if (updates.contexto_datos) {
      updateData.contexto_datos = updates.contexto_datos
    }
    if (updates.resultado_final) {
      updateData.resultado_final = updates.resultado_final
    }
    if (updates.proxima_ejecucion) {
      updateData.proxima_ejecucion = updates.proxima_ejecucion
    }

    // Si el estado es completado o fallido, actualizar completado_at
    if (updates.estado === 'completado' || updates.estado === 'fallido') {
      updateData.completado_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('ejecuciones_workflow')
      .update(updateData)
      .eq('id', ejecucion_id)

    if (error) {
      console.error('Error actualizando ejecución de workflow:', error)
    }
  } catch (error) {
    console.error('Error actualizando ejecución de workflow:', error)
  }
}

