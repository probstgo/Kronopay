import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { updateCanvasSchema } from '@/lib/validations/campanaSchema'
import { ejecutarCampanaAutomaticamente } from '@/lib/ejecutarCampanaAutomatica'

// GET: Obtener canvas_data de una campaña
export async function GET(
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

    // Obtener la campaña (RLS asegura que solo el dueño puede verla)
    const { data: campana, error: fetchError } = await supabase
      .from('workflows_cobranza')
      .select('id, nombre, descripcion, canvas_data, usuario_id')
      .eq('id', campanaId)
      .eq('usuario_id', session.user.id)
      .single()

    if (fetchError || !campana) {
      return NextResponse.json(
        { error: 'Campaña no encontrada o sin permisos' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      exito: true,
      data: {
        id: campana.id,
        nombre: campana.nombre,
        descripcion: campana.descripcion,
        canvas_data: campana.canvas_data
      }
    })

  } catch (error) {
    console.error('Error obteniendo campaña:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al obtener la campaña', detalles: errorMessage },
      { status: 500 }
    )
  }
}

// PUT: Actualizar canvas_data de una campaña
export async function PUT(
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
      .select('id, usuario_id, estado')
      .eq('id', campanaId)
      .eq('usuario_id', session.user.id)
      .single()

    if (fetchError || !campanaExistente) {
      return NextResponse.json(
        { error: 'Campaña no encontrada o sin permisos' },
        { status: 404 }
      )
    }

    // Obtener y validar el body
    const body = await request.json()
    
    // Validar con Zod
    const validationResult = updateCanvasSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos', 
          detalles: validationResult.error.issues 
        },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // Preparar datos de actualización
    const updateData: {
      canvas_data: typeof validatedData.canvas_data
      actualizado_at: string
      nombre?: string
      descripcion?: string | null
    } = {
      canvas_data: validatedData.canvas_data,
      actualizado_at: new Date().toISOString()
    }

    // Actualizar nombre y descripción si se proporcionan
    if (validatedData.nombre !== undefined) {
      updateData.nombre = validatedData.nombre
    }
    if (validatedData.descripcion !== undefined) {
      updateData.descripcion = validatedData.descripcion
    }

    // Actualizar canvas_data, nombre, descripción y actualizado_at
    const { data: campanaActualizada, error: updateError } = await supabase
      .from('workflows_cobranza')
      .update(updateData)
      .eq('id', campanaId)
      .eq('usuario_id', session.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error actualizando campaña:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar la campaña', detalles: updateError.message },
        { status: 500 }
      )
    }

    // Si la campaña está activa, ejecutarla automáticamente
    if (campanaActualizada.estado === 'activo') {
      try {
        await ejecutarCampanaAutomaticamente({
          supabase,
          campanaId: campanaActualizada.id,
          usuarioId: session.user.id,
          canvasData: campanaActualizada.canvas_data
        })
      } catch (error) {
        // No fallar la actualización si la ejecución falla, solo loguear
        console.error('Error ejecutando campaña automáticamente:', error)
      }
    }

    return NextResponse.json({
      exito: true,
      mensaje: 'Campaña actualizada exitosamente',
      data: {
        id: campanaActualizada.id,
        actualizado_at: campanaActualizada.actualizado_at
      }
    })

  } catch (error) {
    console.error('Error actualizando campaña:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al actualizar la campaña', detalles: errorMessage },
      { status: 500 }
    )
  }
}

