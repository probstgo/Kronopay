import type { SupabaseClient } from '@supabase/supabase-js'
import { ejecutarCampana, NodoCampana, ConexionCampana } from './ejecutarCampana'
import { crearEjecucionWorkflow, actualizarEjecucionWorkflow } from './logsEjecucion'

interface EjecutarCampanaAutomaticaParams {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  supabase: SupabaseClient<any>
  campanaId: string
  usuarioId: string
  canvasData: {
    nodes?: Array<{
      id: string
      type: string
      data: Record<string, unknown>
    }>
    edges?: Array<{
      id: string
      source: string
      target: string
      sourceHandle?: string
    }>
  }
}

/**
 * Ejecuta una campaña automáticamente cuando se guarda o activa
 */
export async function ejecutarCampanaAutomaticamente({
  supabase,
  campanaId,
  usuarioId,
  canvasData
}: EjecutarCampanaAutomaticaParams): Promise<void> {
  // Validar que hay nodos y conexiones
  if (!canvasData.nodes || canvasData.nodes.length === 0) {
    console.log('Campaña sin nodos, no se ejecuta')
    return
  }

  // Filtrar nodos reales (excluir nodo inicial "+" y notas)
  const nodosReales = canvasData.nodes.filter(
    (nodo) => nodo.type !== 'initialPlus' && nodo.type !== 'note'
  )

  if (nodosReales.length === 0) {
    console.log('Campaña sin nodos reales, no se ejecuta')
    return
  }

  // Validar tipos de nodos soportados
  const tiposValidos: NodoCampana['tipo'][] = ['filtro', 'email', 'llamada', 'sms', 'whatsapp', 'condicion']
  const nodosInvalidos = nodosReales.filter(nodo => !tiposValidos.includes(nodo.type as NodoCampana['tipo']))
  
  if (nodosInvalidos.length > 0) {
    const tiposInvalidos = nodosInvalidos.map(n => `${n.id}:${n.type}`).join(', ')
    console.error(`Campaña contiene nodos con tipos no soportados: ${tiposInvalidos}`)
    throw new Error(`Tipos de nodos no soportados: ${tiposInvalidos}`)
  }

  // Convertir nodos al formato esperado por ejecutarCampana
  const nodosCampana: NodoCampana[] = nodosReales.map((nodo) => ({
    id: nodo.id,
    tipo: nodo.type as NodoCampana['tipo'],
    configuracion: (nodo.data.configuracion || {}) as Record<string, unknown>,
    data: nodo.data
  }))

  // Convertir conexiones al formato esperado
  const conexionesCampana: ConexionCampana[] = (canvasData.edges || []).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle
  }))

  // Obtener todos los deudores del usuario
  const { data: deudoresData, error: deudoresError } = await supabase
    .from('deudores')
    .select('id, rut, nombre')
    .eq('usuario_id', usuarioId)

  if (deudoresError) {
    console.error('Error obteniendo deudores:', deudoresError)
    throw new Error('Error obteniendo deudores')
  }

  const deudoresIniciales: Array<{
    deuda_id: string
    rut: string
    contacto_id?: string
    vars?: Record<string, string>
  }> = []

  // Obtener deudas y contactos para cada deudor
  for (const deudor of (deudoresData || []) as Array<{ id: string; rut: string | null; nombre: string | null }>) {
    const { data: deudas } = await supabase
      .from('deudas')
      .select('id, monto, fecha_vencimiento')
      .eq('deudor_id', deudor.id)
      .is('eliminada_at', null)  // Solo deudas activas (soft delete)
      .limit(1)

    const { data: contactos } = await supabase
      .from('contactos')
      .select('id, valor, tipo_contacto')
      .eq('deudor_id', deudor.id)
      .limit(1)

    if (deudas && deudas.length > 0) {
      const deuda = deudas[0] as { id: string; monto: number | null; fecha_vencimiento: string | null }
      const contacto = (contactos && contactos.length > 0) ? (contactos[0] as { id: string; valor: string; tipo_contacto: string }) : null

      deudoresIniciales.push({
        deuda_id: deuda.id,
        rut: deudor.rut || '',
        contacto_id: contacto?.id,
        vars: {
          nombre: deudor.nombre || 'Deudor',
          monto: `$${deuda.monto || 0}`,
          fecha_vencimiento: deuda.fecha_vencimiento || new Date().toISOString().split('T')[0]
        }
      })
    }
  }

  // Crear ejecución de workflow para registrar logs
  // Usamos el primer deudor como referencia (la ejecución es para toda la campaña)
  let ejecucionId: string | null = null
  if (deudoresIniciales.length > 0) {
    const { data: deudaData } = await supabase
      .from('deudas')
      .select('deudor_id')
      .eq('id', deudoresIniciales[0].deuda_id)
      .is('eliminada_at', null)  // Solo deudas activas (soft delete)
      .single()

    if (deudaData?.deudor_id) {
      ejecucionId = await crearEjecucionWorkflow({
        workflow_id: campanaId,
        deudor_id: deudaData.deudor_id,
        usuario_id: usuarioId,
        contexto_datos: {
          cantidad_deudores: deudoresIniciales.length,
          fecha_inicio: new Date().toISOString()
        }
      })
    }
  }

  // Ejecutar la campaña
  const resultado = await ejecutarCampana({
    usuario_id: usuarioId,
    campana_id: campanaId,
    nodos: nodosCampana,
    conexiones: conexionesCampana,
    deudores_iniciales: deudoresIniciales,
    ejecucion_id: ejecucionId || undefined
  })

  // Actualizar ejecución de workflow con resultado final
  if (ejecucionId) {
    await actualizarEjecucionWorkflow(ejecucionId, {
      estado: 'completado',
      resultado_final: {
        programaciones_creadas: resultado.programaciones_creadas,
        exitosas: resultado.exitosas,
        fallidas: resultado.fallidas
      }
    })
  }

  // Actualizar ejecutado_at en la campaña
  const { error: updateError } = await supabase
    .from('workflows_cobranza')
    .update({ ejecutado_at: new Date().toISOString() })
    .eq('id', campanaId)

  if (updateError) {
    console.error('Error actualizando ejecutado_at:', updateError)
    // No lanzar error para no bloquear la ejecución
  }

  console.log(`Campaña ${campanaId} ejecutada automáticamente: ${resultado.programaciones_creadas} programaciones creadas`)
}

