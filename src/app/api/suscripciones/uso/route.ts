import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function periodoActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

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
            // @ts-expect-error: Next.js App Router Request no expone 'cookies' tipado aquí
            return (request as RequestWithCookies).cookies?.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const periodo = periodoActual()
    const { data, error } = await supabase
      .from('usos')
      .select('periodo, emails_enviados, llamadas_ejecutadas, sms_enviados, whatsapp_enviados, duracion_llamadas, memoria_db_usada, costo_total')
      .eq('usuario_id', userId)
      .eq('periodo', periodo)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      data ?? {
        periodo,
        emails_enviados: 0,
        llamadas_ejecutadas: 0,
        sms_enviados: 0,
        whatsapp_enviados: 0,
        duracion_llamadas: 0,
        memoria_db_usada: 0,
        costo_total: 0,
      }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


