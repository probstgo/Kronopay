import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ejecutarCampana, NodoCampana, ConexionCampana } from '@/lib/ejecutarCampana'

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { campana_id, nodos, conexiones, deudores_iniciales } = body

    // Validar datos requeridos
    if (!campana_id || !nodos || !Array.isArray(nodos) || !conexiones || !Array.isArray(conexiones)) {
      return NextResponse.json(
        { error: 'Datos incompletos: se requieren campana_id, nodos y conexiones' },
        { status: 400 }
      )
    }

    // Convertir nodos y conexiones al formato esperado
    const nodosCampana: NodoCampana[] = nodos.map((nodo: { id: string, type: string, data: Record<string, unknown> }) => ({
      id: nodo.id,
      tipo: nodo.type as NodoCampana['tipo'],
      configuracion: (nodo.data.configuracion || {}) as Record<string, unknown>,
      data: nodo.data
    }))

    const conexionesCampana: ConexionCampana[] = conexiones.map((conn: { id: string, source: string, target: string, sourceHandle?: string }) => ({
      id: conn.id,
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourceHandle
    }))

    // Si no se proporcionan deudores iniciales, obtener todos los deudores del usuario
    const deudoresIniciales = deudores_iniciales || []
    
    if (deudoresIniciales.length === 0) {
      // Obtener todos los deudores del usuario
      const { data: deudoresData, error: deudoresError } = await supabase
        .from('deudores')
        .select('id, rut, nombre')
        .eq('usuario_id', session.user.id)

      if (deudoresError) {
        console.error('Error obteniendo deudores:', deudoresError)
      } else {
        // Obtener deudas y contactos para cada deudor
        for (const deudor of deudoresData || []) {
          const { data: deudas } = await supabase
            .from('deudas')
            .select('id, monto, fecha_vencimiento')
            .eq('deudor_id', deudor.id)
            .limit(1)

          const { data: contactos } = await supabase
            .from('contactos')
            .select('id, valor, tipo_contacto')
            .eq('deudor_id', deudor.id)
            .limit(1)

          if (deudas && deudas.length > 0) {
            const deuda = deudas[0]
            const contacto = contactos && contactos.length > 0 ? contactos[0] : null

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
      }
    }

    // Ejecutar la campaña
    const resultado = await ejecutarCampana({
      usuario_id: session.user.id,
      campana_id,
      nodos: nodosCampana,
      conexiones: conexionesCampana,
      deudores_iniciales: deudoresIniciales
    })

    return NextResponse.json({
      exito: true,
      resultado: {
        programaciones_creadas: resultado.programaciones_creadas,
        exitosas: resultado.exitosas,
        fallidas: resultado.fallidas
      },
      mensaje: `Campaña ejecutada: ${resultado.programaciones_creadas} programaciones creadas`
    })

  } catch (error) {
    console.error('Error ejecutando campaña:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error ejecutando campaña', detalles: errorMessage },
      { status: 500 }
    )
  }
}

