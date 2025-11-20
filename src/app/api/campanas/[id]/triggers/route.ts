import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { type TipoEventoTrigger } from '@/lib/evaluarTriggers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface NodoConTrigger {
  id: string
  tipo: 'email' | 'sms' | 'whatsapp' | 'llamada'
  tipo_evento?: TipoEventoTrigger
  dias_relativos?: number | null
}

/**
 * GET /api/campanas/[id]/triggers
 * Obtiene todos los triggers de un workflow
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params

    const { data: triggers, error } = await supabase
      .from('workflow_triggers')
      .select('nodo_entrada_id, tipo_evento, dias_relativos')
      .eq('workflow_id', workflowId)
      .eq('activo', true)

    if (error) {
      console.error('Error obteniendo triggers:', error)
      return NextResponse.json(
        { error: 'Error al obtener triggers' },
        { status: 500 }
      )
    }

    // Convertir a Map-like object para JSON
    const triggersMap: Record<string, { tipo_evento: TipoEventoTrigger; dias_relativos: number | null }> = {}
    triggers?.forEach((trigger) => {
      triggersMap[trigger.nodo_entrada_id] = {
        tipo_evento: trigger.tipo_evento as TipoEventoTrigger,
        dias_relativos: trigger.dias_relativos,
      }
    })

    return NextResponse.json({ triggers: triggersMap })
  } catch (error) {
    console.error('Error en GET /api/campanas/[id]/triggers:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/campanas/[id]/triggers
 * Sincroniza los triggers de un workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const body = await request.json()
    const { nodos } = body as { nodos: NodoConTrigger[] }

    if (!nodos || !Array.isArray(nodos)) {
      return NextResponse.json(
        { error: 'Se requiere un array de nodos' },
        { status: 400 }
      )
    }

    // 1. Obtener triggers existentes del workflow
    const { data: triggersExistentes, error: errorObtener } = await supabase
      .from('workflow_triggers')
      .select('*')
      .eq('workflow_id', workflowId)

    if (errorObtener) {
      console.error('Error obteniendo triggers existentes:', errorObtener)
      return NextResponse.json(
        { error: 'Error al obtener triggers existentes' },
        { status: 500 }
      )
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
    const triggersACrear: Array<{
      workflow_id: string
      tipo_evento: TipoEventoTrigger
      dias_relativos: number | null
      nodo_entrada_id: string
      activo: boolean
    }> = []
    const triggersAActualizar: Array<{
      id: string
      tipo_evento: TipoEventoTrigger
      dias_relativos: number | null
    }> = []
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
            tipo_evento: nodo.tipo_evento!,
            dias_relativos: nodo.dias_relativos ?? null,
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

    // 7. Los triggers que quedaron en el map deben ser eliminados
    idsAEliminar.push(...Array.from(triggersMap.values()).map((t) => t.id))

    // 8. Ejecutar operaciones en la BD
    
    // Crear nuevos triggers
    if (triggersACrear.length > 0) {
      const { error: errorCrear } = await supabase
        .from('workflow_triggers')
        .insert(triggersACrear)

      if (errorCrear) {
        console.error('Error creando triggers:', errorCrear)
        return NextResponse.json(
          { error: 'Error al crear triggers' },
          { status: 500 }
        )
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
        .eq('id', trigger.id)

      if (errorActualizar) {
        console.error(`Error actualizando trigger ${trigger.id}:`, errorActualizar)
        return NextResponse.json(
          { error: 'Error al actualizar triggers' },
          { status: 500 }
        )
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
        return NextResponse.json(
          { error: 'Error al eliminar triggers' },
          { status: 500 }
        )
      }
      console.log(`✅ ${idsAEliminar.length} triggers eliminados`)
    }

    return NextResponse.json({
      exito: true,
      creados: triggersACrear.length,
      actualizados: triggersAActualizar.length,
      eliminados: idsAEliminar.length,
    })
  } catch (error) {
    console.error('Error en POST /api/campanas/[id]/triggers:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

