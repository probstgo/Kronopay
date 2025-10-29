import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  try {
    type RequestWithCookies = Request & {
      cookies?: { get(name: string): { value?: string } | undefined }
    }
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return (request as RequestWithCookies).cookies?.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data, error } = await supabase
      .from('suscripciones')
      .select('id, nombre, descripcion, precio_mensual, limite_emails, limite_llamadas, limite_sms, limite_whatsapp, limite_memoria_mb')
      .eq('activo', true)
      .order('precio_mensual', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data || [])
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


