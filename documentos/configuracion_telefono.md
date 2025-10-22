# Integración de ElevenLabs para Llamadas Automatizadas de Cobranza

## Resumen Ejecutivo

Este documento describe cómo integrar la plataforma de agentes conversacionales de ElevenLabs en tu sistema de cobranza para realizar llamadas automatizadas a deudores. La integración permite configurar agentes de IA que pueden realizar llamadas telefónicas, gestionar conversaciones y escalar a agentes humanos cuando sea necesario.

## Tabla de Contenidos

1. [Introducción a ElevenLabs Agents Platform](#introducción-a-elevenlabs-agents-platform)
2. [Configuración del Agente](#configuración-del-agente)
3. [Integración Telefónica](#integración-telefónica)
4. [Configuración desde tu Plataforma](#configuración-desde-tu-plataforma)
5. [Implementación Técnica](#implementación-técnica)
6. [Casos de Uso para Cobranza](#casos-de-uso-para-cobranza)
7. [Consideraciones de Seguridad y Compliance](#consideraciones-de-seguridad-y-compliance)

## Introducción a ElevenLabs Agents Platform

### Autenticación y Base URL
- **Base URL**: `https://api.elevenlabs.io`
- **Autenticación**: Header `xi-api-key: <TU_API_KEY>`
- **Endpoint principal**: `GET /v1/convai/agents/{agent_id}`

### Estructura de Configuración del Agente

La configuración de un agente incluye múltiples componentes:

#### ASR (Reconocimiento de Voz)
```json
{
  "asr": {
    "quality": "high",
    "provider": "elevenlabs",
    "user_input_audio_format": "pcm_8000",
    "keywords": ["string"]
  }
}
```

#### TTS (Síntesis de Voz)
```json
{
  "tts": {
    "model_id": "eleven_turbo_v2",
    "voice_id": "cjVigY5qzO86Huf0OWal",
    "agent_output_audio_format": "pcm_8000",
    "optimize_streaming_latency": 0,
    "stability": 0.5,
    "speed": 1.1,
    "similarity_boost": 0.5
  }
}
```

#### Turn-taking (Gestión de Turnos)
```json
{
  "turn": {
    "turn_timeout": 7,
    "silence_end_call_timeout": -1,
    "mode": "silence"
  }
}
```

#### Configuración del Agente
```json
{
  "agent": {
    "first_message": "Hola, soy un asistente de cobranza...",
    "language": "es",
    "prompt": {
      "prompt": "Eres un asistente de cobranza profesional...",
      "llm": "gpt-4o-mini",
      "reasoning_effort": "minimal",
      "temperature": 0,
      "max_tokens": -1
    }
  }
}
```

## Configuración del Agente

### Modelos TTS Disponibles
- `eleven_turbo_v2` - Rápido y eficiente
- `eleven_turbo_v2_5` - Versión mejorada
- `eleven_flash_v2` - Ultra rápido
- `eleven_flash_v2_5` - Flash mejorado
- `eleven_multilingual_v2` - **Recomendado para español**

> ⚠️ **Importante**: Los modelos TTS v1 están deprecados y se retirarán el 2025-12-15. Migra a modelos recientes.

### Herramientas Integradas del Sistema
- `end_call` - Terminar llamada
- `language_detection` - Detectar idioma
- `transfer_to_agent` - Transferir a otro agente
- `transfer_to_number` - Transferir a número específico
- `skip_turn` - Saltar turno
- `play_keypad_touch_tone` - Reproducir tonos DTMF
- `voicemail_detection` - Detectar buzón de voz

### Configuración RAG (Retrieval Augmented Generation)
```json
{
  "rag": {
    "enabled": true,
    "embedding_model": "e5_mistral_7b_instruct",
    "max_vector_distance": 0.6,
    "max_documents_length": 50000,
    "max_retrieved_rag_chunks_count": 20
  }
}
```

## Integración Telefónica

### Opción 1: Integración con Twilio (Recomendada)

#### Pasos de Configuración:
1. **Importar número de Twilio** en el panel de ElevenLabs
2. **Proporcionar Account SID y Auth Token**
3. **Asignar agente al número**
4. **Configurar webhooks automáticamente**

#### Ventajas:
- Configuración automática de webhooks
- Soporte para llamadas entrantes y salientes
- Integración nativa con batch calls
- Gestión de números múltiples

### Opción 2: SIP Trunking

Para empresas con infraestructura SIP existente:

```json
{
  "provider": "sip_trunk",
  "outbound_trunk": {
    "address": "sip.example.com",
    "transport": "tls",
    "media_encryption": "required",
    "headers": {},
    "has_auth_credentials": true
  }
}
```

### Batch Calls para Campañas

La plataforma soporta campañas de llamadas masivas:
- Programación de llamadas
- Gestión de listas de contactos
- Seguimiento de resultados
- Configuración de reintentos

## Configuración desde tu Plataforma

### Overrides por Conversación

Puedes personalizar el comportamiento del agente sin modificar la configuración base:

```json
{
  "conversation_config_override": {
    "tts": {
      "voice_id": "nueva_voz_especifica",
      "stability": 0.8,
      "speed": 1.2
    },
    "conversation": {
      "text_only": false
    },
    "agent": {
      "first_message": "Hola {nombre_deudor}, llamo sobre su deuda de ${monto}...",
      "language": "es"
    }
  }
}
```

### Variables Dinámicas

```json
{
  "dynamic_variables": {
    "dynamic_variable_placeholders": {
      "nombre_deudor": "Juan Pérez",
      "monto_deuda": "$1,500.00",
      "fecha_vencimiento": "15 de enero, 2024"
    }
  }
}
```

## Implementación Técnica

### Variables de Entorno

```bash
ELEVENLABS_API_KEY=tu_clave_api_aqui
ELEVENLABS_BASE_URL=https://api.elevenlabs.io
```

### Cliente ElevenLabs (Node.js/Next.js)

```typescript
// src/lib/elevenlabs.ts
export async function getAgent(agentId: string) {
  const res = await fetch(`${process.env.ELEVENLABS_BASE_URL}/v1/convai/agents/${agentId}`, {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! }
  });
  if (!res.ok) throw new Error(`ElevenLabs error ${res.status}`);
  return res.json();
}

export async function createCall(agentId: string, phoneNumber: string, overrides?: any) {
  // Implementar lógica de llamada con overrides
}
```

### Endpoint API en tu Aplicación

```typescript
// src/app/api/elevenlabs/agents/[agentId]/route.ts
import { NextResponse } from 'next/server';

export async function GET(_: Request, { params }: { params: { agentId: string } }) {
  const res = await fetch(`${process.env.ELEVENLABS_BASE_URL}/v1/convai/agents/${params.agentId}`, {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! }
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

### SDK Oficial (JavaScript)

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({ 
  environment: "https://api.elevenlabs.io" 
});

const agent = await client.conversationalAi.agents.get("agent_id");
```

## Casos de Uso para Cobranza

### Configuración Recomendada para Cobranza

#### TTS y Idioma
```json
{
  "tts": {
    "model_id": "eleven_multilingual_v2",
    "voice_id": "voz_espanol_latam",
    "stability": 0.7,
    "speed": 1.0
  },
  "agent": {
    "language": "es"
  }
}
```

#### Turn-taking
```json
{
  "turn": {
    "mode": "silence",
    "turn_timeout": 10,
    "silence_end_call_timeout": 30
  }
}
```

#### Prompt para Cobranza
```
Eres un asistente de cobranza profesional y respetuoso. Tu objetivo es:

1. Verificar la identidad del deudor
2. Informar sobre la deuda pendiente
3. Ofrecer opciones de pago
4. Escalar a supervisor si es necesario

Mantén un tono profesional pero empático. No presiones agresivamente.
Si el deudor quiere hablar con un humano, usa la herramienta transfer_to_number.
```

#### Herramientas de Escalamiento
```json
{
  "built_in_tools": {
    "transfer_to_number": {
      "transfers": [
        {
          "phone_number": "+1234567890",
          "condition": "deudor_solicita_humano",
          "transfer_type": "conference"
        }
      ]
    }
  }
}
```

### Flujo de Llamada Típico

1. **Inicio**: Agente se presenta y verifica identidad
2. **Información**: Explica la deuda y opciones de pago
3. **Negociación**: Escucha propuestas del deudor
4. **Resolución**: Confirma acuerdo o programa seguimiento
5. **Escalamiento**: Transfiere a supervisor si es necesario

## Consideraciones de Seguridad y Compliance

### Configuración de Privacidad
```json
{
  "privacy": {
    "record_voice": true,
    "retention_days": 30,
    "delete_transcript_and_pii": false,
    "delete_audio": false,
    "zero_retention_mode": false
  }
}
```

### Webhooks Post-Call
```json
{
  "workspace_overrides": {
    "webhooks": {
      "post_call_webhook_id": "tu_webhook_id",
      "send_audio": false
    }
  }
}
```

### Límites de Llamadas
```json
{
  "call_limits": {
    "agent_concurrency_limit": 10,
    "daily_limit": 1000,
    "bursting_enabled": true
  }
}
```

## Próximos Pasos

1. **Configurar agente base** en ElevenLabs con las configuraciones recomendadas
2. **Integrar número Twilio** y asignar agente
3. **Implementar endpoints** en tu aplicación para gestionar llamadas
4. **Crear UI** para configurar overrides por campaña
5. **Configurar webhooks** para registrar resultados
6. **Realizar pruebas** con números de prueba
7. **Implementar escalamiento** a agentes humanos

## Recursos Adicionales

- [Documentación oficial de ElevenLabs](https://elevenlabs.io/docs/agents-platform/api-reference/agents/get)
- [Integración con Twilio](https://elevenlabs.io/es/agents/integrations/twilio)
- [Guía para crear tu primer agente](https://elevenlabs.io/es/blog/building-your-first-conversational-ai-agent-a-beginners-guide)
- [SDK de ElevenLabs para JavaScript](https://www.npmjs.com/package/@elevenlabs/elevenlabs-js)

---

*Documento creado para la integración de ElevenLabs en el sistema de cobranza. Última actualización: Diciembre 2024.*
