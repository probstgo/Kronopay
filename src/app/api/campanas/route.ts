import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { saveCampanaSchema } from '@/lib/validations/campanaSchema'

// GET: Listar todas las campañas del usuario
export async function GET() {
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

    // Obtener todas las campañas del usuario (RLS asegura que solo ve las suyas)
    const { data: campanas, error: fetchError } = await supabase
      .from('workflows_cobranza')
      .select('id, nombre, descripcion, estado, version, creado_at, actualizado_at, ejecutado_at')
      .eq('usuario_id', session.user.id)
      .order('actualizado_at', { ascending: false })

    if (fetchError) {
      console.error('Error obteniendo campañas:', fetchError)
      return NextResponse.json(
        { error: 'Error al obtener las campañas', detalles: fetchError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      exito: true,
      data: campanas || []
    })

  } catch (error) {
    console.error('Error obteniendo campañas:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al obtener las campañas', detalles: errorMessage },
      { status: 500 }
    )
  }
}

// POST: Crear nueva campaña
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

    // Obtener y validar el body
    const body = await request.json()
    
    // Validar con Zod
    const validationResult = saveCampanaSchema.safeParse(body)
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

    // Insertar en workflows_cobranza
    const { data: campana, error: insertError } = await supabase
      .from('workflows_cobranza')
      .insert({
        usuario_id: session.user.id,
        nombre: validatedData.nombre,
        descripcion: validatedData.descripcion || null,
        canvas_data: validatedData.canvas_data,
        configuracion: validatedData.configuracion || {},
        estado: validatedData.estado || 'borrador',
        version: 1
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error insertando campaña:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar la campaña', detalles: insertError.message },
        { status: 500 }
      )
    }

    // Las programaciones se crearán automáticamente mediante el sistema de triggers
    // cuando ocurran eventos (crear deuda, vencimiento, etc.) o cuando se ejecute el cron diario

    return NextResponse.json({
      exito: true,
      mensaje: 'Campaña guardada exitosamente',
      data: {
        id: campana.id,
        nombre: campana.nombre,
        estado: campana.estado,
        creado_at: campana.creado_at
      }
    })

  } catch (error) {
    console.error('Error guardando campaña:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al guardar la campaña', detalles: errorMessage },
      { status: 500 }
    )
  }
}

