import { calcularProximaFecha, programarAccionesMultiples } from './programarAcciones'

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
      deudoresParaSiguiente = await aplicarFiltro(deudores)
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
 * Aplica filtros a una lista de deudores
 */
async function aplicarFiltro(
  deudores: Array<{ deuda_id: string, rut: string, contacto_id?: string, vars?: Record<string, string> }>
): Promise<Array<{ deuda_id: string, rut: string, contacto_id?: string, vars?: Record<string, string> }>> {
  // TODO: Implementar filtrado real consultando la BD
  // Por ahora retornamos todos los deudores
  // En la implementación real, esto consultaría la BD con los filtros aplicados
  return deudores
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

