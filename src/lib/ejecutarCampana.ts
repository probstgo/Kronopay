import { calcularProximaFecha, programarAccionesMultiples } from './programarAcciones'
import { createClient } from '@supabase/supabase-js'
import { calcularDiasVencidos } from './programarAcciones'
import { registrarLogEjecucion } from './logsEjecucion'

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
  ejecucion_id?: string // ID de ejecución_workflow para asociar logs
}

/**
 * Ejecuta el flujo de una campaña programando todas las acciones
 */
export async function ejecutarCampana(params: EjecutarCampanaParams): Promise<{
  exitosas: number
  fallidas: number
  programaciones_creadas: number
}> {
  const { usuario_id, campana_id, nodos, conexiones, deudores_iniciales = [], ejecucion_id } = params

  const contadores = { programacionesCreadas: 0, exitosas: 0, fallidas: 0 }
  const pasoNumero = 0 // Contador de pasos para logs

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
    contadores,
    ejecucion_id,
    pasoNumero
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
  contadores: { programacionesCreadas: number, exitosas: number, fallidas: number },
  ejecucion_id?: string,
  pasoNumero: number = 0
): Promise<number> {
  // Si no hay deudores, terminar
  if (deudores.length === 0) {
    return pasoNumero
  }

  // Incrementar paso número para este nodo
  const pasoActual = pasoNumero + 1
  const inicioTiempo = Date.now()
  let fechaEjecucion = new Date(fechaBase)
  let deudoresParaSiguiente = deudores
  let errorEjecucion: string | undefined
  let datosSalida: Record<string, unknown> = {}

  // Registrar log de inicio si hay ejecucion_id
  if (ejecucion_id) {
    await registrarLogEjecucion({
      ejecucion_id,
      nodo_id: nodo.id,
      paso_numero: pasoActual,
      tipo_accion: nodo.tipo === 'email' || nodo.tipo === 'sms' || nodo.tipo === 'llamada' 
        ? nodo.tipo 
        : nodo.tipo === 'condicion' 
          ? 'condicion' 
          : nodo.tipo === 'espera' 
            ? 'espera' 
            : 'filtro',
      estado: 'iniciado',
      datos_entrada: {
        cantidad_deudores: deudores.length,
        configuracion: nodo.configuracion,
        fecha_base: fechaBase.toISOString()
      }
    })
  }

  try {
    // Ejecutar el nodo según su tipo
    switch (nodo.tipo) {
    case 'filtro':
      // Filtrar deudores según configuración del filtro
      deudoresParaSiguiente = await aplicarFiltro(
        deudores,
        usuario_id,
        nodo.configuracion
      )
      datosSalida = {
        cantidad_deudores_entrada: deudores.length,
        cantidad_deudores_salida: deudoresParaSiguiente.length,
        deudores_filtrados: deudoresParaSiguiente.length
      }
      break

    case 'email':
    case 'sms':
      // Extraer variables de deudores antes de programar acciones
      const deudoresConVarsEmailSMS = await Promise.all(
        deudoresParaSiguiente.map(async (deudor) => {
          // Si ya tiene variables, usarlas; si no, extraerlas desde BD
          if (deudor.vars) {
            return deudor
          }
          const vars = await extraerVariablesDeudores(
            deudor.deuda_id,
            deudor.rut,
            usuario_id
          )
          return { ...deudor, vars }
        })
      )
      // Programar envío de email/SMS
      const resultadoEmailSMS = await programarAccionesMultiples(
        deudoresConVarsEmailSMS,
        {
          usuario_id,
          campana_id,
          tipo_accion: nodo.tipo,
          fecha_programada: fechaEjecucion.toISOString(),
          plantilla_id: nodo.configuracion.plantilla_id as string
        }
      )
      contadores.programacionesCreadas += resultadoEmailSMS.exitosas
      contadores.exitosas += resultadoEmailSMS.exitosas
      contadores.fallidas += resultadoEmailSMS.fallidas
      datosSalida = {
        cantidad_deudores: deudoresConVarsEmailSMS.length,
        programaciones_creadas: resultadoEmailSMS.exitosas,
        exitosas: resultadoEmailSMS.exitosas,
        fallidas: resultadoEmailSMS.fallidas,
        plantilla_id: nodo.configuracion.plantilla_id
      }
      break

    case 'llamada':
      // Extraer variables de deudores antes de programar acciones
      const deudoresConVarsLlamada = await Promise.all(
        deudoresParaSiguiente.map(async (deudor) => {
          // Si ya tiene variables, usarlas; si no, extraerlas desde BD
          if (deudor.vars) {
            return deudor
          }
          const vars = await extraerVariablesDeudores(
            deudor.deuda_id,
            deudor.rut,
            usuario_id
          )
          return { ...deudor, vars }
        })
      )
      // Programar llamada
      const resultadoLlamada = await programarAccionesMultiples(
        deudoresConVarsLlamada,
        {
          usuario_id,
          campana_id,
          tipo_accion: 'llamada',
          fecha_programada: fechaEjecucion.toISOString(),
          agente_id: nodo.configuracion.agente_id as string
        }
      )
      contadores.programacionesCreadas += resultadoLlamada.exitosas
      contadores.exitosas += resultadoLlamada.exitosas
      contadores.fallidas += resultadoLlamada.fallidas
      datosSalida = {
        cantidad_deudores: deudoresConVarsLlamada.length,
        programaciones_creadas: resultadoLlamada.exitosas,
        exitosas: resultadoLlamada.exitosas,
        fallidas: resultadoLlamada.fallidas,
        agente_id: nodo.configuracion.agente_id
      }
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
      datosSalida = {
        fecha_base: fechaBase.toISOString(),
        fecha_calculada: fechaEjecucion.toISOString(),
        duracion: nodo.configuracion.duracion
      }
      break

    case 'condicion':
      // Evaluar condiciones y bifurcar flujo
      const { deudoresSi, deudoresNo } = await evaluarCondiciones(
        deudoresParaSiguiente,
        usuario_id,
        nodo.configuracion
      )

      datosSalida = {
        cantidad_deudores_entrada: deudoresParaSiguiente.length,
        cantidad_deudores_si: deudoresSi.length,
        cantidad_deudores_no: deudoresNo.length,
        condiciones: nodo.configuracion.condiciones
      }

      // Continuar con ambas ramas si existen
      const conexionesSi = conexiones.filter(c => c.source === nodo.id && c.sourceHandle === 'si')
      const conexionesNo = conexiones.filter(c => c.source === nodo.id && c.sourceHandle === 'no')

      let pasoNumeroActual = pasoActual

      if (conexionesSi.length > 0 && deudoresSi.length > 0) {
        const siguienteNodoSi = todosNodos.find(n => n.id === conexionesSi[0].target)
        if (siguienteNodoSi) {
          pasoNumeroActual = await ejecutarNodoRecursivo(
            siguienteNodoSi,
            todosNodos,
            conexiones,
            deudoresSi,
            fechaEjecucion,
            usuario_id,
            campana_id,
            contadores,
            ejecucion_id,
            pasoNumeroActual
          )
        }
      }

      if (conexionesNo.length > 0 && deudoresNo.length > 0) {
        const siguienteNodoNo = todosNodos.find(n => n.id === conexionesNo[0].target)
        if (siguienteNodoNo) {
          pasoNumeroActual = await ejecutarNodoRecursivo(
            siguienteNodoNo,
            todosNodos,
            conexiones,
            deudoresNo,
            fechaEjecucion,
            usuario_id,
            campana_id,
            contadores,
            ejecucion_id,
            pasoNumeroActual
          )
        }
      }

      // Registrar log de finalización para condición
      const duracionCondicion = Date.now() - inicioTiempo
      if (ejecucion_id) {
        await registrarLogEjecucion({
          ejecucion_id,
          nodo_id: nodo.id,
          paso_numero: pasoActual,
          tipo_accion: 'condicion',
          estado: errorEjecucion ? 'fallido' : 'completado',
          datos_entrada: {
            cantidad_deudores: deudores.length,
            configuracion: nodo.configuracion,
            fecha_base: fechaBase.toISOString()
          },
          datos_salida,
          error_message: errorEjecucion,
          duracion_ms: duracionCondicion
        })
      }

      // Terminar aquí porque ya se bifurcó el flujo
      return pasoNumeroActual
  }
  } catch (error) {
    errorEjecucion = error instanceof Error ? error.message : 'Error desconocido'
    console.error(`Error ejecutando nodo ${nodo.id}:`, error)
  }

  // Registrar log de finalización
  const duracion = Date.now() - inicioTiempo
  if (ejecucion_id) {
    await registrarLogEjecucion({
      ejecucion_id,
      nodo_id: nodo.id,
      paso_numero: pasoActual,
      tipo_accion: nodo.tipo === 'email' || nodo.tipo === 'sms' || nodo.tipo === 'llamada' 
        ? nodo.tipo 
        : nodo.tipo === 'condicion' 
          ? 'condicion' 
          : nodo.tipo === 'espera' 
            ? 'espera' 
            : 'filtro',
      estado: errorEjecucion ? 'fallido' : 'completado',
      datos_entrada: {
        cantidad_deudores: deudores.length,
        configuracion: nodo.configuracion,
        fecha_base: fechaBase.toISOString()
      },
      datos_salida,
      error_message: errorEjecucion,
      duracion_ms: duracion
    })
  }

  // Continuar con el siguiente nodo
  const conexionesSiguientes = conexiones.filter(c => c.source === nodo.id && !c.sourceHandle)
  if (conexionesSiguientes.length > 0) {
    const siguienteNodo = todosNodos.find(n => n.id === conexionesSiguientes[0].target)
    if (siguienteNodo) {
      return await ejecutarNodoRecursivo(
        siguienteNodo,
        todosNodos,
        conexiones,
        deudoresParaSiguiente,
        fechaEjecucion,
        usuario_id,
        campana_id,
        contadores,
        ejecucion_id,
        pasoActual
      )
    }
  }

  return pasoActual
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
 * Evalúa condiciones y divide deudores en dos grupos consultando la BD
 */
async function evaluarCondiciones(
  deudores: Array<{ deuda_id: string, rut: string, contacto_id?: string, vars?: Record<string, string> }>,
  usuario_id: string,
  configuracion: Record<string, unknown>
): Promise<{
  deudoresSi: Array<{ deuda_id: string, rut: string, contacto_id?: string, vars?: Record<string, string> }>
  deudoresNo: Array<{ deuda_id: string, rut: string, contacto_id?: string, vars?: Record<string, string> }>
}> {
  // Crear cliente Supabase con service_role para consultar BD
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Obtener configuración de condiciones
  const condiciones = (configuracion.condiciones || []) as Array<{
    campo: string
    operador: string
    valor: string
    valor2?: string
  }>
  const logica = (configuracion.logica || 'AND') as 'AND' | 'OR'

  // Si no hay condiciones, todos pasan a "Sí"
  if (condiciones.length === 0) {
    return {
      deudoresSi: deudores,
      deudoresNo: []
    }
  }

  // Obtener datos de deudas y contactos para los deudores
  const deudaIds = deudores.map(d => d.deuda_id)
  const { data: deudasData, error: deudasError } = await supabase
    .from('deudas')
    .select(`
      id,
      monto,
      estado,
      fecha_vencimiento,
      deudor_id,
      deudores (
        id,
        rut,
        nombre,
        contactos (
          id,
          tipo_contacto,
          valor
        )
      )
    `)
    .in('id', deudaIds)
    .eq('usuario_id', usuario_id)

  if (deudasError) {
    console.error('Error obteniendo deudas para condiciones:', deudasError)
    // Si hay error, dividir 50/50 como fallback
    const mitad = Math.floor(deudores.length / 2)
    return {
      deudoresSi: deudores.slice(0, mitad),
      deudoresNo: deudores.slice(mitad)
    }
  }

  // Obtener historial de acciones si se requiere
  let historialData: Array<{ deuda_id: string, tipo_accion: string }> = []
  const necesitaHistorial = condiciones.some(c => 
    c.campo === 'historial_email' || c.campo === 'historial_llamada'
  )

  if (necesitaHistorial) {
    const { data: historial } = await supabase
      .from('historial')
      .select('deuda_id, tipo_accion')
      .eq('usuario_id', usuario_id)
      .in('deuda_id', deudaIds)

    if (historial) {
      historialData = historial as Array<{ deuda_id: string, tipo_accion: string }>
    }
  }

  // Evaluar condiciones para cada deudor
  const deudoresSi: Array<{
    deuda_id: string
    rut: string
    contacto_id?: string
    vars?: Record<string, string>
  }> = []
  const deudoresNo: Array<{
    deuda_id: string
    rut: string
    contacto_id?: string
    vars?: Record<string, string>
  }> = []

  for (const deudor of deudores) {
    // Buscar la deuda correspondiente
    const deuda = (deudasData || []).find((d: { id: string }) => d.id === deudor.deuda_id)
    if (!deuda) {
      // Si no se encuentra la deuda, va a "No"
      deudoresNo.push(deudor)
      continue
    }

    const deudaInfo = deuda as {
      id: string
      monto: number
      estado: string
      fecha_vencimiento: string
      deudor_id: string
      deudores: Array<{
        id: string
        rut: string
        nombre: string
        contactos: Array<{ id: string, tipo_contacto: string, valor: string }>
      }>
    }
    
    // Obtener el primer deudor (debería haber solo uno)
    const deudorInfo = deudaInfo.deudores && deudaInfo.deudores.length > 0 ? deudaInfo.deudores[0] : null
    if (!deudorInfo) {
      // Si no hay deudor, va a "No"
      deudoresNo.push(deudor)
      continue
    }

    // Evaluar cada condición
    const resultadosCondiciones: boolean[] = []

    for (const condicion of condiciones) {
      let resultado = false

      switch (condicion.campo) {
        case 'estado_deuda': {
          // Calcular si está vencida (días vencidos > 0)
          const diasVencidos = deudaInfo.fecha_vencimiento 
            ? calcularDiasVencidos(deudaInfo.fecha_vencimiento) 
            : 0
          const estadoCalculado = diasVencidos > 0 ? 'vencida' : deudaInfo.estado
          
          resultado = evaluarCondicionTexto(
            estadoCalculado,
            condicion.operador,
            condicion.valor
          )
          break
        }

        case 'monto_deuda': {
          const monto = typeof deudaInfo.monto === 'number' 
            ? deudaInfo.monto 
            : Number(deudaInfo.monto) || 0
          resultado = evaluarCondicionNumerica(
            monto,
            condicion.operador,
            condicion.valor,
            condicion.valor2
          )
          break
        }

        case 'dias_vencido': {
          const diasVencidos = deudaInfo.fecha_vencimiento 
            ? calcularDiasVencidos(deudaInfo.fecha_vencimiento) 
            : 0
          resultado = evaluarCondicionNumerica(
            diasVencidos,
            condicion.operador,
            condicion.valor,
            condicion.valor2
          )
          break
        }

        case 'historial_email': {
          const tieneHistorial = historialData.some(
            h => h.deuda_id === deudor.deuda_id && h.tipo_accion === 'email'
          )
          resultado = evaluarCondicionExistencia(
            tieneHistorial,
            condicion.operador
          )
          break
        }

        case 'historial_llamada': {
          const tieneHistorial = historialData.some(
            h => h.deuda_id === deudor.deuda_id && h.tipo_accion === 'llamada'
          )
          resultado = evaluarCondicionExistencia(
            tieneHistorial,
            condicion.operador
          )
          break
        }

        default:
          // Si el campo no es reconocido, la condición es falsa
          resultado = false
      }

      resultadosCondiciones.push(resultado)
    }

    // Aplicar lógica AND/OR
    let cumpleCondiciones = false
    if (logica === 'AND') {
      // Todas las condiciones deben ser verdaderas
      cumpleCondiciones = resultadosCondiciones.every(r => r === true)
    } else {
      // Al menos una condición debe ser verdadera
      cumpleCondiciones = resultadosCondiciones.some(r => r === true)
    }

    // Agregar a la lista correspondiente
    if (cumpleCondiciones) {
      deudoresSi.push(deudor)
    } else {
      deudoresNo.push(deudor)
    }
  }

  return {
    deudoresSi,
    deudoresNo
  }
}

/**
 * Evalúa una condición de texto
 */
function evaluarCondicionTexto(
  valor: string,
  operador: string,
  valorComparar: string
): boolean {
  switch (operador) {
    case 'igual':
      return valor.toLowerCase() === valorComparar.toLowerCase()
    case 'contiene':
      return valor.toLowerCase().includes(valorComparar.toLowerCase())
    case 'existe':
      return valor !== null && valor !== undefined && valor !== ''
    case 'no_existe':
      return valor === null || valor === undefined || valor === ''
    default:
      return false
  }
}

/**
 * Evalúa una condición numérica
 */
function evaluarCondicionNumerica(
  valor: number,
  operador: string,
  valorComparar: string,
  valorComparar2?: string
): boolean {
  const numValor = Number(valorComparar) || 0
  const numValor2 = valorComparar2 ? (Number(valorComparar2) || 0) : 0

  switch (operador) {
    case 'igual':
      return valor === numValor
    case 'mayor':
      return valor > numValor
    case 'menor':
      return valor < numValor
    case 'entre':
      return valor >= numValor && valor <= numValor2
    case 'existe':
      return valor !== null && valor !== undefined && !isNaN(valor)
    default:
      return false
  }
}

/**
 * Evalúa una condición de existencia
 */
function evaluarCondicionExistencia(
  existe: boolean,
  operador: string
): boolean {
  switch (operador) {
    case 'existe':
      return existe
    case 'no_existe':
      return !existe
    default:
      return false
  }
}

/**
 * Extrae variables de deudores para usar en plantillas consultando la BD
 */
async function extraerVariablesDeudores(
  deuda_id: string,
  rut: string,
  usuario_id: string
): Promise<Record<string, string>> {
  // Crear cliente Supabase con service_role para consultar BD
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Obtener deuda con deudor y contactos
    const { data: deudaData, error: deudaError } = await supabase
      .from('deudas')
      .select(`
        id,
        monto,
        estado,
        fecha_vencimiento,
        deudor_id,
        deudores (
          id,
          rut,
          nombre,
          contactos (
            id,
            tipo_contacto,
            valor,
            preferido
          )
        )
      `)
      .eq('id', deuda_id)
      .eq('usuario_id', usuario_id)
      .single()

    if (deudaError || !deudaData) {
      console.error('Error obteniendo deuda para extraer variables:', deudaError)
      // Retornar variables genéricas si hay error
      return {
        nombre: 'Deudor',
        monto: '$0',
        fecha_vencimiento: new Date().toISOString().split('T')[0],
        dias_vencidos: '0',
        email: '',
        telefono: ''
      }
    }

    const deuda = deudaData as {
      id: string
      monto: number
      estado: string
      fecha_vencimiento: string
      deudor_id: string
      deudores: Array<{
        id: string
        rut: string
        nombre: string
        contactos: Array<{
          id: string
          tipo_contacto: string
          valor: string
          preferido: boolean
        }>
      }>
    }

    // Obtener el primer deudor (debería haber solo uno)
    const deudor = deuda.deudores && deuda.deudores.length > 0 ? deuda.deudores[0] : null
    if (!deudor) {
      console.error('No se encontró deudor para la deuda:', deuda_id)
      return {
        nombre: 'Deudor',
        monto: '$0',
        fecha_vencimiento: new Date().toISOString().split('T')[0],
        dias_vencidos: '0',
        email: '',
        telefono: ''
      }
    }

    // Obtener nombre de empresa del usuario
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('nombre_empresa')
      .eq('id', usuario_id)
      .single()

    const nombreEmpresa = usuarioData?.nombre_empresa || 'Nuestra empresa'

    // Calcular días vencidos
    const diasVencidos = deuda.fecha_vencimiento
      ? calcularDiasVencidos(deuda.fecha_vencimiento)
      : 0

    // Formatear monto
    const monto = typeof deuda.monto === 'number' ? deuda.monto : Number(deuda.monto) || 0
    const montoFormateado = `$${monto.toLocaleString('es-CL')}`

    // Extraer contactos
    const contactos = deudor.contactos || []
    const contactoEmail = contactos.find(c => c.tipo_contacto === 'email' && c.preferido) ||
                          contactos.find(c => c.tipo_contacto === 'email') ||
                          null
    const contactoTelefono = contactos.find(c => c.tipo_contacto === 'telefono' && c.preferido) ||
                             contactos.find(c => c.tipo_contacto === 'telefono') ||
                             null

    // Formatear fecha de vencimiento
    let fechaVencimientoFormateada = deuda.fecha_vencimiento || new Date().toISOString().split('T')[0]
    if (fechaVencimientoFormateada) {
      try {
        const fecha = new Date(fechaVencimientoFormateada)
        fechaVencimientoFormateada = fecha.toLocaleDateString('es-CL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      } catch {
        // Si hay error al formatear, usar la fecha original
      }
    }

    // Retornar todas las variables
    return {
      nombre: deudor.nombre || 'Deudor',
      monto: montoFormateado,
      fecha_vencimiento: fechaVencimientoFormateada,
      dias_vencidos: String(diasVencidos),
      email: contactoEmail?.valor || '',
      telefono: contactoTelefono?.valor || '',
      empresa: nombreEmpresa
    }
  } catch (error) {
    console.error('Error extrayendo variables de deudor:', error)
    // Retornar variables genéricas si hay error
    return {
      nombre: 'Deudor',
      monto: '$0',
      fecha_vencimiento: new Date().toISOString().split('T')[0],
      dias_vencidos: '0',
      email: '',
      telefono: '',
      empresa: 'Nuestra empresa'
    }
  }
}

