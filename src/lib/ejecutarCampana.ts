import { calcularProximaFecha, programarAccionesMultiples } from './programarAcciones'
import { createClient } from '@supabase/supabase-js'
import { calcularDiasVencidos } from './programarAcciones'

/**
 * Interfaz para un nodo en el flujo de campaña
 */
export interface NodoCampana {
  id: string
  tipo: 'filtro' | 'email' | 'llamada' | 'sms' | 'espera' | 'condicion'
  configuracion: Record<string, unknown>
  data?: Record<string, unknown>
}

/**
 * Interfaz para una conexión entre nodos
 */
export interface ConexionCampana {
  id: string
  source: string
  target: string
  sourceHandle?: string // Para condiciones: 'si' o 'no'
}

/**
 * Interfaz para ejecutar una campaña
 */
export interface EjecutarCampanaParams {
  usuario_id: string
  campana_id: string
  nodos: NodoCampana[]
  conexiones: ConexionCampana[]
  deudores_iniciales?: Array<{
    deuda_id: string
    rut: string
    contacto_id?: string
    vars?: Record<string, string>
  }>
}

/**
 * Ejecuta el flujo de una campaña programando todas las acciones
 */
export async function ejecutarCampana(params: EjecutarCampanaParams): Promise<{
  exitosas: number
  fallidas: number
  programaciones_creadas: number
}> {
  const { usuario_id, campana_id, nodos, conexiones, deudores_iniciales = [] } = params

  const contadores = { programacionesCreadas: 0, exitosas: 0, fallidas: 0 }

  // Encontrar el nodo inicial (FILTRO o el primer nodo sin entrada)
  const nodoInicial = encontrarNodoInicial(nodos, conexiones)
  if (!nodoInicial) {
    throw new Error('No se encontró un nodo inicial en el flujo')
  }

  // Ejecutar el flujo desde el nodo inicial
  const deudoresActuales = deudores_iniciales
  const fechaActual = new Date()

  await ejecutarNodoRecursivo(
    nodoInicial,
    nodos,
    conexiones,
    deudoresActuales,
    fechaActual,
    usuario_id,
    campana_id,
    contadores
  )

  return {
    exitosas: contadores.exitosas,
    fallidas: contadores.fallidas,
    programaciones_creadas: contadores.programacionesCreadas
  }
}

/**
 * Ejecuta un nodo y continúa con los siguientes
 */
async function ejecutarNodoRecursivo(
  nodo: NodoCampana,
  todosNodos: NodoCampana[],
  conexiones: ConexionCampana[],
  deudores: Array<{
    deuda_id: string
    rut: string
    contacto_id?: string
    vars?: Record<string, string>
  }>,
  fechaBase: Date,
  usuario_id: string,
  campana_id: string,
  contadores: { programacionesCreadas: number, exitosas: number, fallidas: number }
): Promise<void> {
  // Si no hay deudores, terminar
  if (deudores.length === 0) {
    return
  }

  let fechaEjecucion = new Date(fechaBase)
  let deudoresParaSiguiente = deudores

  // Ejecutar el nodo según su tipo
  switch (nodo.tipo) {
    case 'filtro':
      // Filtrar deudores según configuración del filtro
      deudoresParaSiguiente = await aplicarFiltro(
        deudores,
        usuario_id,
        nodo.configuracion
      )
      break

    case 'email':
    case 'sms':
      // Programar envío de email/SMS
      const resultadoEmailSMS = await programarAccionesMultiples(
        deudoresParaSiguiente,
        {
          usuario_id,
          campana_id,
          tipo_accion: nodo.tipo,
          fecha_programada: fechaEjecucion.toISOString(),
          plantilla_id: nodo.configuracion.plantilla_id as string,
          vars: extraerVariablesDeudores()
        }
      )
      contadores.programacionesCreadas += resultadoEmailSMS.exitosas
      contadores.exitosas += resultadoEmailSMS.exitosas
      contadores.fallidas += resultadoEmailSMS.fallidas
      break

    case 'llamada':
      // Programar llamada
      const resultadoLlamada = await programarAccionesMultiples(
        deudoresParaSiguiente,
        {
          usuario_id,
          campana_id,
          tipo_accion: 'llamada',
          fecha_programada: fechaEjecucion.toISOString(),
          agente_id: nodo.configuracion.agente_id as string,
          vars: extraerVariablesDeudores()
        }
      )
      contadores.programacionesCreadas += resultadoLlamada.exitosas
      contadores.exitosas += resultadoLlamada.exitosas
      contadores.fallidas += resultadoLlamada.fallidas
      break

    case 'espera':
      // Calcular próxima fecha según duración
      fechaEjecucion = calcularProximaFecha(
        fechaBase,
        nodo.configuracion.duracion as { tipo: 'minutos' | 'horas' | 'dias' | 'semanas', cantidad: number },
        nodo.configuracion.configuracion_avanzada as {
          solo_dias_laborables?: boolean
          excluir_fines_semana?: boolean
          zona_horaria?: string
          horario_trabajo?: { inicio: string, fin: string }
        }
      )
      break

    case 'condicion':
      // Evaluar condiciones y bifurcar flujo
      const { deudoresSi, deudoresNo } = await evaluarCondiciones(
        deudoresParaSiguiente
      )

      // Continuar con ambas ramas si existen
      const conexionesSi = conexiones.filter(c => c.source === nodo.id && c.sourceHandle === 'si')
      const conexionesNo = conexiones.filter(c => c.source === nodo.id && c.sourceHandle === 'no')

      if (conexionesSi.length > 0 && deudoresSi.length > 0) {
        const siguienteNodoSi = todosNodos.find(n => n.id === conexionesSi[0].target)
        if (siguienteNodoSi) {
          await ejecutarNodoRecursivo(
            siguienteNodoSi,
            todosNodos,
            conexiones,
            deudoresSi,
            fechaEjecucion,
            usuario_id,
            campana_id,
            contadores
          )
        }
      }

      if (conexionesNo.length > 0 && deudoresNo.length > 0) {
        const siguienteNodoNo = todosNodos.find(n => n.id === conexionesNo[0].target)
        if (siguienteNodoNo) {
          await ejecutarNodoRecursivo(
            siguienteNodoNo,
            todosNodos,
            conexiones,
            deudoresNo,
            fechaEjecucion,
            usuario_id,
            campana_id,
            contadores
          )
        }
      }

      // Terminar aquí porque ya se bifurcó el flujo
      return
  }

  // Continuar con el siguiente nodo
  const conexionesSiguientes = conexiones.filter(c => c.source === nodo.id && !c.sourceHandle)
  if (conexionesSiguientes.length > 0) {
    const siguienteNodo = todosNodos.find(n => n.id === conexionesSiguientes[0].target)
    if (siguienteNodo) {
      await ejecutarNodoRecursivo(
        siguienteNodo,
        todosNodos,
        conexiones,
        deudoresParaSiguiente,
        fechaEjecucion,
        usuario_id,
        campana_id,
        contadores
      )
    }
  }
}

/**
 * Encuentra el nodo inicial del flujo (FILTRO o primer nodo sin entrada)
 */
function encontrarNodoInicial(nodos: NodoCampana[], conexiones: ConexionCampana[]): NodoCampana | null {
  // Buscar nodo FILTRO primero
  const nodoFiltro = nodos.find(n => n.tipo === 'filtro')
  if (nodoFiltro) return nodoFiltro

  // Si no hay FILTRO, buscar el nodo que no tiene conexiones entrantes
  const nodosConEntrada = new Set(conexiones.map(c => c.target))
  return nodos.find(n => !nodosConEntrada.has(n.id)) || nodos[0] || null
}

/**
 * Aplica filtros a una lista de deudores consultando la BD
 */
async function aplicarFiltro(
  deudores: Array<{ deuda_id: string, rut: string, contacto_id?: string, vars?: Record<string, string> }>,
  usuario_id: string,
  configuracion: Record<string, unknown>
): Promise<Array<{ deuda_id: string, rut: string, contacto_id?: string, vars?: Record<string, string> }>> {
  // Crear cliente Supabase con service_role para consultar BD
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Obtener configuración de filtros
  const filtros = (configuracion.filtros || {}) as {
    estado_deuda?: string[]
    rango_monto?: { min: number | null, max: number | null }
    dias_vencidos?: { min: number | null, max: number | null }
    tipo_contacto?: string[]
    historial_acciones?: string[]
  }
  const ordenamiento = (configuracion.ordenamiento || { campo: 'monto', direccion: 'desc' }) as {
    campo: 'monto' | 'fecha' | 'dias_vencidos'
    direccion: 'asc' | 'desc'
  }
  const limite_resultados = configuracion.limite_resultados as number | null | undefined

  // Si no hay filtros configurados, retornar todos los deudores
  const tieneFiltros = 
    (filtros.estado_deuda && filtros.estado_deuda.length > 0) ||
    (filtros.rango_monto && (filtros.rango_monto.min !== null || filtros.rango_monto.max !== null)) ||
    (filtros.dias_vencidos && (filtros.dias_vencidos.min !== null || filtros.dias_vencidos.max !== null)) ||
    (filtros.tipo_contacto && filtros.tipo_contacto.length > 0) ||
    (filtros.historial_acciones && filtros.historial_acciones.length > 0)

  if (!tieneFiltros && !limite_resultados) {
    return deudores
  }

  // Obtener todos los deudores del usuario con sus deudas, contactos e historial
  const { data: deudoresData, error: deudoresError } = await supabase
    .from('deudores')
    .select(`
      id,
      rut,
      nombre,
      deudas (
        id,
        monto,
        estado,
        fecha_vencimiento
      ),
      contactos (
        id,
        tipo_contacto,
        valor,
        preferido
      )
    `)
    .eq('usuario_id', usuario_id)

  if (deudoresError) {
    console.error('Error obteniendo deudores para filtro:', deudoresError)
    return deudores // Retornar deudores originales si hay error
  }

  // Obtener historial de acciones si se requiere
  let historialData: Array<{ deuda_id: string, tipo_accion: string }> = []
  if (filtros.historial_acciones && filtros.historial_acciones.length > 0) {
    const { data: historial } = await supabase
      .from('historial')
      .select('deuda_id, tipo_accion')
      .eq('usuario_id', usuario_id)
      .in('tipo_accion', filtros.historial_acciones.map((accion: string) => {
        // Mapear nombres de acciones a valores de BD
        if (accion === 'email_enviado') return 'email'
        if (accion === 'llamada_realizada') return 'llamada'
        if (accion === 'sms_enviado') return 'sms'
        return accion
      }))

    if (historial) {
      historialData = historial as Array<{ deuda_id: string, tipo_accion: string }>
    }
  }

  // Aplicar filtros
  const deudoresFiltrados: Array<{
    deuda_id: string
    rut: string
    contacto_id?: string
    vars?: Record<string, string>
  }> = []

  for (const deudor of (deudoresData || [])) {
    const deudas = (deudor.deudas || []) as Array<{
      id: string
      monto: number
      estado: string
      fecha_vencimiento: string
    }>
    const contactos = (deudor.contactos || []) as Array<{
      id: string
      tipo_contacto: string
      valor: string
      preferido: boolean
    }>

    // Si no hay deudas, saltar este deudor
    if (deudas.length === 0) continue

    // Para cada deuda, verificar si pasa los filtros
    for (const deuda of deudas) {
      // Calcular días vencidos una sola vez (se usa para estado y filtro)
      const diasVencidos = deuda.fecha_vencimiento ? calcularDiasVencidos(deuda.fecha_vencimiento) : 0
      const monto = typeof deuda.monto === 'number' ? deuda.monto : Number(deuda.monto) || 0

      // Filtrar por estado de deuda
      if (filtros.estado_deuda && filtros.estado_deuda.length > 0) {
        // Calcular estado: 'vencida' si días vencidos > 0, sino usar estado de BD
        const estadoCalculado = diasVencidos > 0 ? 'vencida' : deuda.estado
        
        // Verificar si el estado calculado está en los filtros
        if (!filtros.estado_deuda.includes(estadoCalculado) && !filtros.estado_deuda.includes(deuda.estado)) {
          continue // Saltar esta deuda
        }
      }

      // Filtrar por rango de monto
      if (filtros.rango_monto?.min !== null && filtros.rango_monto?.min !== undefined) {
        if (monto < filtros.rango_monto.min) continue
      }
      if (filtros.rango_monto?.max !== null && filtros.rango_monto?.max !== undefined) {
        if (monto > filtros.rango_monto.max) continue
      }

      // Filtrar por días vencidos
      if (filtros.dias_vencidos?.min !== null && filtros.dias_vencidos?.min !== undefined) {
        if (diasVencidos < filtros.dias_vencidos.min) continue
      }
      if (filtros.dias_vencidos?.max !== null && filtros.dias_vencidos?.max !== undefined) {
        if (diasVencidos > filtros.dias_vencidos.max) continue
      }

      // Filtrar por tipo de contacto
      let contactoValido: { id: string, tipo_contacto: string, valor: string } | null = null
      if (filtros.tipo_contacto && filtros.tipo_contacto.length > 0) {
        // Buscar contacto preferido primero, luego cualquier contacto del tipo requerido
        const contactoPreferido = contactos.find(c => 
          c.preferido && filtros.tipo_contacto!.includes(c.tipo_contacto)
        )
        if (contactoPreferido) {
          contactoValido = contactoPreferido
        } else {
          const contactoCualquiera = contactos.find(c => 
            filtros.tipo_contacto!.includes(c.tipo_contacto)
          )
          if (contactoCualquiera) {
            contactoValido = contactoCualquiera
          }
        }
        if (!contactoValido) continue // No tiene contacto del tipo requerido
      } else {
        // Si no se especifica tipo de contacto, usar el preferido o el primero
        const contactoPreferido = contactos.find(c => c.preferido)
        contactoValido = contactoPreferido || (contactos.length > 0 ? contactos[0] : null)
      }

      // Filtrar por historial de acciones
      if (filtros.historial_acciones && filtros.historial_acciones.length > 0) {
        const tieneHistorial = historialData.some(h => h.deuda_id === deuda.id)
        if (!tieneHistorial) continue // No tiene historial de las acciones requeridas
      }

      // Si pasa todos los filtros, agregar a la lista
      deudoresFiltrados.push({
        deuda_id: deuda.id,
        rut: deudor.rut || '',
        contacto_id: contactoValido?.id,
        vars: {
          nombre: deudor.nombre || 'Deudor',
          monto: `$${monto}`,
          fecha_vencimiento: deuda.fecha_vencimiento || new Date().toISOString().split('T')[0],
          dias_vencidos: String(diasVencidos)
        }
      })
    }
  }

  // Aplicar ordenamiento
  let deudoresOrdenados = [...deudoresFiltrados]
  if (ordenamiento.campo === 'monto') {
    deudoresOrdenados.sort((a, b) => {
      const montoA = parseFloat(a.vars?.monto?.replace('$', '') || '0')
      const montoB = parseFloat(b.vars?.monto?.replace('$', '') || '0')
      return ordenamiento.direccion === 'desc' ? montoB - montoA : montoA - montoB
    })
  } else if (ordenamiento.campo === 'fecha') {
    deudoresOrdenados.sort((a, b) => {
      const fechaA = new Date(a.vars?.fecha_vencimiento || '1970-01-01').getTime()
      const fechaB = new Date(b.vars?.fecha_vencimiento || '1970-01-01').getTime()
      return ordenamiento.direccion === 'desc' ? fechaB - fechaA : fechaA - fechaB
    })
  } else if (ordenamiento.campo === 'dias_vencidos') {
    deudoresOrdenados.sort((a, b) => {
      const diasA = parseInt(a.vars?.dias_vencidos || '0')
      const diasB = parseInt(b.vars?.dias_vencidos || '0')
      return ordenamiento.direccion === 'desc' ? diasB - diasA : diasA - diasB
    })
  }

  // Aplicar límite de resultados
  if (limite_resultados && limite_resultados > 0) {
    deudoresOrdenados = deudoresOrdenados.slice(0, limite_resultados)
  }

  return deudoresOrdenados
}

/**
 * Evalúa condiciones y divide deudores en dos grupos
 */
async function evaluarCondiciones(
  deudores: Array<{ deuda_id: string, rut: string, contacto_id?: string, vars?: Record<string, string> }>
): Promise<{
  deudoresSi: Array<{ deuda_id: string, rut: string, contacto_id?: string, vars?: Record<string, string> }>
  deudoresNo: Array<{ deuda_id: string, rut: string, contacto_id?: string, vars?: Record<string, string> }>
}> {
  // TODO: Implementar evaluación real de condiciones consultando la BD
  // Por ahora dividimos 50/50 como placeholder
  const mitad = Math.floor(deudores.length / 2)
  return {
    deudoresSi: deudores.slice(0, mitad),
    deudoresNo: deudores.slice(mitad)
  }
}

/**
 * Extrae variables de deudores para usar en plantillas
 */
function extraerVariablesDeudores(): Record<string, string> {
  // Retornar variables genéricas
  // En la implementación real, esto consultaría la BD para obtener datos reales
  return {
    nombre: 'Deudor',
    monto: '$0',
    fecha_vencimiento: new Date().toISOString().split('T')[0]
  }
}

