import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { obtenerIP, verificarRateLimit } from '@/lib/rate-limiter'

type Canal = 'email' | 'llamada' | 'sms' | 'whatsapp'

type MetricasHistorial = {
  totales: {
    enviados: number
    entregadosCompletados: number
    fallidos: number
  }
  porCanal: Record<Canal, {
    enviados: number
    entregadosCompletados: number
    fallidos: number
  }>
  duracionLlamadasSegundos: number
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function validarEnum<T extends string>(valor: string | null, lista: readonly T[]): T | null {
  if (!valor) return null
  return (lista as readonly string[]).includes(valor) ? (valor as T) : null
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

    const url = new URL(request.url)
    const from = parseDate(url.searchParams.get('from'))
    const to = parseDate(url.searchParams.get('to'))
    const canal = validarEnum<Canal>(url.searchParams.get('canal'), ['email', 'llamada', 'sms', 'whatsapp'] as const)
    const estado = url.searchParams.get('estado')
    const campanaId = url.searchParams.get('campanaId')

    if (from && to && from > to) {
      return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
    }

    // Helper para aplicar filtros
    // Totales simples por estado - construyendo consultas inline para evitar problemas de tipos
    const [enviadosRes, entregadosRes, fallidosRes] = await Promise.all([
      (() => {
        let q = supabase.from('historial').select('*', { count: 'exact', head: true })
        if (from) q = q.gte('fecha', from.toISOString())
        if (to) q = q.lte('fecha', to.toISOString())
        if (canal) q = q.eq('tipo_accion', canal)
        if (estado) q = q.eq('estado', estado)
        if (campanaId) q = q.eq('campana_id', campanaId)
        return q.eq('estado', 'iniciado')
      })(),
      (() => {
        let q = supabase.from('historial').select('*', { count: 'exact', head: true })
        if (from) q = q.gte('fecha', from.toISOString())
        if (to) q = q.lte('fecha', to.toISOString())
        if (canal) q = q.eq('tipo_accion', canal)
        if (estado) q = q.eq('estado', estado)
        if (campanaId) q = q.eq('campana_id', campanaId)
        return q.or('estado.eq.entregado,estado.eq.completado')
      })(),
      (() => {
        let q = supabase.from('historial').select('*', { count: 'exact', head: true })
        if (from) q = q.gte('fecha', from.toISOString())
        if (to) q = q.lte('fecha', to.toISOString())
        if (canal) q = q.eq('tipo_accion', canal)
        if (estado) q = q.eq('estado', estado)
        if (campanaId) q = q.eq('campana_id', campanaId)
        return q.eq('estado', 'fallido')
      })(),
    ])

    const totales = {
      enviados: enviadosRes.count || 0,
      entregadosCompletados: entregadosRes.count || 0,
      fallidos: fallidosRes.count || 0,
    }

    // Por canal
    const canales: Canal[] = ['email', 'llamada', 'sms', 'whatsapp']
    const porCanal: MetricasHistorial['porCanal'] = {
      email: { enviados: 0, entregadosCompletados: 0, fallidos: 0 },
      llamada: { enviados: 0, entregadosCompletados: 0, fallidos: 0 },
      sms: { enviados: 0, entregadosCompletados: 0, fallidos: 0 },
      whatsapp: { enviados: 0, entregadosCompletados: 0, fallidos: 0 },
    }

    const porCanalPromises = canales.map(async (c) => {
      const [env, entComp, fall] = await Promise.all([
        (() => {
          let q = supabase.from('historial').select('*', { count: 'exact', head: true })
          if (from) q = q.gte('fecha', from.toISOString())
          if (to) q = q.lte('fecha', to.toISOString())
          if (canal) q = q.eq('tipo_accion', canal)
          if (estado) q = q.eq('estado', estado)
          if (campanaId) q = q.eq('campana_id', campanaId)
          return q.eq('tipo_accion', c).eq('estado', 'iniciado')
        })(),
        (() => {
          let q = supabase.from('historial').select('*', { count: 'exact', head: true })
          if (from) q = q.gte('fecha', from.toISOString())
          if (to) q = q.lte('fecha', to.toISOString())
          if (canal) q = q.eq('tipo_accion', canal)
          if (estado) q = q.eq('estado', estado)
          if (campanaId) q = q.eq('campana_id', campanaId)
          return q.eq('tipo_accion', c).or('estado.eq.entregado,estado.eq.completado')
        })(),
        (() => {
          let q = supabase.from('historial').select('*', { count: 'exact', head: true })
          if (from) q = q.gte('fecha', from.toISOString())
          if (to) q = q.lte('fecha', to.toISOString())
          if (canal) q = q.eq('tipo_accion', canal)
          if (estado) q = q.eq('estado', estado)
          if (campanaId) q = q.eq('campana_id', campanaId)
          return q.eq('tipo_accion', c).eq('estado', 'fallido')
        })(),
      ])

      porCanal[c] = {
        enviados: env.count || 0,
        entregadosCompletados: entComp.count || 0,
        fallidos: fall.count || 0,
      }
    })

    await Promise.all(porCanalPromises)

    // Suma de duraciones (llamadas)
    let llamadasQuery = supabase.from('historial').select('detalles, fecha, tipo_accion')
    if (from) llamadasQuery = llamadasQuery.gte('fecha', from.toISOString())
    if (to) llamadasQuery = llamadasQuery.lte('fecha', to.toISOString())
    if (canal) llamadasQuery = llamadasQuery.eq('tipo_accion', canal)
    if (estado) llamadasQuery = llamadasQuery.eq('estado', estado)
    if (campanaId) llamadasQuery = llamadasQuery.eq('campana_id', campanaId)
    const { data: llamadas, error: llamadasError } = await llamadasQuery.eq('tipo_accion', 'llamada')

    if (llamadasError) {
      return NextResponse.json({ error: llamadasError.message }, { status: 500 })
    }

    type LlamadaRow = { detalles: { duracion?: number | string | null } | null }
    const duracionLlamadasSegundos = ((llamadas || []) as unknown as LlamadaRow[]).reduce((acc, row) => {
      const d = row.detalles?.duracion
      const n = typeof d === 'number' ? d : Number.isFinite(Number(d)) ? Number(d) : 0
      return acc + (Number.isFinite(n) ? n : 0)
    }, 0)

    const result: MetricasHistorial = {
      totales,
      porCanal,
      duracionLlamadasSegundos,
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


