import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Schema para actualizar estado
const updateEstadoSchema = z.object({
  estado: z.enum(['borrador', 'activo', 'pausado', 'archivado'])
})

// PATCH: Actualizar estado de una campaña
export async function PATCH(
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

    // Obtener y validar el body
    const body = await request.json()
    const validationResult = updateEstadoSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { estado } = validationResult.data

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

    // Actualizar el estado
    const { data: campanaActualizada, error: updateError } = await supabase
      .from('workflows_cobranza')
      .update({
        estado,
        actualizado_at: new Date().toISOString()
      })
      .eq('id', campanaId)
      .eq('usuario_id', session.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error actualizando estado:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar el estado', detalles: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      exito: true,
      mensaje: 'Estado actualizado exitosamente',
      data: {
        id: campanaActualizada.id,
        estado: campanaActualizada.estado
      }
    })

  } catch (error) {
    console.error('Error actualizando estado:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al actualizar el estado', detalles: errorMessage },
      { status: 500 }
    )
  }
}

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

