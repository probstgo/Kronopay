import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Crear cliente Supabase que puede leer la sesión del usuario desde las cookies
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // Obtener la sesión del usuario para asegurar que está autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      // Si no hay sesión o es inválida, devolver no autorizado
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Consultar la base de datos usando el cliente Supabase autenticado
    // Las políticas de RLS se aplicarán basándose en el usuario de la sesión
    const { data: agentes, error } = await supabase
      .from('llamada_agente')
      .select('*')
      .order('es_predeterminado', { ascending: false })
      .order('prioridad', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo agentes:', error);
      return NextResponse.json({ error: 'Error obteniendo agentes' }, { status: 500 });
    }

    return NextResponse.json(agentes || []);
  } catch (error) {
    console.error('Error en API de agentes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
