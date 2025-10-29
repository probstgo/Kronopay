import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            // @ts-ignore
            return (request as any).cookies?.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data, error } = await supabase
      .from('facturas')
      .select('id, periodo, fecha, monto, estado, pdf_url')
      .eq('usuario_id', userId)
      .order('fecha', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


