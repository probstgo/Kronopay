import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { obtenerIP, verificarRateLimit } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  try {
    const ip = obtenerIP(request as unknown as Request)
    const permitido = await verificarRateLimit(ip, 'api')
    if (!permitido) {
      return NextResponse.json({ error: 'Rate limit excedido' }, { status: 429 })
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
            return (request as unknown as RequestWithCookies).cookies?.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    // Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const montoMin = url.searchParams.get('montoMin') ? Number(url.searchParams.get('montoMin')) : null
    const montoMax = url.searchParams.get('montoMax') ? Number(url.searchParams.get('montoMax')) : null

    // Obtener todas las deudas activas pendientes (no pagadas)
    // Aplicar filtro de monto si existe
    let deudasQuery = supabase
      .from('deudas')
      .select('monto, fecha_vencimiento, estado')
      .eq('usuario_id', user.id)
      .is('eliminada_at', null)  // Solo deudas activas (soft delete)
      .neq('estado', 'pagado')

    if (montoMin !== null) {
      deudasQuery = deudasQuery.gte('monto', montoMin)
    }
    if (montoMax !== null) {
      deudasQuery = deudasQuery.lte('monto', montoMax)
    }

    const { data: deudas, error: deudasError } = await deudasQuery

    if (deudasError) {
      return NextResponse.json({ error: deudasError.message }, { status: 500 })
    }

    const ahora = new Date()
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    hoy.setHours(0, 0, 0, 0)

    // Calcular aging buckets
    const buckets = {
      'vigentes': { monto: 0, count: 0 },
      '1-30': { monto: 0, count: 0 },
      '31-60': { monto: 0, count: 0 },
      '61-90': { monto: 0, count: 0 },
      '+90': { monto: 0, count: 0 },
    }

    ;(deudas || []).forEach((deuda) => {
      const fechaVencimiento = new Date(deuda.fecha_vencimiento)
      fechaVencimiento.setHours(0, 0, 0, 0)
      const diasVencidos = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24))
      
      const monto = typeof deuda.monto === 'number' ? deuda.monto : Number(deuda.monto) || 0

      // Si la fecha es futura o es hoy (diasVencidos <= 0), va a vigentes
      if (diasVencidos <= 0) {
        buckets['vigentes'].monto += monto
        buckets['vigentes'].count += 1
      } else if (diasVencidos <= 30) {
        buckets['1-30'].monto += monto
        buckets['1-30'].count += 1
      } else if (diasVencidos <= 60) {
        buckets['31-60'].monto += monto
        buckets['31-60'].count += 1
      } else if (diasVencidos <= 90) {
        buckets['61-90'].monto += monto
        buckets['61-90'].count += 1
      } else {
        buckets['+90'].monto += monto
        buckets['+90'].count += 1
      }
    })

    const total = buckets['vigentes'].monto + buckets['1-30'].monto + buckets['31-60'].monto + buckets['61-90'].monto + buckets['+90'].monto

    return NextResponse.json({
      buckets: [
        { rango: 'vigentes' as const, monto: buckets['vigentes'].monto, label: 'Vigentes', count: buckets['vigentes'].count },
        { rango: '1-30' as const, monto: buckets['1-30'].monto, label: '1-30 días', count: buckets['1-30'].count },
        { rango: '31-60' as const, monto: buckets['31-60'].monto, label: '31-60 días', count: buckets['31-60'].count },
        { rango: '61-90' as const, monto: buckets['61-90'].monto, label: '61-90 días', count: buckets['61-90'].count },
        { rango: '+90' as const, monto: buckets['+90'].monto, label: '+90 días', count: buckets['+90'].count },
      ],
      total,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

