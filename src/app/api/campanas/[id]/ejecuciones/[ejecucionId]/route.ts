import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/campanas/[id]/ejecuciones/[ejecucionId]
 * Obtiene los detalles de una ejecución específica con sus logs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ejecucionId: string }> }
) {
  try {
    const { id: campanaId, ejecucionId } = await params

    // Crear cliente Supabase autenticado
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignorar errores de setAll en Server Components
            }
          },
        },
      }
    )

    // Verificar autenticación
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la campaña pertenece al usuario
    const { data: campana, error: campanaError } = await supabase
      .from('workflows_cobranza')
      .select('id, usuario_id, nombre')
      .eq('id', campanaId)
      .eq('usuario_id', session.user.id)
      .single()

    if (campanaError || !campana) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    }

    // Obtener ejecución con información del deudor (usar service_role para joins)
    const { data: ejecucion, error: ejecucionError } = await supabaseService
      .from('ejecuciones_workflow')
      .select(`
        id,
        estado,
        paso_actual,
        contexto_datos,
        resultado_final,
        iniciado_at,
        completado_at,
        proxima_ejecucion,
        deudores (
          id,
          rut,
          nombre
        )
      `)
      .eq('id', ejecucionId)
      .eq('workflow_id', campanaId)
      .single()

    if (ejecucionError || !ejecucion) {
      return NextResponse.json({ error: 'Ejecución no encontrada' }, { status: 404 })
    }

    // Obtener logs de la ejecución ordenados por paso_numero (usar service_role)
    const { data: logs, error: logsError } = await supabaseService
      .from('logs_ejecucion')
      .select('*')
      .eq('ejecucion_id', ejecucionId)
      .order('paso_numero', { ascending: true })
      .order('ejecutado_at', { ascending: true })

    if (logsError) {
      console.error('Error obteniendo logs:', logsError)
      return NextResponse.json(
        { error: 'Error obteniendo logs' },
        { status: 500 }
      )
    }

    // Calcular métricas de la ejecución
    const totalLogs = logs?.length || 0
    const logsCompletados = logs?.filter(l => l.estado === 'completado').length || 0
    const logsFallidos = logs?.filter(l => l.estado === 'fallido').length || 0
    const duracionTotal = logs?.reduce((acc, log) => acc + (log.duracion_ms || 0), 0) || 0

    // Agrupar logs por nodo
    const logsPorNodo = logs?.reduce((acc, log) => {
      if (!acc[log.nodo_id]) {
        acc[log.nodo_id] = []
      }
      acc[log.nodo_id].push(log)
      return acc
    }, {} as Record<string, typeof logs>) || {}

    return NextResponse.json({
      ejecucion: {
        ...ejecucion,
        campana_nombre: campana.nombre
      },
      logs: logs || [],
      logsPorNodo,
      metricas: {
        total_logs: totalLogs,
        completados: logsCompletados,
        fallidos: logsFallidos,
        duracion_total_ms: duracionTotal,
        duracion_total_seg: Math.round(duracionTotal / 1000),
        tasa_exito: totalLogs > 0 ? (logsCompletados / totalLogs) * 100 : 0
      }
    })
  } catch (error) {
    console.error('Error en GET /api/campanas/[id]/ejecuciones/[ejecucionId]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

