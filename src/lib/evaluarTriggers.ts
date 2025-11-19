import { createClient } from '@supabase/supabase-js'
import { generarProgramacionDesdeNodo } from './generarProgramacion'

// Cliente con service_role (bypass RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Tipo de evento para triggers
 */
export type TipoEventoTrigger = 
  | 'deuda_creada'
  | 'dias_antes_vencimiento'
  | 'dia_vencimiento'
  | 'dias_despues_vencimiento'
  | 'pago_registrado'

/**
 * Interfaz para un trigger de workflow
 */
interface WorkflowTrigger {
  id: string
  workflow_id: string
  tipo_evento: TipoEventoTrigger
  dias_relativos: number | null
  nodo_entrada_id: string
  activo: boolean
}


/**
 * Evalúa triggers para una deuda específica y genera programaciones automáticamente
 * 
 * @param deuda_id ID de la deuda a evaluar
 * @returns Número de programaciones generadas
 */
export async function evaluarTriggersDeuda(deuda_id: string): Promise<number> {
  try {
    // 1. Obtener información de la deuda
    const { data: deuda, error: deudaError } = await supabase
      .from('deudas')
      .select('id, usuario_id, deudor_id, rut, monto, fecha_vencimiento, estado, eliminada_at')
      .eq('id', deuda_id)
      .is('eliminada_at', null)
      .single()

    if (deudaError || !deuda) {
      console.error('Error obteniendo deuda:', deudaError)
      return 0
    }

    // Solo evaluar deudas activas (no pagadas, no canceladas)
    if (deuda.estado === 'pagado' || deuda.estado === 'cancelada') {
      return 0
    }

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const fechaVencimiento = new Date(deuda.fecha_vencimiento)
    fechaVencimiento.setHours(0, 0, 0, 0)

    // 2. Buscar workflows automáticos activos del usuario
    const { data: workflows, error: workflowsError } = await supabase
      .from('workflows_cobranza')
      .select('id, nombre, estado, tipo')
      .eq('usuario_id', deuda.usuario_id)
      .eq('tipo', 'automatico')
      .in('estado', ['activo', 'pausado'])

    if (workflowsError || !workflows || workflows.length === 0) {
      console.log(`No hay workflows automáticos activos para usuario ${deuda.usuario_id}`)
      return 0
    }

    let programacionesGeneradas = 0

    // 3. Para cada workflow, buscar triggers activos
    for (const workflow of workflows) {
      const { data: triggers, error: triggersError } = await supabase
        .from('workflow_triggers')
        .select('*')
        .eq('workflow_id', workflow.id)
        .eq('activo', true)

      if (triggersError || !triggers || triggers.length === 0) {
        continue
      }

      // 4. Evaluar cada trigger
      for (const trigger of triggers as WorkflowTrigger[]) {
        const aplica = await evaluarTrigger(trigger, deuda, hoy, fechaVencimiento)
        
        if (!aplica) {
          continue
        }

        // 5. Verificar estado de deuda en workflow_deuda_state
        const { data: estadoExistente } = await supabase
          .from('workflow_deuda_state')
          .select('*')
          .eq('workflow_id', workflow.id)
          .eq('deuda_id', deuda_id)
          .maybeSingle()

        // Verificar si ya se ejecutó este nodo
        const nodoYaEjecutado = estadoExistente?.ultimo_nodo_id === trigger.nodo_entrada_id

        if (!nodoYaEjecutado) {
          // Generar programación desde el nodo de entrada
          const generada = await generarProgramacionDesdeNodo(
            trigger.nodo_entrada_id,
            deuda_id,
            workflow.id,
            trigger.tipo_evento,
            trigger.dias_relativos,
            deuda.fecha_vencimiento
          )

          if (generada) {
            programacionesGeneradas++
          }
        }
      }
    }

    return programacionesGeneradas
  } catch (error) {
    console.error('Error en evaluarTriggersDeuda:', error)
    return 0
  }
}

/**
 * Evalúa si un trigger aplica para una deuda en un momento dado
 */
async function evaluarTrigger(
  trigger: WorkflowTrigger,
  deuda: {
    id: string
    estado: string
    fecha_vencimiento: string
  },
  hoy: Date,
  fechaVencimiento: Date
): Promise<boolean> {
  switch (trigger.tipo_evento) {
    case 'deuda_creada':
      // Aplica si estado = 'nueva' y fecha_vencimiento >= hoy
      return deuda.estado === 'nueva' && fechaVencimiento >= hoy

    case 'dias_antes_vencimiento':
      // Aplica si hoy = fecha_vencimiento - dias_relativos
      if (trigger.dias_relativos === null) return false
      const fechaObjetivo = new Date(fechaVencimiento)
      fechaObjetivo.setDate(fechaObjetivo.getDate() - trigger.dias_relativos)
      fechaObjetivo.setHours(0, 0, 0, 0)
      return hoy.getTime() === fechaObjetivo.getTime()

    case 'dia_vencimiento':
      // Aplica si hoy = fecha_vencimiento
      return hoy.getTime() === fechaVencimiento.getTime()

    case 'dias_despues_vencimiento':
      // Aplica si hoy = fecha_vencimiento + dias_relativos y estado = 'vencida'
      if (trigger.dias_relativos === null) return false
      if (deuda.estado !== 'vencida') return false
      const fechaObjetivoDespues = new Date(fechaVencimiento)
      fechaObjetivoDespues.setDate(fechaObjetivoDespues.getDate() + trigger.dias_relativos)
      fechaObjetivoDespues.setHours(0, 0, 0, 0)
      return hoy.getTime() === fechaObjetivoDespues.getTime()

    case 'pago_registrado':
      // Aplica si hay pago confirmado reciente (últimas 24 horas)
      const { data: pagos } = await supabase
        .from('pagos')
        .select('id')
        .eq('deuda_id', deuda.id)
        .eq('estado', 'confirmado')
        .is('eliminada_at', null)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1)

      return (pagos && pagos.length > 0) || false

    default:
      return false
  }
}

/**
 * Evalúa triggers para todas las deudas activas
 * Útil para ejecutar desde el cron job diario
 * 
 * @param limite Número máximo de deudas a evaluar (por defecto 1000)
 * @returns Número total de programaciones generadas
 */
export async function evaluarTriggersTodasDeudas(limite: number = 1000): Promise<number> {
  try {
    // Obtener deudas activas (no pagadas, no canceladas, no eliminadas)
    const { data: deudas, error: deudasError } = await supabase
      .from('deudas')
      .select('id')
      .is('eliminada_at', null)
      .neq('estado', 'pagado')
      .neq('estado', 'cancelada')
      .limit(limite)

    if (deudasError || !deudas || deudas.length === 0) {
      console.log('No hay deudas activas para evaluar triggers')
      return 0
    }

    let totalProgramaciones = 0

    // Evaluar triggers para cada deuda
    for (const deuda of deudas) {
      const generadas = await evaluarTriggersDeuda(deuda.id)
      totalProgramaciones += generadas
    }

    console.log(`✅ Evaluación de triggers completada: ${totalProgramaciones} programaciones generadas para ${deudas.length} deudas`)
    return totalProgramaciones
  } catch (error) {
    console.error('Error en evaluarTriggersTodasDeudas:', error)
    return 0
  }
}

