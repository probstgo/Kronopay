import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  try {
    type RequestWithCookies = Request & {
      cookies?: { get(name: string): { value?: string } | undefined }
    }
    type PlanRow = {
      id: string
      nombre: string
      precio_mensual: number
      limite_emails: number
      limite_llamadas: number
      limite_sms: number
      limite_whatsapp: number
      limite_memoria_mb: number
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

    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: usuario, error: uErr } = await supabase
      .from('usuarios')
      .select('plan_suscripcion_id, estado_suscripcion, fecha_inicio_suscripcion, fecha_renovacion')
      .eq('id', userId)
      .single()

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

    let plan: PlanRow | null = null
    if (usuario?.plan_suscripcion_id) {
      const { data: planRow, error: pErr } = await supabase
        .from('suscripciones')
        .select('id, nombre, precio_mensual, limite_emails, limite_llamadas, limite_sms, limite_whatsapp, limite_memoria_mb')
        .eq('id', usuario.plan_suscripcion_id)
        .single()
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
      plan = planRow
    }

    return NextResponse.json({
      plan,
      estado_suscripcion: usuario?.estado_suscripcion ?? 'activo',
      fecha_inicio_suscripcion: usuario?.fecha_inicio_suscripcion ?? null,
      fecha_renovacion: usuario?.fecha_renovacion ?? null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


