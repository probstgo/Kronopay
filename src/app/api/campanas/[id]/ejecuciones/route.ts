import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/campanas/[id]/ejecuciones
 * Lista todas las ejecuciones de una campaña
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campanaId } = await params

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
      .select('id, usuario_id')
      .eq('id', campanaId)
      .eq('usuario_id', session.user.id)
      .single()

    if (campanaError || !campana) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    }

    // Obtener ejecuciones con información del deudor (usar service_role para joins)
    const { data: ejecuciones, error: ejecucionesError } = await supabaseService
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
      .eq('workflow_id', campanaId)
      .order('iniciado_at', { ascending: false })
      .limit(100)

    if (ejecucionesError) {
      console.error('Error obteniendo ejecuciones:', ejecucionesError)
      return NextResponse.json(
        { error: 'Error obteniendo ejecuciones' },
        { status: 500 }
      )
    }

    // Calcular métricas básicas
    const totalEjecuciones = ejecuciones?.length || 0
    const completadas = ejecuciones?.filter(e => e.estado === 'completado').length || 0
    const fallidas = ejecuciones?.filter(e => e.estado === 'fallido').length || 0
    const ejecutando = ejecuciones?.filter(e => e.estado === 'ejecutando').length || 0

    return NextResponse.json({
      ejecuciones: ejecuciones || [],
      metricas: {
        total: totalEjecuciones,
        completadas,
        fallidas,
        ejecutando,
        tasa_exito: totalEjecuciones > 0 ? (completadas / totalEjecuciones) * 100 : 0
      }
    })
  } catch (error) {
    console.error('Error en GET /api/campanas/[id]/ejecuciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

