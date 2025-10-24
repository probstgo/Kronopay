// Tipos para el sistema de programas de ejecución
export interface Contacto {
  valor: string;
  tipo_contacto: string;
}

export interface Plantilla {
  contenido: string;
  tipo?: string;
}

export interface ProgramaEjecucion {
  id: string;
  usuario_id: string;
  deuda_id: string;
  contacto_id: string;
  campana_id: string;
  tipo_accion: string;
  plantilla_id: string;
  agente_id: string;
  vars: Record<string, string>;
  voz_config: Record<string, unknown>;
  contactos: Contacto[];
  plantillas: Plantilla[];
  deudas: Array<{
    monto: number;
    fecha_vencimiento: string;
    deudor_id: string;
    rut?: string;
  }>;
}

// Tipos para webhooks de ElevenLabs
export interface HistorialConversacion {
  id: string;
  usuario_id: string;
  agente_id: string;
  deudor_id: string;
  estado: string;
}

export interface EventoWebhook {
  transcript?: {
    turns: Array<{
      role: 'agent' | 'user';
      message: string;
      start_time: string;
      end_time: string;
    }>;
  };
  call_id?: string;
  status?: string;
  conversation_id?: string;
  duration?: number;
  cost?: number;
}

// Tipos para configuración de reintentos
export interface ConfigReintento {
  max: number;
  backoff: string[];
}

export interface ConfigReintentos {
  email: ConfigReintento;
  sms: ConfigReintento;
  whatsapp: ConfigReintento;
  llamada: ConfigReintento;
}
