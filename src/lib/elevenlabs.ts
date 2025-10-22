import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const elevenLabsClient = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

export async function getAgent(agentId: string) {
  try {
    const agent = await elevenLabsClient.conversationalAi.agents.get(agentId);
    return agent;
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

export async function startOutboundCall(params: { agentId: string; toNumber: string; agentPhoneNumberId?: string }) {
  const { agentId, toNumber, agentPhoneNumberId } = params;
  // 1) Si ya nos pasan el phoneNumberId, lo usamos; sino detectamos del agente
  let provider: 'twilio' | 'sip_trunk' | undefined;
  let phoneNumberId = agentPhoneNumberId;

  if (!phoneNumberId) {
    const agent = await getAgent(agentId);
    const phones = (agent as any)?.phone_numbers ?? (agent as any)?.phoneNumbers ?? [];
    const outbound = phones.find((p: any) => p.supports_outbound || p.supportsOutbound);
    if (!outbound) {
      throw new Error('El agente no tiene un número con llamadas salientes habilitadas');
    }
    // twilio: phone_number_id; sip_trunk: phone_number_id también
    phoneNumberId = (outbound as any).phone_number_id ?? (outbound as any).phoneNumberId;
    provider = (outbound as any).provider;
  }

  // 2) Si no detectamos provider arriba, intentamos obtenerlo desde phoneNumbers.get
  if (!provider && phoneNumberId) {
    const pn = await elevenLabsClient.conversationalAi.phoneNumbers.get(phoneNumberId);
    provider = (pn as any)?.provider?.provider ?? (pn as any)?.provider; // en SDK puede variar
  }

  if (!phoneNumberId || !provider) {
    throw new Error('No se pudo determinar el número o el proveedor para la llamada');
  }

  // 3) Disparar llamada según proveedor
  if (provider === 'twilio') {
    return elevenLabsClient.conversationalAi.twilio.outboundCall({
      agentId,
      agentPhoneNumberId: phoneNumberId,
      toNumber,
    });
  }
  if (provider === 'sip_trunk') {
    return elevenLabsClient.conversationalAi.sipTrunk.outboundCall({
      agentId,
      agentPhoneNumberId: phoneNumberId,
      toNumber,
    });
  }

  throw new Error(`Proveedor no soportado: ${provider}`);
}
