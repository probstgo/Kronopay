import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// DELETE: Eliminar una campaña
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params
    const campanaId = resolvedParams.id

    // Verificar que la campaña existe y pertenece al usuario
    const { data: campanaExistente, error: fetchError } = await supabase
      .from('workflows_cobranza')
      .select('id, nombre, usuario_id')
      .eq('id', campanaId)
      .eq('usuario_id', session.user.id)
      .single()

    if (fetchError || !campanaExistente) {
      return NextResponse.json(
        { error: 'Campaña no encontrada o sin permisos' },
        { status: 404 }
      )
    }

    // Eliminar la campaña
    const { error: deleteError } = await supabase
      .from('workflows_cobranza')
      .delete()
      .eq('id', campanaId)
      .eq('usuario_id', session.user.id)

    if (deleteError) {
      console.error('Error eliminando campaña:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar la campaña', detalles: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      exito: true,
      mensaje: 'Campaña eliminada exitosamente'
    })

  } catch (error) {
    console.error('Error eliminando campaña:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al eliminar la campaña', detalles: errorMessage },
      { status: 500 }
    )
  }
}

