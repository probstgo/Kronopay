import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    // 1) Cerrar sesión en Supabase (emite Set-Cookie para invalidar)
    await supabase.auth.signOut()

    // 2) Limpieza forzada de TODAS las cookies sb-* por seguridad
    for (const c of request.cookies.getAll()) {
      if (c.name.startsWith('sb-')) {
        response.cookies.set({
          name: c.name,
          value: '',
          path: '/',
          expires: new Date(0),
        })
      }
    }

    return response
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 })
  }
}


