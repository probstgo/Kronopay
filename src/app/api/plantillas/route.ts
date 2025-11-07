import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Crear cliente Supabase que puede leer la sesión del usuario desde las cookies
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
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    // Obtener la sesión del usuario para asegurar que está autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      // Si no hay sesión o es inválida, devolver no autorizado
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener parámetro de tipo de plantilla (opcional)
    const url = new URL(request.url)
    const tipo = url.searchParams.get('tipo')

    // Construir consulta
    let query = supabase
      .from('plantillas')
      .select('id, nombre, tipo, asunto, contenido, tipo_contenido, created_at')
      .order('created_at', { ascending: false })

    // Filtrar por tipo si se proporciona
    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    const { data: plantillas, error } = await query

    if (error) {
      console.error('Error obteniendo plantillas:', error)
      return NextResponse.json({ error: 'Error obteniendo plantillas' }, { status: 500 })
    }

    return NextResponse.json(plantillas || [])
  } catch (error) {
    console.error('Error en API de plantillas:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

