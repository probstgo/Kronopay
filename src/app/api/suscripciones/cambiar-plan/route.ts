import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { suscripcion_id } = body || {}
    if (!suscripcion_id) {
      return NextResponse.json({ error: 'suscripcion_id requerido' }, { status: 400 })
    }

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

    // Validar que el plan exista y esté activo
    const { data: plan, error: pErr } = await supabase
      .from('suscripciones')
      .select('id')
      .eq('id', suscripcion_id)
      .eq('activo', true)
      .single()
    if (pErr || !plan) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

    // Actualizar plan del usuario y retornar valores actuales
    const { data: updated, error: uErr } = await supabase
      .from('usuarios')
      .update({ plan_suscripcion_id: suscripcion_id })
      .eq('id', userId)
      .select('plan_suscripcion_id, fecha_renovacion')
      .single()

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      plan_suscripcion_id: updated?.plan_suscripcion_id,
      fecha_renovacion: updated?.fecha_renovacion ?? null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


