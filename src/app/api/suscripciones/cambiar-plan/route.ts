import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  try {
    const bodyUnknown: unknown = await request.json().catch(() => ({}))
    const suscripcion_id =
      bodyUnknown && typeof bodyUnknown === 'object' && bodyUnknown !== null
        ? (bodyUnknown as { suscripcion_id?: unknown }).suscripcion_id
        : undefined
    if (
      suscripcion_id === undefined ||
      !(['string', 'number'].includes(typeof suscripcion_id))
    ) {
      return NextResponse.json({ error: 'suscripcion_id requerido' }, { status: 400 })
    }
    if (!suscripcion_id) {
      return NextResponse.json({ error: 'suscripcion_id requerido' }, { status: 400 })
    }

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

    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Validar que el plan exista y esté activo
    const { data: plan, error: pErr } = await supabase
      .from('suscripciones')
      .select('id')
      .eq('id', suscripcion_id as string | number)
      .eq('activo', true)
      .single()
    if (pErr || !plan) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

    // Actualizar plan del usuario y retornar valores actuales
    const { data: updated, error: uErr } = await supabase
      .from('usuarios')
      .update({ plan_suscripcion_id: suscripcion_id as string | number })
      .eq('id', userId)
      .select('plan_suscripcion_id, fecha_renovacion')
      .single()

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      plan_suscripcion_id: updated?.plan_suscripcion_id,
      fecha_renovacion: updated?.fecha_renovacion ?? null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


