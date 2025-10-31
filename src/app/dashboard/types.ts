// Tipos para el Dashboard

export type Canal = 'email' | 'llamada' | 'sms' | 'whatsapp'

export interface RecuperosData {
  montoRecuperadoMes: number
  montoRecuperadoMesAnterior: number
  montoAsignadoTotal: number
  tasaRecupero: number
  tasaRecuperoMesAnterior: number
}

export interface AgingBucket {
  rango: '0-30' | '31-60' | '61-90' | '+90'
  monto: number
  label: string
}

export interface AgingData {
  buckets: AgingBucket[]
  total: number
}

export interface EfectividadPorCanal {
  canal: Canal
  montoRecuperado: number
  porcentaje: number
  label: string
}

export interface EfectividadData {
  porCanal: EfectividadPorCanal[]
  total: number
}

export interface ContactabilidadData {
  intentosTotales: number
  contactosEfectivos: number
  tasaContacto: number
  llamadasHoy: number
}

export interface UsoPlanData {
  emailsUsado: number
  emailsLimite: number
  minutosUsado: number
  minutosLimite: number
  smsUsado: number
  smsLimite: number
  costoTotal: number
  planNombre: string
  fechaRenovacion: string | null
}

export interface PlanActualData {
  plan: {
    id: string
    nombre: string
    precio_mensual: number
    limite_emails: number
    limite_llamadas: number
    limite_sms: number
    limite_whatsapp: number
    limite_memoria_mb: number
  }
  estado_suscripcion: 'activo' | 'vencido' | 'cancelado' | 'suspendido'
  fecha_inicio_suscripcion: string | null
  fecha_renovacion: string | null
}

export interface FiltrosDashboard {
  rangoMonto: {
    min: number | null
    max: number | null
  }
  rangoFechas: {
    desde: string
    hasta: string
  }
}

