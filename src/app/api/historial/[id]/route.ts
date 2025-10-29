import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { obtenerIP, verificarRateLimit } from '@/lib/rate-limiter'

type Canal = 'email' | 'llamada' | 'sms' | 'whatsapp'
type Estado = 'iniciado' | 'entregado' | 'completado' | 'fallido' | string

type HistorialDetalle = {
  id: string
  fecha: string
  tipo_accion: Canal
  estado: Estado
  destino: string
  campana_id: string | null
  detalles: Record<string, unknown> | null
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const ip = obtenerIP(request as unknown as Request)
    const permitido = await verificarRateLimit(ip, 'api')
    if (!permitido) {
      return NextResponse.json({ error: 'Rate limit excedido' }, { status: 429 })
    }

    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
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

    const { data, error } = await supabase
      .from('historial')
      .select('id, fecha, tipo_accion, estado, destino, campana_id, detalles')
      .eq('id', id)
      .single()

    if (error && error.code === 'PGRST116') {
      // Not found
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result: HistorialDetalle = {
      id: data!.id,
      fecha: data!.fecha,
      tipo_accion: data!.tipo_accion,
      estado: data!.estado,
      destino: data!.destino,
      campana_id: data!.campana_id ?? null,
      detalles: data!.detalles ?? null,
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


