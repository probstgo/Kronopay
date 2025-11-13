import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { calcularDiasVencidos, calcularEstadoEfectivoDeuda } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    // Crear cliente Supabase autenticado
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignorar errores de setAll en Server Components
            }
          },
        },
      }
    )

    // Verificar autenticación
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { filtros } = body

    if (!filtros) {
      return NextResponse.json({ error: 'Filtros requeridos' }, { status: 400 })
    }

    // Obtener todos los deudores del usuario con sus deudas y contactos
    const { data: deudores, error: deudoresError } = await supabase
      .from('deudores')
      .select(`
        id,
        rut,
        nombre,
        deudas (
          id,
          monto,
          estado,
          fecha_vencimiento,
          eliminada_at
        ),
        contactos (
          id,
          tipo_contacto,
          valor
        )
      `)
      .eq('usuario_id', session.user.id)

    if (deudoresError) {
      return NextResponse.json({ error: 'Error obteniendo deudores' }, { status: 500 })
    }

    // Filtrar deudas eliminadas (soft delete) en JavaScript
    const deudoresConDeudasActivas = (deudores || []).map(deudor => ({
      ...deudor,
      deudas: (deudor.deudas || []).filter((d: { eliminada_at: string | null }) => d.eliminada_at === null)
    })).filter(deudor => (deudor.deudas || []).length > 0)  // Solo deudores con al menos una deuda activa

    // Aplicar filtros
    let deudoresFiltrados = deudoresConDeudasActivas.filter(deudor => {
      // Filtrar por estado de deuda
      if (filtros.estado_deuda && Array.isArray(filtros.estado_deuda) && filtros.estado_deuda.length > 0) {
        // Calcular el estado efectivo de cada deuda usando la misma lógica que la sección de deudores
        const tieneEstado = (deudor.deudas || []).some((d: { estado: string; fecha_vencimiento: string }) => {
          const estadoEfectivo = calcularEstadoEfectivoDeuda(d.estado, d.fecha_vencimiento)
          return filtros.estado_deuda.includes(estadoEfectivo)
        })
        if (!tieneEstado) return false
      }

      // Filtrar por rango de monto
      const montoTotal = (deudor.deudas || []).reduce((sum: number, d: { monto: number }) => sum + (d.monto || 0), 0)
      if (filtros.rango_monto?.min !== null && filtros.rango_monto?.min !== undefined) {
        if (montoTotal < filtros.rango_monto.min) return false
      }
      if (filtros.rango_monto?.max !== null && filtros.rango_monto?.max !== undefined) {
        if (montoTotal > filtros.rango_monto.max) return false
      }

      // Filtrar por días vencidos
      if (filtros.dias_vencidos?.min !== null && filtros.dias_vencidos?.min !== undefined) {
        const deudaVencida = (deudor.deudas || []).find((d: { fecha_vencimiento: string }) => {
          if (!d.fecha_vencimiento) return false
          const diasVencidos = calcularDiasVencidos(d.fecha_vencimiento)
          return diasVencidos >= filtros.dias_vencidos.min
        })
        if (!deudaVencida) return false
      }
      if (filtros.dias_vencidos?.max !== null && filtros.dias_vencidos?.max !== undefined) {
        const deudaVencida = (deudor.deudas || []).find((d: { fecha_vencimiento: string }) => {
          if (!d.fecha_vencimiento) return false
          const diasVencidos = calcularDiasVencidos(d.fecha_vencimiento)
          return diasVencidos <= filtros.dias_vencidos.max
        })
        if (!deudaVencida) return false
      }

      // Filtrar por tipo de contacto
      if (filtros.tipo_contacto && Array.isArray(filtros.tipo_contacto) && filtros.tipo_contacto.length > 0) {
        const tiposContacto = (deudor.contactos || []).map((c: { tipo_contacto: string }) => c.tipo_contacto)
        const tieneTipo = filtros.tipo_contacto.some((tipo: string) => tiposContacto.includes(tipo))
        if (!tieneTipo) return false
      }

      // Filtrar por historial de acciones (simplificado - verificar si hay historial)
      if (filtros.historial_acciones && Array.isArray(filtros.historial_acciones) && filtros.historial_acciones.length > 0) {
        // Por ahora, si se especifica historial, incluimos todos los deudores
        // En el futuro se puede consultar la tabla historial
      }

      return true
    })

    // Aplicar límite si existe
    if (filtros.limite_resultados && filtros.limite_resultados > 0) {
      deudoresFiltrados = deudoresFiltrados.slice(0, filtros.limite_resultados)
    }

    return NextResponse.json({
      total: deudoresFiltrados.length,
      aplicado_limite: filtros.limite_resultados && filtros.limite_resultados > 0
    })

  } catch (error) {
    console.error('Error contando deudores:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error contando deudores', detalles: errorMessage },
      { status: 500 }
    )
  }
}

