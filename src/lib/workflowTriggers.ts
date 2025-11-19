/**
 * Funciones para gestionar workflow_triggers en la base de datos
 */

import { createClient } from '@supabase/supabase-js'
import { type TipoEventoTrigger } from './evaluarTriggers'

// Re-exportar el tipo para facilitar las importaciones
export type { TipoEventoTrigger }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface WorkflowTrigger {
  id?: string
  workflow_id: string
  tipo_evento: TipoEventoTrigger
  dias_relativos: number | null
  nodo_entrada_id: string
  activo: boolean
}

export interface NodoConTrigger {
  id: string
  tipo: 'email' | 'sms' | 'whatsapp' | 'llamada'
  tipo_evento?: TipoEventoTrigger
  dias_relativos?: number | null
}

/**
 * Sincroniza los triggers de un workflow con la configuración de los nodos del canvas
 * 
 * @param workflowId ID del workflow
 * @param nodos Array de nodos del canvas que tienen triggers configurados
 */
export async function sincronizarTriggersWorkflow(
  workflowId: string,
  nodos: NodoConTrigger[]
): Promise<{ exito: boolean; error?: string }> {
  try {
    // 1. Obtener triggers existentes del workflow
    const { data: triggersExistentes, error: errorObtener } = await supabase
      .from('workflow_triggers')
      .select('*')
      .eq('workflow_id', workflowId)

    if (errorObtener) {
      console.error('Error obteniendo triggers existentes:', errorObtener)
      return { exito: false, error: errorObtener.message }
    }

    // 2. Filtrar nodos válidos (solo los que tienen tipo_evento configurado)
    const nodosConTrigger = nodos.filter(
      (nodo) => nodo.tipo_evento && ['email', 'sms', 'whatsapp', 'llamada'].includes(nodo.tipo)
    )

    // 3. Crear un mapa de nodos actuales por nodo_id
    const nodosMap = new Map<string, NodoConTrigger>()
    nodosConTrigger.forEach((nodo) => {
      nodosMap.set(nodo.id, nodo)
    })

    // 4. Crear un mapa de triggers existentes por nodo_id
    const triggersMap = new Map<string, typeof triggersExistentes[0]>()
    triggersExistentes?.forEach((trigger) => {
      triggersMap.set(trigger.nodo_entrada_id, trigger)
    })

    // 5. Identificar operaciones a realizar
    const triggersACrear: Omit<WorkflowTrigger, 'id'>[] = []
    const triggersAActualizar: WorkflowTrigger[] = []
    const idsAEliminar: string[] = []

    // 6. Procesar nodos actuales
    for (const nodo of nodosConTrigger) {
      const triggerExistente = triggersMap.get(nodo.id)

      if (triggerExistente) {
        // Verificar si necesita actualización
        if (
          triggerExistente.tipo_evento !== nodo.tipo_evento ||
          triggerExistente.dias_relativos !== nodo.dias_relativos
        ) {
          triggersAActualizar.push({
            id: triggerExistente.id,
            workflow_id: workflowId,
            tipo_evento: nodo.tipo_evento!,
            dias_relativos: nodo.dias_relativos ?? null,
            nodo_entrada_id: nodo.id,
            activo: true,
          })
        }
        // Marcar como procesado
        triggersMap.delete(nodo.id)
      } else {
        // Crear nuevo trigger
        triggersACrear.push({
          workflow_id: workflowId,
          tipo_evento: nodo.tipo_evento!,
          dias_relativos: nodo.dias_relativos ?? null,
          nodo_entrada_id: nodo.id,
          activo: true,
        })
      }
    }

    // 7. Los triggers que quedaron en el map deben ser eliminados (nodos que ya no existen o ya no tienen evento)
    idsAEliminar.push(...Array.from(triggersMap.values()).map((t) => t.id))

    // 8. Ejecutar operaciones en la BD
    
    // Crear nuevos triggers
    if (triggersACrear.length > 0) {
      const { error: errorCrear } = await supabase
        .from('workflow_triggers')
        .insert(triggersACrear)

      if (errorCrear) {
        console.error('Error creando triggers:', errorCrear)
        return { exito: false, error: errorCrear.message }
      }
      console.log(`✅ ${triggersACrear.length} triggers creados`)
    }

    // Actualizar triggers existentes
    for (const trigger of triggersAActualizar) {
      const { error: errorActualizar } = await supabase
        .from('workflow_triggers')
        .update({
          tipo_evento: trigger.tipo_evento,
          dias_relativos: trigger.dias_relativos,
          actualizado_at: new Date().toISOString(),
        })
        .eq('id', trigger.id!)

      if (errorActualizar) {
        console.error(`Error actualizando trigger ${trigger.id}:`, errorActualizar)
        return { exito: false, error: errorActualizar.message }
      }
    }
    if (triggersAActualizar.length > 0) {
      console.log(`✅ ${triggersAActualizar.length} triggers actualizados`)
    }

    // Eliminar triggers obsoletos
    if (idsAEliminar.length > 0) {
      const { error: errorEliminar } = await supabase
        .from('workflow_triggers')
        .delete()
        .in('id', idsAEliminar)

      if (errorEliminar) {
        console.error('Error eliminando triggers:', errorEliminar)
        return { exito: false, error: errorEliminar.message }
      }
      console.log(`✅ ${idsAEliminar.length} triggers eliminados`)
    }

    return { exito: true }
  } catch (error) {
    console.error('Error en sincronizarTriggersWorkflow:', error)
    return { 
      exito: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Obtiene todos los triggers de un workflow
 * 
 * @param workflowId ID del workflow
 * @returns Map con nodo_id como key y configuración del trigger como valor
 */
export async function obtenerTriggersWorkflow(
  workflowId: string
): Promise<Map<string, { tipo_evento: TipoEventoTrigger; dias_relativos: number | null }>> {
  const triggersMap = new Map<string, { tipo_evento: TipoEventoTrigger; dias_relativos: number | null }>()

  try {
    const { data: triggers, error } = await supabase
      .from('workflow_triggers')
      .select('nodo_entrada_id, tipo_evento, dias_relativos')
      .eq('workflow_id', workflowId)
      .eq('activo', true)

    if (error) {
      console.error('Error obteniendo triggers del workflow:', error)
      return triggersMap
    }

    triggers?.forEach((trigger) => {
      triggersMap.set(trigger.nodo_entrada_id, {
        tipo_evento: trigger.tipo_evento as TipoEventoTrigger,
        dias_relativos: trigger.dias_relativos,
      })
    })

    return triggersMap
  } catch (error) {
    console.error('Error en obtenerTriggersWorkflow:', error)
    return triggersMap
  }
}

/**
 * Valida que un nodo tenga la configuración mínima necesaria para crear un trigger
 * 
 * @param nodo Nodo a validar
 * @param configuracion Configuración del nodo
 * @returns true si el nodo es válido para trigger
 */
export function validarNodoParaTrigger(
  nodo: { id: string; tipo: string },
  configuracion: Record<string, unknown>
): boolean {
  // Debe ser un nodo de comunicación
  if (!['email', 'sms', 'whatsapp', 'llamada'].includes(nodo.tipo)) {
    return false
  }

  // Debe tener tipo_evento configurado
  if (!configuracion.tipo_evento) {
    return false
  }

  // Validar dias_relativos si es requerido
  const tiposQueRequierenDias = ['dias_antes_vencimiento', 'dias_despues_vencimiento']
  if (
    tiposQueRequierenDias.includes(configuracion.tipo_evento as string) &&
    (configuracion.dias_relativos === undefined || configuracion.dias_relativos === null)
  ) {
    return false
  }

  // Debe tener plantilla_id o agente_id según el tipo
  if (nodo.tipo === 'llamada') {
    if (!configuracion.agente_id) {
      return false
    }
  } else {
    if (!configuracion.plantilla_id) {
      return false
    }
  }

  return true
}

