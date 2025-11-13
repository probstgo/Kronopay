import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { obtenerIP, verificarRateLimit } from '@/lib/rate-limiter'

type Canal = 'email' | 'llamada' | 'sms' | 'whatsapp'
type Estado = 'iniciado' | 'entregado' | 'completado' | 'fallido' | string

type HistorialDetalles = {
  email?: string
  telefono?: string
  rut?: string
  origen?: string
  [key: string]: unknown
}

type HistorialItem = {
  id: string
  fecha: string
  tipo_accion: Canal
  estado: Estado
  destino: string
  campana_id: string | null
  campana_nombre: string | null
  origen: string | null
}

type QueryRow = {
  id: string
  fecha: string
  tipo_accion: Canal
  estado: Estado
  campana_id: string | null
  detalles: HistorialDetalles | null
  workflows_cobranza: { nombre: string } | null
}

function parseIntSafe(value: string | null, fallback: number): number {
  const n = value ? Number.parseInt(value, 10) : Number.NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
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
    const q = url.searchParams.get('q')?.trim() || null
    const modoPrueba = url.searchParams.get('modoPrueba') // 'solo_pruebas', 'sin_pruebas', o null
    const page = parseIntSafe(url.searchParams.get('page'), 1)
    const sizeRaw = parseIntSafe(url.searchParams.get('size'), 25)
    const size = Math.min(Math.max(sizeRaw, 1), 100)

    if (from && to && from > to) {
      return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
    }

    // Construcción de consulta con JOIN para obtener nombre de campaña
    let query = supabase
      .from('historial')
      .select(
        `id, fecha, tipo_accion, estado, campana_id, detalles, workflows_cobranza(nombre)`,
        { count: 'exact' }
      )
      .order('fecha', { ascending: false })

    if (from) query = query.gte('fecha', from.toISOString())
    if (to) query = query.lte('fecha', to.toISOString())
    if (canal) query = query.eq('tipo_accion', canal)
    if (estado) query = query.eq('estado', estado)
    if (campanaId) query = query.eq('campana_id', campanaId)

    if (q) {
      // Búsqueda en detalles JSONB por campos comunes
      query = query.or(
        `detalles->>email.ilike.%${q}%,detalles->>telefono.ilike.%${q}%,detalles->>rut.ilike.%${q}%`
      )
    }

    // Filtro por modo_prueba
    if (modoPrueba === 'solo_pruebas') {
      // Solo mostrar registros con modo_prueba: true
      // Usar contains para verificar si el JSONB contiene la clave con valor true
      query = query.contains('detalles', { modo_prueba: true })
    } else if (modoPrueba === 'sin_pruebas') {
      // Excluir registros con modo_prueba: true
      // Verificar que modo_prueba sea null o no sea 'true' (cuando se extrae como texto)
      query = query.or('detalles->>modo_prueba.is.null,detalles->>modo_prueba.neq.true')
    }
    // Si modoPrueba es null o 'todos', no se aplica filtro (muestra todo)

    const fromIdx = (page - 1) * size
    const toIdx = fromIdx + size - 1
    query = query.range(fromIdx, toIdx)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const items: HistorialItem[] = ((data || []) as unknown as QueryRow[]).map((row) => {
      // Extraer destino de detalles según el tipo de acción
      let destino = 'N/A'
      if (row.detalles) {
        if (row.tipo_accion === 'email' && row.detalles.email) {
          destino = row.detalles.email
        } else if (row.tipo_accion === 'llamada' && row.detalles.telefono) {
          destino = row.detalles.telefono
        } else if (row.tipo_accion === 'sms' && row.detalles.telefono) {
          destino = row.detalles.telefono
        } else if (row.tipo_accion === 'whatsapp' && row.detalles.telefono) {
          destino = row.detalles.telefono
        }
      }

      return {
        id: row.id,
        fecha: row.fecha,
        tipo_accion: row.tipo_accion,
        estado: row.estado,
        destino,
        campana_id: row.campana_id ?? null,
        campana_nombre: row.workflows_cobranza?.nombre ?? null,
        origen: row.detalles?.origen ?? null,
      }
    })

    return NextResponse.json({ items, page, size, total: count ?? 0 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


