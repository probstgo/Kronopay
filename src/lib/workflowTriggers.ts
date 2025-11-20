/**
 * Tipos y funciones helper para gestionar workflow_triggers
 * 
 * NOTA: Las operaciones de BD se realizan a través de API routes
 * para evitar exponer SUPABASE_SERVICE_ROLE_KEY en el cliente
 */

import { type TipoEventoTrigger } from './evaluarTriggers'

// Re-exportar el tipo para facilitar las importaciones
export type { TipoEventoTrigger }

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
 * Sincroniza los triggers de un workflow (cliente - llama a API route)
 * 
 * @param workflowId ID del workflow
 * @param nodos Array de nodos del canvas que tienen triggers configurados
 */
export async function sincronizarTriggersWorkflow(
  workflowId: string,
  nodos: NodoConTrigger[]
): Promise<{ exito: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/campanas/${workflowId}/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodos })
    })

    const data = await response.json()

    if (!response.ok) {
      return { exito: false, error: data.error || 'Error al sincronizar triggers' }
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
 * Obtiene todos los triggers de un workflow (cliente - llama a API route)
 * 
 * @param workflowId ID del workflow
 * @returns Map con nodo_id como key y configuración del trigger como valor
 */
export async function obtenerTriggersWorkflow(
  workflowId: string
): Promise<Map<string, { tipo_evento: TipoEventoTrigger; dias_relativos: number | null }>> {
  const triggersMap = new Map<string, { tipo_evento: TipoEventoTrigger; dias_relativos: number | null }>()

  try {
    const response = await fetch(`/api/campanas/${workflowId}/triggers`)
    const data = await response.json()

    if (!response.ok) {
      console.error('Error obteniendo triggers:', data.error)
      return triggersMap
    }

    // Convertir el objeto a Map
    Object.entries(data.triggers || {}).forEach(([nodoId, trigger]) => {
      const t = trigger as { tipo_evento: TipoEventoTrigger; dias_relativos: number | null }
      triggersMap.set(nodoId, t)
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

