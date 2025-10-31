import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { obtenerIP, verificarRateLimit } from '@/lib/rate-limiter'

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

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
    const from = parseDate(url.searchParams.get('from'))
    const to = parseDate(url.searchParams.get('to'))
    const montoMin = url.searchParams.get('montoMin') ? Number(url.searchParams.get('montoMin')) : null
    const montoMax = url.searchParams.get('montoMax') ? Number(url.searchParams.get('montoMax')) : null

    // Calcular fechas del mes actual si no se proporcionan
    const ahora = new Date()
    const inicioMesActual = from || new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const finMesActual = to || new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)
    
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59)

    // Construir query base para pagos del mes actual
    let pagosActualQuery = supabase
      .from('pagos')
      .select('monto_pagado, fecha_pago, deuda_id')
      .eq('usuario_id', user.id)
      .eq('estado', 'confirmado')
      .gte('fecha_pago', inicioMesActual.toISOString())
      .lte('fecha_pago', finMesActual.toISOString())

    // Aplicar filtro de monto si existe (requiere obtener deudas primero)
    let deudasIdsFiltradas: string[] | null = null
    if (montoMin !== null || montoMax !== null) {
      let deudasQuery = supabase
        .from('deudas')
        .select('id, monto')
        .eq('usuario_id', user.id)
      
      if (montoMin !== null) {
        deudasQuery = deudasQuery.gte('monto', montoMin)
      }
      if (montoMax !== null) {
        deudasQuery = deudasQuery.lte('monto', montoMax)
      }

      const { data: deudasFiltradas } = await deudasQuery
      deudasIdsFiltradas = deudasFiltradas?.map(d => d.id) || []
      
      if (deudasIdsFiltradas.length === 0) {
        // No hay deudas que cumplan el filtro, retornar ceros
        return NextResponse.json({
          montoRecuperadoMes: 0,
          montoRecuperadoMesAnterior: 0,
          montoAsignadoTotal: 0,
          tasaRecupero: 0,
          tasaRecuperoMesAnterior: 0,
        })
      }
      
      pagosActualQuery = pagosActualQuery.in('deuda_id', deudasIdsFiltradas)
    }

    // Obtener pagos del mes actual
    const { data: pagosActual, error: pagosActualError } = await pagosActualQuery

    if (pagosActualError) {
      console.error('Error obteniendo pagos actual:', pagosActualError)
    }

    // Obtener pagos del mes anterior (aplicar mismo filtro de deudas si existe)
    let pagosAnteriorQuery = supabase
      .from('pagos')
      .select('monto_pagado, fecha_pago, deuda_id')
      .eq('usuario_id', user.id)
      .eq('estado', 'confirmado')
      .gte('fecha_pago', inicioMesAnterior.toISOString())
      .lte('fecha_pago', finMesAnterior.toISOString())

    if (deudasIdsFiltradas !== null) {
      pagosAnteriorQuery = pagosAnteriorQuery.in('deuda_id', deudasIdsFiltradas)
    }

    const { data: pagosAnterior, error: pagosAnteriorError } = await pagosAnteriorQuery

    if (pagosAnteriorError) {
      console.error('Error obteniendo pagos anterior:', pagosAnteriorError)
    }

    // Calcular montos recuperados
    const montoRecuperadoMes = (pagosActual || []).reduce((sum, pago) => {
      return sum + (typeof pago.monto_pagado === 'number' ? pago.monto_pagado : Number(pago.monto_pagado) || 0)
    }, 0)

    const montoRecuperadoMesAnterior = (pagosAnterior || []).reduce((sum, pago) => {
      return sum + (typeof pago.monto_pagado === 'number' ? pago.monto_pagado : Number(pago.monto_pagado) || 0)
    }, 0)

    // Obtener monto asignado total (suma de todas las deudas pendientes y pagadas)
    // Aplicar filtro de monto si existe
    let deudasQuery = supabase
      .from('deudas')
      .select('monto')
      .eq('usuario_id', user.id)

    if (montoMin !== null) {
      deudasQuery = deudasQuery.gte('monto', montoMin)
    }
    if (montoMax !== null) {
      deudasQuery = deudasQuery.lte('monto', montoMax)
    }

    const { data: deudas, error: deudasError } = await deudasQuery

    if (deudasError) {
      console.error('Error obteniendo deudas:', deudasError)
    }

    const montoAsignadoTotal = (deudas || []).reduce((sum, deuda) => {
      return sum + (typeof deuda.monto === 'number' ? deuda.monto : Number(deuda.monto) || 0)
    }, 0)

    // Calcular tasa de recupero
    const tasaRecupero = montoAsignadoTotal > 0 ? (montoRecuperadoMes / montoAsignadoTotal) * 100 : 0
    
    // Calcular tasa de recupero mes anterior (aproximación)
    const tasaRecuperoMesAnterior = montoAsignadoTotal > 0 ? (montoRecuperadoMesAnterior / montoAsignadoTotal) * 100 : 0

    return NextResponse.json({
      montoRecuperadoMes,
      montoRecuperadoMesAnterior,
      montoAsignadoTotal,
      tasaRecupero,
      tasaRecuperoMesAnterior,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

