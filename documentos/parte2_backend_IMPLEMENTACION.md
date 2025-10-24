# Último Paso: Implementación del Backend y Aplicación

Este documento te guía en la implementación del backend y la aplicación después de completar la configuración de la base de datos en Supabase.

---

## 📋 Tabla de Contenidos

1. [Implementar las Automatizaciones (REQUERIDO)](#1-implementar-las-automatizaciones-requerido)
   - [A) Crear el Job Programado (Ejecutor)](#a-crear-el-job-programado-ejecutor)
     - [Opción 1: Vercel Cron Jobs (Recomendado)](#opción-1-vercel-cron-jobs-recomendado)
   - [B) Crear Webhooks de Proveedores](#b-crear-webhooks-de-proveedores)
     - [B1) Webhook de Resend (Emails)](#b1-webhook-de-resend-emails)
     - [B2) Webhook de ElevenLabs (Llamadas)](#b2-webhook-de-elevenlabs-llamadas)
   - [C) Implementar Lógica de Negocio](#c-implementar-lógica-de-negocio)
     - [C1) Reintentos con Backoff](#c1-reintentos-con-backoff)
     - [C2) Validación de Guardrails](#c2-validación-de-guardrails)
     - [C3) Rate Limiting](#c3-rate-limiting)
2. [Implementar las Sugerencias del Frontend](#2-implementar-las-sugerencias-del-frontend)
   - [A) Formateo de Montos CLP](#a-formateo-de-montos-clp)
   - [B) Ofuscación de Números de Teléfono](#b-ofuscación-de-números-de-teléfono)
3. [Conectar la App con Supabase](#3-conectar-la-app-con-supabase) ✅ COMPLETADO
4. [Implementar Integraciones Externas](#4-implementar-integraciones-externas)
   - [A) ElevenLabs (Llamadas) ✅ COMPLETADO](#a-elevenlabs-llamadas--completado)
   - [B) Resend (Emails) ✅ COMPLETADO](#b-resend-emails--completado)
   - [C) Twilio (SMS/WhatsApp) ⏳ PENDIENTE](#c-twilio-smswhatsapp--pendiente)
     - [C1) Configuración Inicial](#c1-configuración-inicial)
     - [C2) Integrar en Ejecutor Programado](#c2-integrar-en-ejecutor-programado)
     - [C3) Crear Webhook de Twilio](#c3-crear-webhook-de-twilio)
     - [C4) Crear Endpoint de Prueba](#c4-crear-endpoint-de-prueba)
5. [Pruebas End-to-End](#5-pruebas-end-to-end)
   - [Flujo Completo de Prueba](#flujo-completo-de-prueba)
   - [Pruebas de Seguridad](#pruebas-de-seguridad)
6. [Configuraciones Pendientes (Opcionales)](#6-configuraciones-pendientes-opcionales)
   - [A) Reintentos y Backoff por Usuario](#a-reintentos-y-backoff-por-usuario)
   - [B) Guardrails Globales](#b-guardrails-globales)
   - [C) Rate Limiting con Redis (Upstash)](#c-rate-limiting-con-redis-upstash)
7. [Checklist Final](#7-checklist-final)

---

## 1. Implementar las Automatizaciones (REQUERIDO)

### A) Crear el Job Programado (Ejecutor)

**Qué es:** Función que se ejecuta automáticamente cada 1-5 minutos para procesar acciones programadas.

**Dónde implementarlo:** Vercel Cron Jobs o Supabase Edge Functions.

#### Opción 1: Vercel Cron Jobs (Recomendado)

**Paso 1:** Crear el archivo `/app/api/cron/ejecutor-programado/route.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Cliente con service_role (bypass RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Nunca expongas esta key al cliente
)

export async function GET(request: Request) {
  // Verificar que es Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Obtener programaciones vencidas y pendientes
    const { data: programaciones, error } = await supabase
      .from('programaciones')
      .select(`
        id,
        usuario_id,
        deuda_id,
        contacto_id,
        campana_id,
        tipo_accion,
        plantilla_id,
        agente_id,
        vars,
        voz_config,
        contactos(valor, tipo_contacto),
        plantillas(contenido),
        deudas(monto, fecha_vencimiento, deudor_id)
      `)
      .eq('estado', 'pendiente')
      .lte('fecha_programada', new Date().toISOString())
      .limit(100)

    if (error) throw error

    // 2. Procesar cada programación
    for (const prog of programaciones || []) {
      try {
        // Marcar como procesando para evitar duplicados
        const { error: lockError } = await supabase
          .from('programaciones')
          .update({ estado: 'ejecutando' })
          .eq('id', prog.id)
          .eq('estado', 'pendiente') // Solo si aún está pendiente

        if (lockError) continue // Ya fue tomada por otro proceso

        // 3. Ejecutar acción según tipo
        let resultado
        switch (prog.tipo_accion) {
          case 'email':
            resultado = await enviarEmail(prog)
            break
          case 'llamada':
            resultado = await ejecutarLlamada(prog)
            break
          case 'sms':
            resultado = await enviarSMS(prog)
            break
          case 'whatsapp':
            resultado = await enviarWhatsApp(prog)
            break
        }

        // 4. Registrar en historial
        await supabase.from('historial').insert({
          usuario_id: prog.usuario_id,
          deuda_id: prog.deuda_id,
          rut: prog.deudas?.rut,
          contacto_id: prog.contacto_id,
          campana_id: prog.campana_id,
          tipo_accion: prog.tipo_accion,
          agente_id: prog.agente_id,
          fecha: new Date().toISOString(),
          estado: resultado.exito ? 'iniciado' : 'fallido',
          detalles: resultado
        })

        // 5. Marcar programación como ejecutada
        await supabase
          .from('programaciones')
          .update({ 
            estado: resultado.exito ? 'ejecutado' : 'cancelado' 
          })
          .eq('id', prog.id)

      } catch (err) {
        console.error(`Error procesando programación ${prog.id}:`, err)
        // Revertir a pendiente para reintentar después
        await supabase
          .from('programaciones')
          .update({ estado: 'pendiente' })
          .eq('id', prog.id)
      }
    }

    return NextResponse.json({ 
      procesadas: programaciones?.length || 0 
    })

  } catch (error) {
    console.error('Error en ejecutor:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Funciones auxiliares
async function enviarEmail(prog: any) {
  // Implementar con Resend (ya configurado)
  const resend = new Resend(process.env.RESEND_API_KEY)
  
  const contenido = resolverPlantilla(prog.plantillas.contenido, prog.vars)
  
  const { data, error } = await resend.emails.send({
    from: 'cobranza@tudominio.com',
    to: prog.contactos.valor,
    subject: 'Recordatorio de Pago',
    html: contenido
  })

  return {
    exito: !error,
    external_id: data?.id,
    detalles: error || data
  }
}

async function ejecutarLlamada(prog: any) {
  // Implementar con ElevenLabs (ya configurado)
  const elevenLabs = require('../../../lib/elevenlabs')
  
  const prompt = resolverPlantilla(prog.plantillas.contenido, prog.vars)
  
  const resultado = await elevenLabs.iniciarLlamada({
    agente_id: prog.agente_id,
    numero_destino: prog.contactos.valor,
    prompt,
    voz_config: prog.voz_config
  })

  return {
    exito: resultado.success,
    external_id: resultado.call_id,
    detalles: resultado
  }
}

async function enviarSMS(prog: any) {
  // TODO: Implementar con Twilio
  return { exito: false, error: 'No implementado' }
}

async function enviarWhatsApp(prog: any) {
  // TODO: Implementar con Twilio WhatsApp
  return { exito: false, error: 'No implementado' }
}

function resolverPlantilla(contenido: string, vars: any): string {
  if (!vars) return contenido
  
  let resultado = contenido
  for (const [key, value] of Object.entries(vars)) {
    resultado = resultado.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  }
  return resultado
}
```

**Paso 2:** Configurar el cron en `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/ejecutor-programado",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Paso 3:** Agregar variables de entorno en Vercel

```env
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
CRON_SECRET=genera_un_secreto_aleatorio
```

#### ⚠️ IMPORTANTE: Costos y Cuotas de Vercel

**¿Tiene costo adicional?**
- **Vercel Cron**: ✅ **GRATIS** en plan gratuito
- **Ejecuciones**: Cada 5 minutos = 8,640 ejecuciones/mes
- **Límite Vercel Free**: 100,000 invocaciones/mes ✅ **Estás muy por debajo**

**¿Cómo generar CRON_SECRET?**
```bash
# Opción 1: Terminal
openssl rand -base64 32

# Opción 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 3: Online
# https://generate-secret.vercel.app/32
```

**Configuración en Vercel:**
1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega: `CRON_SECRET` = el valor generado
4. Redeploy tu proyecto

**Costos externos (no de Vercel):**
- Emails (Resend): Puede cobrar por uso
- Llamadas (ElevenLabs): Puede cobrar por uso  
- SMS/WhatsApp (Twilio): Puede cobrar por uso
- Supabase: Tiene sus propias cuotas

---

### B) Crear Webhooks de Proveedores

#### B1) Webhook de Resend (Emails)

**Crear:** `/app/api/webhooks/resend/route.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('svix-signature')
    
    // Verificar firma de Resend/Svix
    // const isValid = verificarFirma(body, signature)
    // if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

    const evento = JSON.parse(body)

    // Buscar historial por external_id
    const { data: historial, error } = await supabase
      .from('historial')
      .select('*')
      .eq('detalles->>external_id', evento.data.email_id)
      .single()

    if (error || !historial) {
      return NextResponse.json({ error: 'Historial no encontrado' }, { status: 404 })
    }

    // Actualizar historial según evento
    let nuevoEstado = historial.estado
    const detallesActualizados = { ...historial.detalles }

    switch (evento.type) {
      case 'email.delivered':
        nuevoEstado = 'entregado'
        detallesActualizados.delivered_at = evento.created_at
        break
      case 'email.opened':
        detallesActualizados.opened_at = evento.created_at
        break
      case 'email.clicked':
        detallesActualizados.clicked_at = evento.created_at
        break
      case 'email.bounced':
      case 'email.complained':
        nuevoEstado = 'fallido'
        detallesActualizados.error = evento.data.error
        break
    }

    // Actualizar historial
    await supabase
      .from('historial')
      .update({ 
        estado: nuevoEstado,
        detalles: detallesActualizados
      })
      .eq('id', historial.id)

    // Actualizar métricas en usos
    if (nuevoEstado === 'entregado') {
      await supabase.rpc('incrementar_emails_enviados', {
        p_usuario_id: historial.usuario_id,
        p_periodo: obtenerPeriodoActual()
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error en webhook Resend:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

function obtenerPeriodoActual(): string {
  const fecha = new Date()
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
}
```

**Configurar webhook en Resend:**
1. Ir a Resend Dashboard → Webhooks
2. Agregar URL: `https://tudominio.com/api/webhooks/resend`
3. Seleccionar eventos: `email.delivered`, `email.bounced`, `email.opened`

---

#### B2) Webhook de ElevenLabs (Llamadas)

**Crear:** `/app/api/webhooks/elevenlabs/route.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const evento = await request.json()

    // Buscar historial por external_call_id
    const { data: historial } = await supabase
      .from('historial')
      .select('*')
      .eq('detalles->>external_call_id', evento.call_id)
      .single()

    if (!historial) {
      return NextResponse.json({ error: 'Historial no encontrado' }, { status: 404 })
    }

    let nuevoEstado = historial.estado
    const detallesActualizados = { ...historial.detalles }

    switch (evento.status) {
      case 'completed':
        nuevoEstado = 'completado'
        detallesActualizados.duracion = evento.duration
        detallesActualizados.costo = evento.cost
        detallesActualizados.transcripcion_id = evento.conversation_id
        break
      case 'failed':
      case 'no-answer':
        nuevoEstado = 'fallido'
        detallesActualizados.error = evento.error || evento.status
        break
    }

    // Actualizar historial
    await supabase
      .from('historial')
      .update({ 
        estado: nuevoEstado,
        detalles: detallesActualizados
      })
      .eq('id', historial.id)

    // Si hay conversación, guardar transcripción
    if (evento.conversation_id && evento.transcript) {
      await guardarTranscripcion(historial, evento)
    }

    // Actualizar métricas
    if (nuevoEstado === 'completado') {
      await supabase
        .from('usos')
        .update({
          llamadas_ejecutadas: supabase.sql`llamadas_ejecutadas + 1`,
          duracion_llamadas: supabase.sql`duracion_llamadas + ${evento.duration}`,
          costo_llamadas: supabase.sql`costo_llamadas + ${evento.cost}`,
          costo_total: supabase.sql`costo_total + ${evento.cost}`
        })
        .eq('usuario_id', historial.usuario_id)
        .eq('periodo', obtenerPeriodoActual())
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error en webhook ElevenLabs:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

async function guardarTranscripcion(historial: any, evento: any) {
  // Crear conversación
  const { data: conversacion } = await supabase
    .from('agente_conversaciones')
    .insert({
      usuario_id: historial.usuario_id,
      agente_id: historial.agente_id,
      historial_id: historial.id,
      external_conversation_id: evento.conversation_id,
      metrics: {
        duracion: evento.duration,
        costo: evento.cost
      }
    })
    .select()
    .single()

  // Guardar turnos de la conversación
  if (conversacion && evento.transcript?.turns) {
    const turnos = evento.transcript.turns.map((turno: any, idx: number) => ({
      conversacion_id: conversacion.id,
      turno: idx,
      who: turno.role === 'agent' ? 'agente' : 'deudor',
      text: turno.message,
      started_at: turno.start_time,
      ended_at: turno.end_time
    }))

    await supabase.from('agente_conversacion_turnos').insert(turnos)
  }
}

function obtenerPeriodoActual(): string {
  const fecha = new Date()
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
}
```

**Configurar webhook en ElevenLabs:**
1. Ir a ElevenLabs Dashboard → Webhooks
2. Agregar URL: `https://tudominio.com/api/webhooks/elevenlabs`
3. Seleccionar eventos de llamadas

---

### C) Implementar Lógica de Negocio

#### C1) Reintentos con Backoff

**Crear:** `/lib/reintentos.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function obtenerConfigReintento(
  usuario_id: string, 
  tipo_accion: string
) {
  // Primero buscar config del usuario
  const { data: userConfig } = await supabase
    .from('configuraciones')
    .select('valor')
    .eq('usuario_id', usuario_id)
    .eq('clave', `max_intentos_${tipo_accion}`)
    .single()

  if (userConfig) {
    return {
      max_intentos: parseInt(userConfig.valor),
      backoff: await obtenerBackoff(usuario_id, tipo_accion)
    }
  }

  // Si no hay config del usuario, usar defaults
  const defaults: Record<string, any> = {
    email: { max: 3, backoff: ['1m', '5m', '30m'] },
    sms: { max: 3, backoff: ['1m', '5m', '30m'] },
    whatsapp: { max: 3, backoff: ['1m', '5m', '30m'] },
    llamada: { max: 2, backoff: ['5m', '30m'] }
  }

  return {
    max_intentos: defaults[tipo_accion]?.max || 2,
    backoff: defaults[tipo_accion]?.backoff || ['5m', '30m']
  }
}

async function obtenerBackoff(usuario_id: string, tipo_accion: string) {
  const { data } = await supabase
    .from('configuraciones')
    .select('valor')
    .eq('usuario_id', usuario_id)
    .eq('clave', `backoff_${tipo_accion}`)
    .single()

  return data?.valor || ['1m', '5m', '30m']
}

export function calcularProximoIntento(
  intento_actual: number, 
  backoff: string[]
): Date {
  const delay = backoff[Math.min(intento_actual, backoff.length - 1)]
  const [valor, unidad] = [parseInt(delay), delay.slice(-1)]
  
  const ahora = new Date()
  
  switch (unidad) {
    case 'm':
      ahora.setMinutes(ahora.getMinutes() + valor)
      break
    case 'h':
      ahora.setHours(ahora.getHours() + valor)
      break
    case 'd':
      ahora.setDate(ahora.getDate() + valor)
      break
  }
  
  return ahora
}
```

#### C2) Validación de Guardrails

**Crear:** `/lib/guardrails.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function validarGuardrails(
  usuario_id: string,
  deudor_id: string,
  tipo_accion: string
): Promise<{ permitido: boolean; razon?: string }> {
  
  // 1. Obtener guardrails globales
  const { data: globales } = await supabase
    .from('configuraciones')
    .select('clave, valor')
    .is('usuario_id', null)

  const guardrailsMap = new Map(
    globales?.map(g => [g.clave, g.valor]) || []
  )

  // 2. Verificar horario permitido
  const ahora = new Date()
  const hora = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  
  const quiet_start = guardrailsMap.get('quiet_hours_start')
  const quiet_end = guardrailsMap.get('quiet_hours_end')
  
  if (quiet_start && quiet_end && 
      hora >= quiet_start && hora <= quiet_end) {
    return { permitido: false, razon: 'Horario no permitido (quiet hours)' }
  }

  // 3. Verificar día bloqueado
  const bloquear_domingos = guardrailsMap.get('bloquear_domingos')
  if (bloquear_domingos && ahora.getDay() === 0) {
    return { permitido: false, razon: 'Domingos bloqueados' }
  }

  const blocked_dates = guardrailsMap.get('blocked_dates') || []
  const fecha_actual = ahora.toISOString().split('T')[0]
  if (blocked_dates.includes(fecha_actual)) {
    return { permitido: false, razon: 'Fecha bloqueada' }
  }

  // 4. Verificar límite de mensajes por día
  const max_dia = guardrailsMap.get('max_msgs_deudor_dia')
  if (max_dia) {
    const { count } = await supabase
      .from('historial')
      .select('*', { count: 'exact', head: true })
      .eq('deuda_id', deudor_id)
      .gte('fecha', new Date(ahora.setHours(0, 0, 0, 0)).toISOString())
    
    if (count && count >= parseInt(max_dia as string)) {
      return { permitido: false, razon: 'Límite diario excedido' }
    }
  }

  // 5. Verificar límite semanal
  const max_semana = guardrailsMap.get('max_msgs_deudor_semana')
  if (max_semana) {
    const hace_7_dias = new Date()
    hace_7_dias.setDate(hace_7_dias.getDate() - 7)
    
    const { count } = await supabase
      .from('historial')
      .select('*', { count: 'exact', head: true })
      .eq('deuda_id', deudor_id)
      .gte('fecha', hace_7_dias.toISOString())
    
    if (count && count >= parseInt(max_semana as string)) {
      return { permitido: false, razon: 'Límite semanal excedido' }
    }
  }

  return { permitido: true }
}
```

#### C3) Rate Limiting

**Crear:** `/lib/rate-limiter.ts`

```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible'

const limiters = {
  webhook: new RateLimiterMemory({
    points: 100, // 100 requests
    duration: 3600, // por hora
  }),
  api: new RateLimiterMemory({
    points: 60, // 60 requests
    duration: 60, // por minuto
  })
}

export async function verificarRateLimit(
  ip: string, 
  tipo: 'webhook' | 'api' = 'api'
): Promise<boolean> {
  try {
    await limiters[tipo].consume(ip)
    return true
  } catch {
    return false
  }
}

export function obtenerIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
```

**Uso en webhooks:**

```typescript
import { verificarRateLimit, obtenerIP } from '@/lib/rate-limiter'

export async function POST(request: Request) {
  const ip = obtenerIP(request)
  
  if (!(await verificarRateLimit(ip, 'webhook'))) {
    return NextResponse.json(
      { error: 'Rate limit excedido' }, 
      { status: 429 }
    )
  }
  
  // ... resto del código
}
```

---

## 2. Implementar las Sugerencias del Frontend

### A) Formateo de Montos CLP

**Crear:** `/lib/formateo.ts`

```typescript
// Parsear entrada del usuario (con coma chilena) a número
export function parsearMontoCLP(input: string): number {
  // Remover puntos de miles y reemplazar coma por punto
  const limpio = input
    .replace(/\./g, '')  // Quitar puntos
    .replace(',', '.')   // Cambiar coma por punto
    .replace(/[^\d.-]/g, '') // Quitar cualquier otro carácter
  
  return parseFloat(limpio) || 0
}

// Formatear número a formato CLP para mostrar
export function formatearMontoCLP(monto: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(monto)
}

// Validar formato de entrada
export function validarMontoCLP(input: string): boolean {
  const patron = /^[\d.,\s]+$/
  return patron.test(input)
}
```

**Uso en componentes:**

```tsx
import { parsearMontoCLP, formatearMontoCLP } from '@/lib/formateo'

export function FormularioDeuda() {
  const [montoInput, setMontoInput] = useState('')
  
  const handleSubmit = async () => {
    const montoNumerico = parsearMontoCLP(montoInput)
    
    await supabase.from('deudas').insert({
      monto: montoNumerico,
      // ... otros campos
    })
  }
  
  return (
    <div>
      <input
        type="text"
        value={montoInput}
        onChange={(e) => setMontoInput(e.target.value)}
        placeholder="1.500.000"
      />
      <p>Monto: {formatearMontoCLP(parsearMontoCLP(montoInput))}</p>
    </div>
  )
}
```

---

### B) Ofuscación de Números de Teléfono

**Crear:** `/lib/ofuscacion.ts`

```typescript
export function ofuscarTelefono(tel: string): string {
  if (!tel || tel.length < 7) return tel
  
  const prefijo = tel.startsWith('+56') ? '+56' : tel.slice(0, 3)
  const ultimosCuatro = tel.slice(-4)
  
  return `${prefijo}*****${ultimosCuatro}` // ej: +56*****5725
}

export function mostrarTelefonoCompleto(tel: string, permitido: boolean): string {
  return permitido ? tel : ofuscarTelefono(tel)
}
```

**Uso en componentes:**

```tsx
import { ofuscarTelefono } from '@/lib/ofuscacion'

export function TablaContactos({ contactos }: { contactos: any[] }) {
  const [mostrarCompleto, setMostrarCompleto] = useState(false)
  
  return (
    <table>
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Valor</th>
          <th>
            <button onClick={() => setMostrarCompleto(!mostrarCompleto)}>
              {mostrarCompleto ? '🔒 Ocultar' : '👁️ Mostrar'}
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {contactos.map(c => (
          <tr key={c.id}>
            <td>{c.tipo_contacto}</td>
            <td>
              {c.tipo_contacto === 'telefono' 
                ? (mostrarCompleto ? c.valor : ofuscarTelefono(c.valor))
                : c.valor
              }
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## 3. Conectar la App con Supabase ✅ COMPLETADO

_Esta sección ya está implementada en tu aplicación._

---

## 4. Implementar Integraciones Externas

### A) ElevenLabs (Llamadas) ✅ COMPLETADO

_Esta integración ya está implementada._

---

### B) Resend (Emails) ✅ COMPLETADO

_Esta integración ya está implementada._

---

### C) Twilio (SMS/WhatsApp) ⏳ PENDIENTE

#### C1) Configuración Inicial

**Paso 1:** Instalar SDK de Twilio

```bash
npm install twilio
```

**Paso 2:** Agregar variables de entorno

```env
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=+56... # Tu número de Twilio
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886 # Número sandbox o tu número
```

**Paso 3:** Crear cliente de Twilio

**Archivo:** `/lib/twilio.ts`

```typescript
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function enviarSMS(params: {
  to: string
  mensaje: string
}): Promise<{ exito: boolean; sid?: string; error?: string }> {
  try {
    const message = await client.messages.create({
      body: params.mensaje,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: params.to
    })

    return {
      exito: true,
      sid: message.sid
    }
  } catch (error: any) {
    console.error('Error enviando SMS:', error)
    return {
      exito: false,
      error: error.message
    }
  }
}

export async function enviarWhatsApp(params: {
  to: string
  mensaje: string
}): Promise<{ exito: boolean; sid?: string; error?: string }> {
  try {
    const message = await client.messages.create({
      body: params.mensaje,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${params.to}`
    })

    return {
      exito: true,
      sid: message.sid
    }
  } catch (error: any) {
    console.error('Error enviando WhatsApp:', error)
    return {
      exito: false,
      error: error.message
    }
  }
}
```

---

#### C2) Integrar en Ejecutor Programado

**Actualizar:** `/app/api/cron/ejecutor-programado/route.ts`

```typescript
import { enviarSMS, enviarWhatsApp } from '@/lib/twilio'

// ... código existente ...

async function enviarSMS(prog: any) {
  const contenido = resolverPlantilla(prog.plantillas.contenido, prog.vars)
  
  const resultado = await enviarSMS({
    to: prog.contactos.valor,
    mensaje: contenido
  })

  return {
    exito: resultado.exito,
    external_id: resultado.sid,
    detalles: resultado
  }
}

async function enviarWhatsApp(prog: any) {
  const contenido = resolverPlantilla(prog.plantillas.contenido, prog.vars)
  
  const resultado = await enviarWhatsApp({
    to: prog.contactos.valor,
    mensaje: contenido
  })

  return {
    exito: resultado.exito,
    external_id: resultado.sid,
    detalles: resultado
  }
}
```

---

#### C3) Crear Webhook de Twilio

**Crear:** `/app/api/webhooks/twilio/route.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import twilio from 'twilio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const body = Object.fromEntries(formData)

    // Verificar firma de Twilio (seguridad)
    const signature = request.headers.get('x-twilio-signature') || ''
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`
    
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      signature,
      url,
      body
    )

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Buscar historial por MessageSid
    const { data: historial } = await supabase
      .from('historial')
      .select('*')
      .eq('detalles->>external_id', body.MessageSid)
      .single()

    if (!historial) {
      return NextResponse.json({ error: 'Historial no encontrado' }, { status: 404 })
    }

    let nuevoEstado = historial.estado
    const detallesActualizados = { ...historial.detalles }

    // Mapear estados de Twilio
    switch (body.MessageStatus) {
      case 'delivered':
        nuevoEstado = 'entregado'
        detallesActualizados.delivered_at = new Date().toISOString()
        break
      case 'sent':
        nuevoEstado = 'enviado'
        break
      case 'failed':
      case 'undelivered':
        nuevoEstado = 'fallido'
        detallesActualizados.error_code = body.ErrorCode
        detallesActualizados.error_message = body.ErrorMessage
        break
      case 'read':
        detallesActualizados.read_at = new Date().toISOString()
        break
    }

    // Actualizar historial
    await supabase
      .from('historial')
      .update({ 
        estado: nuevoEstado,
        detalles: detallesActualizados
      })
      .eq('id', historial.id)

    // Actualizar métricas en usos
    if (nuevoEstado === 'entregado') {
      const campo = historial.tipo_accion === 'sms' 
        ? 'sms_enviados' 
        : 'whatsapp_enviados'
      
      await supabase
        .from('usos')
        .update({
          [campo]: supabase.sql`${campo} + 1`
        })
        .eq('usuario_id', historial.usuario_id)
        .eq('periodo', obtenerPeriodoActual())
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error en webhook Twilio:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

function obtenerPeriodoActual(): string {
  const fecha = new Date()
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
}
```

**Configurar webhook en Twilio:**
1. Ir a Twilio Console → Phone Numbers → Tu número
2. En "Messaging" → "A MESSAGE COMES IN":
   - Webhook: `https://tudominio.com/api/webhooks/twilio`
   - HTTP POST
3. Guardar cambios

---

#### C4) Crear Endpoint de Prueba

**Crear:** `/app/api/test-twilio/route.ts`

```typescript
import { enviarSMS, enviarWhatsApp } from '@/lib/twilio'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { tipo, numero, mensaje } = await request.json()

  let resultado
  
  if (tipo === 'sms') {
    resultado = await enviarSMS({
      to: numero,
      mensaje: mensaje || 'Mensaje de prueba desde tu app'
    })
  } else if (tipo === 'whatsapp') {
    resultado = await enviarWhatsApp({
      to: numero,
      mensaje: mensaje || 'Mensaje de prueba desde tu app'
    })
  }

  return NextResponse.json(resultado)
}
```

**Probar con curl:**

```bash
# SMS
curl -X POST http://localhost:3000/api/test-twilio \
  -H "Content-Type: application/json" \
  -d '{"tipo":"sms","numero":"+56912345678","mensaje":"Hola desde Twilio"}'

# WhatsApp
curl -X POST http://localhost:3000/api/test-twilio \
  -H "Content-Type: application/json" \
  -d '{"tipo":"whatsapp","numero":"+56912345678","mensaje":"Hola desde WhatsApp"}'
```

---

## 5. Pruebas End-to-End

### Flujo Completo de Prueba

**Paso 1: Registrar Usuario**

```bash
# Frontend: usar formulario de registro
# O con Supabase CLI:
supabase auth signup --email test@ejemplo.com --password password123
```

**Verificar:** Se creó perfil automático en `usuarios`

```sql
SELECT * FROM usuarios WHERE email = 'test@ejemplo.com';
```

---

**Paso 2: Crear Deudor**

```typescript
const { data, error } = await supabase
  .from('deudores')
  .insert({
    usuario_id: user.id,
    rut: '19.090.595-0', // Se normaliza automáticamente
    nombre: 'Juan Pérez'
  })
```

**Verificar:** RUT normalizado a `19090595-0`

---

**Paso 3: Agregar Contacto**

```typescript
const { data, error } = await supabase
  .from('contactos')
  .insert({
    usuario_id: user.id,
    deudor_id: deudor.id,
    rut: deudor.rut,
    tipo_contacto: 'telefono',
    valor: '951365725', // Se normaliza a +56951365725
    preferido: true
  })
```

**Verificar:** Teléfono normalizado con prefijo `+56`

---

**Paso 4: Crear Deuda**

```typescript
const { data, error } = await supabase
  .from('deudas')
  .insert({
    usuario_id: user.id,
    deudor_id: deudor.id,
    rut: '', // Se copia automáticamente
    monto: 150000,
    fecha_vencimiento: '2025-12-31',
    estado: 'nueva'
  })
```

**Verificar:** RUT copiado automáticamente

---

**Paso 5: Crear Plantilla**

```typescript
const { data, error } = await supabase
  .from('plantillas')
  .insert({
    usuario_id: user.id,
    nombre: 'Recordatorio de Pago',
    tipo: 'email',
    contenido: `
      Hola {{nombre}},
      
      Te recordamos que tienes una deuda pendiente de {{monto}}.
      Fecha de vencimiento: {{fecha_vencimiento}}.
      
      Saludos,
      Equipo de Cobranza
    `
  })
```

---

**Paso 6: Crear Campaña**

```typescript
const { data, error } = await supabase
  .from('campanas')
  .insert({
    usuario_id: user.id,
    nombre: 'Campaña de Recordatorio',
    tipo: 'email',
    plantilla_id: plantilla.id,
    programacion: {
      anchor: 'fecha_vencimiento',
      steps: [
        { offset_days: -7, accion: 'email', plantilla_id: plantilla.id },
        { offset_days: 0, accion: 'sms', plantilla_id: plantilla.id },
        { offset_days: 7, accion: 'llamada', plantilla_id: plantilla.id }
      ]
    },
    deudas_asignadas: [deuda.id]
  })
```

---

**Paso 7: Crear Programación Manual**

```typescript
const { data, error } = await supabase
  .from('programaciones')
  .insert({
    usuario_id: user.id,
    deuda_id: deuda.id,
    rut: '', // Se copia automáticamente
    contacto_id: contacto.id,
    campana_id: campana.id,
    tipo_accion: 'email',
    fecha_programada: new Date(Date.now() + 60000).toISOString(), // 1 min
    plantilla_id: plantilla.id,
    vars: {
      nombre: 'Juan Pérez',
      monto: '$150.000',
      fecha_vencimiento: '31/12/2025'
    },
    estado: 'pendiente'
  })
```

---

**Paso 8: Verificar Ejecución del Job**

```bash
# Esperar 1-5 minutos (según configuración del cron)
# O ejecutar manualmente:
curl http://localhost:3000/api/cron/ejecutor-programado \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

**Verificar:**
1. Estado de `programaciones` cambió a `ejecutado`
2. Se creó entrada en `historial` con `estado='iniciado'`
3. Email/SMS/WhatsApp fue enviado

---

**Paso 9: Verificar Webhook**

```bash
# Simular webhook (solo para pruebas)
curl -X POST http://localhost:3000/api/webhooks/resend \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.delivered",
    "data": {
      "email_id": "el_external_id_del_historial"
    },
    "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

**Verificar:**
1. Estado de `historial` cambió a `entregado`
2. Se incrementó contador en `usos`

---

### Pruebas de Seguridad

**Prueba 1: RLS - Usuario no ve datos de otros**

```typescript
// Login como Usuario A
const { data: deudasA } = await supabase
  .from('deudas')
  .select('*')

console.log(deudasA) // Solo deudas del Usuario A

// Login como Usuario B
const { data: deudasB } = await supabase
  .from('deudas')
  .select('*')

console.log(deudasB) // Solo deudas del Usuario B (diferentes)
```

---

**Prueba 2: Normalización - RUT inválido rechazado**

```typescript
// Esto debe fallar:
const { error } = await supabase
  .from('deudores')
  .insert({
    usuario_id: user.id,
    rut: '123', // RUT inválido
    nombre: 'Test'
  })

console.log(error) // Error: RUT inválido o sospechoso
```

---

**Prueba 3: Guardrails - Límite diario**

```sql
-- Configurar límite de 2 mensajes por día
INSERT INTO configuraciones (usuario_id, clave, valor)
VALUES (NULL, 'max_msgs_deudor_dia', '2'::jsonb);
```

```typescript
// Crear 3 programaciones para el mismo deudor en el mismo día
// La 3ra debe ser rechazada por el guardrail
```

---

## 6. Configuraciones Pendientes (Opcionales)

### A) Reintentos y Backoff por Usuario

**Ejecutar en Supabase SQL Editor:**

```sql
-- Reemplazar 'TU-UUID' con tu UUID real
INSERT INTO configuraciones (usuario_id, clave, valor) VALUES
('TU-UUID', 'max_intentos_email', '3'::jsonb),
('TU-UUID', 'backoff_email', '["1m","5m","30m"]'::jsonb),
('TU-UUID', 'max_intentos_sms', '3'::jsonb),
('TU-UUID', 'backoff_sms', '["1m","5m","30m"]'::jsonb),
('TU-UUID', 'max_intentos_whatsapp', '3'::jsonb),
('TU-UUID', 'backoff_whatsapp', '["1m","5m","30m"]'::jsonb),
('TU-UUID', 'max_intentos_llamada', '2'::jsonb),
('TU-UUID', 'backoff_llamada', '["5m","30m"]'::jsonb);
```

---

### B) Guardrails Globales

**Ejecutar desde backend con service_role:**

```typescript
// /app/api/admin/configurar-guardrails/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  // Verificar que es el admin
  const { userId } = await request.json()
  
  if (userId !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { error } = await supabase
    .from('configuraciones')
    .upsert([
      { usuario_id: null, clave: 'max_msgs_deudor_dia', valor: 5 },
      { usuario_id: null, clave: 'max_msgs_deudor_semana', valor: 15 },
      { usuario_id: null, clave: 'max_tipos_por_deudor_semana', valor: 3 },
      { usuario_id: null, clave: 'quiet_hours_start', valor: '21:00' },
      { usuario_id: null, clave: 'quiet_hours_end', valor: '08:00' },
      { usuario_id: null, clave: 'bloquear_domingos', valor: true },
      { usuario_id: null, clave: 'blocked_dates', valor: ['2025-01-01', '2025-05-01'] }
    ])

  return NextResponse.json({ success: !error })
}
```

---

### C) Rate Limiting con Redis (Upstash)

**Paso 1:** Crear cuenta en Upstash y obtener credenciales

**Paso 2:** Instalar dependencias

```bash
npm install rate-limiter-flexible ioredis
```

**Paso 3:** Configurar Redis

```typescript
// /lib/rate-limiter-redis.ts
import { RateLimiterRedis } from 'rate-limiter-flexible'
import Redis from 'ioredis'

const redisClient = new Redis(process.env.REDIS_URL!)

export const webhookLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'webhook',
  points: 100, // 100 requests
  duration: 3600, // por hora
})

export const apiLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'api',
  points: 60, // 60 requests
  duration: 60, // por minuto
})
```

**Paso 4:** Agregar a `.env`

```env
REDIS_URL=redis://default:TU_PASSWORD@fly-...-redis.upstash.io:6379
```

---

## 7. Checklist Final

### ✅ Base de Datos
- [x] Todas las tablas creadas
- [x] Funciones y triggers implementados
- [x] RLS activado y políticas configuradas
- [x] Índices optimizados
- [x] Auditoría configurada

### ✅ Automatizaciones
- [x] Job programado implementado
- [x] Webhook Resend configurado
- [x] Webhook ElevenLabs configurado
- [ ] Webhook Twilio configurado (SMS/WhatsApp) - ⏳ PENDIENTE
- [ ] Reintentos con backoff implementados
- [ ] Guardrails validados
- [ ] Rate limiting activo

**Nota:** Los webhooks de Resend y ElevenLabs están completados. El webhook de Twilio está pendiente de implementación si se integra SMS/WhatsApp en el futuro.

### ✅ Frontend
- [ ] Formateo CLP implementado
- [ ] Ofuscación de teléfonos implementada
- [ ] Componentes de deudores
- [ ] Componentes de contactos
- [ ] Componentes de deudas
- [ ] Componentes de campañas

### ✅ Integraciones
- [x] ElevenLabs configurado
- [x] Resend configurado
- [ ] Twilio SMS configurado
- [ ] Twilio WhatsApp configurado

### ✅ Pruebas
- [ ] Flujo completo probado
- [ ] RLS verificado
- [ ] Normalización probada
- [ ] Guardrails probados
- [ ] Webhooks probados

### ✅ Producción
- [ ] Variables de entorno en Vercel
- [ ] Cron jobs configurados
- [ ] Webhooks públicos configurados
- [ ] Dominio personalizado (si aplica)
- [ ] Monitoreo configurado

---

## 📚 Recursos Útiles

- **Supabase Docs:** https://supabase.com/docs
- **Vercel Cron Jobs:** https://vercel.com/docs/cron-jobs
- **ElevenLabs API:** https://elevenlabs.io/docs/api-reference
- **Resend Docs:** https://resend.com/docs
- **Twilio Docs:** https://www.twilio.com/docs
- **Rate Limiter Flexible:** https://github.com/animir/node-rate-limiter-flexible

---

## 🚀 Próximos Pasos Recomendados

1. **Implementar Job Programado** (crítico)
2. **Configurar Webhooks** (crítico)
3. **Integrar Twilio** (para SMS/WhatsApp)
4. **Pruebas end-to-end** (validar todo)
5. **Monitoreo y logs** (Sentry, LogRocket)
6. **Optimizaciones** (caché, CDN)

---

**Última actualización:** Octubre 2025

