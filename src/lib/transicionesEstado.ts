import { createClient } from '@supabase/supabase-js'

// Cliente con service_role (bypass RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Verifica y ejecuta la transición nueva → vigente si aplica
 * Esto ocurre cuando:
 * - Se ejecuta una comunicación con evento deuda_creada
 * - La deuda está en estado 'nueva'
 * - Se cumple la condición: lo que ocurra primero (1 día desde creación o esta comunicación)
 * 
 * @param deuda_id ID de la deuda
 * @param tipo_evento Tipo de evento que disparó la comunicación (opcional)
 * @returns true si se hizo la transición, false en caso contrario
 */
export async function verificarTransicionNuevaAVigente(
  deuda_id: string,
  tipo_evento?: string
): Promise<boolean> {
  try {
    // Solo aplicar si el evento es deuda_creada
    if (tipo_evento && tipo_evento !== 'deuda_creada') {
      return false
    }

    // Obtener información de la deuda
    const { data: deuda, error: deudaError } = await supabase
      .from('deudas')
      .select('id, estado, created_at, fecha_vencimiento, eliminada_at')
      .eq('id', deuda_id)
      .is('eliminada_at', null)
      .single()

    if (deudaError || !deuda) {
      console.error('Error obteniendo deuda para transición:', deudaError)
      return false
    }

    // Solo aplicar si la deuda está en estado 'nueva'
    if (deuda.estado !== 'nueva') {
      return false
    }

    // Verificar condición: lo que ocurra primero (1 día desde creación o esta comunicación)
    const fechaCreacion = new Date(deuda.created_at)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    fechaCreacion.setHours(0, 0, 0, 0)

    const diasDesdeCreacion = Math.floor(
      (hoy.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Verificar si fecha_vencimiento >= hoy (deuda no vencida)
    const fechaVenc = new Date(deuda.fecha_vencimiento)
    fechaVenc.setHours(0, 0, 0, 0)

    if (fechaVenc < hoy) {
      // Si la deuda ya está vencida, no hacer transición a vigente
      return false
    }

    // Aplicar transición si:
    // 1. Han pasado 1 o más días desde la creación, O
    // 2. Se está ejecutando una comunicación con evento deuda_creada
    const debeTransicionar = diasDesdeCreacion >= 1 || tipo_evento === 'deuda_creada'

    if (debeTransicionar) {
      const { error: updateError } = await supabase
        .from('deudas')
        .update({ estado: 'vigente' })
        .eq('id', deuda_id)
        .eq('estado', 'nueva') // Solo actualizar si aún está en 'nueva'

      if (updateError) {
        console.error('Error actualizando estado de deuda a vigente:', updateError)
        return false
      }

      console.log(`✅ Transición nueva → vigente aplicada para deuda ${deuda_id}`)
      return true
    }

    return false
  } catch (error) {
    console.error('Error en verificarTransicionNuevaAVigente:', error)
    return false
  }
}

