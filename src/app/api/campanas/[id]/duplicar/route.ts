import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// POST: Duplicar una campaña
export async function POST(
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

    // Obtener la campaña original
    const { data: campanaOriginal, error: fetchError } = await supabase
      .from('workflows_cobranza')
      .select('*')
      .eq('id', campanaId)
      .eq('usuario_id', session.user.id)
      .single()

    if (fetchError || !campanaOriginal) {
      return NextResponse.json(
        { error: 'Campaña no encontrada o sin permisos' },
        { status: 404 }
      )
    }

    // Crear copia de la campaña
    const { data: campanaDuplicada, error: insertError } = await supabase
      .from('workflows_cobranza')
      .insert({
        usuario_id: session.user.id,
        nombre: `${campanaOriginal.nombre} (Copia)`,
        descripcion: campanaOriginal.descripcion,
        canvas_data: campanaOriginal.canvas_data,
        configuracion: campanaOriginal.configuracion,
        estado: 'borrador', // Siempre duplicar como borrador
        version: 1 // Resetear versión
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error duplicando campaña:', insertError)
      return NextResponse.json(
        { error: 'Error al duplicar la campaña', detalles: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      exito: true,
      mensaje: 'Campaña duplicada exitosamente',
      data: {
        id: campanaDuplicada.id,
        nombre: campanaDuplicada.nombre,
        estado: campanaDuplicada.estado
      }
    })

  } catch (error) {
    console.error('Error duplicando campaña:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al duplicar la campaña', detalles: errorMessage },
      { status: 500 }
    )
  }
}

