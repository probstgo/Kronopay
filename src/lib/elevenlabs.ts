import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

interface ElevenLabsPhoneNumber {
  phone_number_id?: string;
  phone_number?: string;
  label?: string;
  supports_outbound?: boolean;
  provider?: 'twilio' | 'sip_trunk';
  // Posibles alternativas del SDK
  phoneNumberId?: string;
  supportsOutbound?: boolean;
  // Propiedades adicionales que puede tener el SDK
  [key: string]: unknown;
}

interface ElevenLabsAgent {
  agentId?: string;
  name?: string;
  phone_numbers?: ElevenLabsPhoneNumber[];
  // Posibles alternativas del SDK
  phoneNumbers?: ElevenLabsPhoneNumber[];
}

export const elevenLabsClient = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

export async function getAgent(agentId: string): Promise<ElevenLabsAgent> {
  try {
    const agent = await elevenLabsClient.conversationalAi.agents.get(agentId);
    return agent as ElevenLabsAgent;
  } catch (error) {
    console.error('Error obteniendo agente:', error);
    throw error;
  }
}

export async function listAgents() {
  try {
    const agents = await elevenLabsClient.conversationalAi.agents.list();
    return agents;
  } catch (error) {
    console.error('Error listando agentes:', error);
    throw error;
  }
}

export async function startOutboundCall(params: { 
  agentId: string; 
  toNumber: string; 
  agentPhoneNumberId?: string;
  dynamicVariables?: Record<string, string>;
}) {
  const { agentId, toNumber, agentPhoneNumberId, dynamicVariables } = params;
  // 1) Si ya nos pasan el phoneNumberId, lo usamos; sino detectamos del agente
  let provider: 'twilio' | 'sip_trunk' | undefined;
  let phoneNumberId = agentPhoneNumberId;

  if (!phoneNumberId) {
    const agentData: ElevenLabsAgent = await getAgent(agentId);
    const phones = agentData.phone_numbers ?? agentData.phoneNumbers ?? [];
    const outbound = phones.find((p) => p.supports_outbound || p.supportsOutbound);
    if (!outbound) {
      throw new Error('El agente no tiene un número con llamadas salientes habilitadas');
    }
    // twilio: phone_number_id; sip_trunk: phone_number_id también
    phoneNumberId = outbound.phone_number_id ?? outbound.phoneNumberId;
    provider = outbound.provider;
  }

  // 2) Si no detectamos provider arriba, intentamos obtenerlo desde phoneNumbers.get
  if (!provider && phoneNumberId) {
    const pn = await elevenLabsClient.conversationalAi.phoneNumbers.get(phoneNumberId);
    // Intentamos obtener el provider de diferentes formas posibles del SDK
    const pnData = pn as unknown as Record<string, unknown>;
    provider = pnData.provider as 'twilio' | 'sip_trunk' | undefined;
  }

  if (!phoneNumberId || !provider) {
    throw new Error('No se pudo determinar el número o el proveedor para la llamada');
  }

  // 3) Disparar llamada según proveedor con variables dinámicas
  const callParams = {
    agentId,
    agentPhoneNumberId: phoneNumberId,
    toNumber,
    ...(dynamicVariables && {
      conversationConfigOverride: {
        agent: {
          dynamicVariables: {
            dynamicVariablePlaceholders: dynamicVariables
          }
        }
      }
    })
  };

  if (provider === 'twilio') {
    return elevenLabsClient.conversationalAi.twilio.outboundCall(callParams);
  }
  if (provider === 'sip_trunk') {
    return elevenLabsClient.conversationalAi.sipTrunk.outboundCall(callParams);
  }

  throw new Error(`Proveedor no soportado: ${provider}`);
}
