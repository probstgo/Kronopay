# Guía Frontend - Aplicación de Cobranza

Este documento explica qué modificar/eliminar de tu aplicación actual y cómo debería estar estructurado el frontend para funcionar correctamente con la base de datos implementada.

---

## 📋 Tabla de Contenidos

1. [¿Qué está bien y NO debes cambiar?](#1-qué-está-bien-y-no-debes-cambiar)
2. [¿Qué debes modificar/eliminar?](#2-qué-debes-modificareliminar)
3. [Estructura recomendada de la aplicación](#3-estructura-recomendada-de-la-aplicación)
4. [Componentes y librerías a usar](#4-componentes-y-librerías-a-usar)
5. [Ejemplos prácticos de implementación](#5-ejemplos-prácticos-de-implementación)

---

## 1. ¿Qué está bien y NO debes cambiar?

### ✅ Cosas que ya están correctas:

#### A) Autenticación y Contextos
- **`AuthContext.tsx`**: Funciona perfectamente. Maneja login, logout, registro y estado del usuario.
- **`Protected.tsx`**: Componente que protege rutas privadas. Está correcto.
- **`middleware.ts`**: Protege rutas en el servidor. Está bien configurado.

**No toques estos archivos.**

---

#### B) Componentes de UI (shadcn/ui)
Ya tienes instalados y funcionando:
- ✅ `button`, `input`, `label`, `card`
- ✅ `table`, `dialog`, `select`, `badge`
- ✅ `dropdown-menu`, `alert-dialog`, `checkbox`
- ✅ `form`, `textarea`, `tooltip`, `skeleton`
- ✅ `alert`, `avatar`, `separator`, `sheet`

**Son de shadcn/ui y están perfectos. Úsalos en todos tus componentes.**

---

#### C) Layout General
- **`layout.tsx`**: Root layout con AuthProvider y Toaster está bien.
- **`LayoutWrapper.tsx`**: Renderiza el Sidebar si hay usuario autenticado. Está correcto.
- **`Sidebar.tsx`**: Navegación lateral funcional. Solo necesita ajustes menores (ver sección 2).

---

#### D) Librerías de Integración
- **`supabase.ts`**: Cliente de Supabase configurado correctamente.
- **`elevenlabs.ts`**: Integración con ElevenLabs para llamadas.
- **`resend.ts`**: Integración con Resend para emails.

**Están bien. No los modifiques.**

---

## 2. ¿Qué debes modificar/eliminar?

### ✅ Archivos/Código YA IMPLEMENTADOS:

#### A) Página principal landing page
**Archivo:** `src/app/page.tsx`

**Estado:** ✅ **COMPLETADO** - Landing page profesional implementada

**Implementación actual:**
- Landing page completa con hero section
- Secciones de problema/solución
- Características del producto
- Testimonios y métricas
- CTAs para registro y demo
- Footer completo

**Explicación:** La página raíz `/` ahora es una landing page profesional que captura leads y explica el valor de Kronopay antes del registro. Los usuarios no autenticados pueden ver la landing, y al hacer clic en "Iniciar Sesión" van a `/login`.

---

#### B) Tipos y funciones desactualizadas
**Archivo:** `src/lib/database.ts`

**Problema:** Este archivo tiene una estructura vieja que NO coincide con tu nueva base de datos. Por ejemplo:
- Define `deudores` con campos que ya no existen (`monto_deuda`, `fecha_vencimiento` directamente en deudores)
- En la nueva BD, estos datos están en la tabla `deudas` (separada)

**Qué hacer:** 
1. **RENOMBRAR** el archivo actual a `database.OLD.ts` (como backup)
2. **CREAR** un nuevo `src/lib/database.ts` con los tipos correctos de la nueva BD

**Nuevos tipos necesarios:**
```typescript
// Tipos basados en la NUEVA estructura de BD

export interface Usuario {
  id: string;
  email: string;
  nombre_empresa: string;
  plan_suscripcion_id?: string;
  created_at: string;
}

export interface Deudor {
  id: string;
  usuario_id: string;
  rut: string;  // Normalizado: "19090595-0"
  nombre: string;
  created_at: string;
}

export interface Contacto {
  id: string;
  usuario_id: string;
  deudor_id: string;
  rut: string;
  tipo_contacto: 'email' | 'telefono' | 'sms' | 'whatsapp';
  valor: string;  // El email o teléfono
  preferido: boolean;
  created_at: string;
}

export interface Deuda {
  id: string;
  usuario_id: string;
  deudor_id: string;
  rut: string;
  monto: number;
  fecha_vencimiento: string;
  estado: 'nueva' | 'pendiente' | 'pagado';
  created_at: string;
}

export interface Campana {
  id: string;
  usuario_id: string;
  nombre: string;
  tipo: 'email' | 'llamada' | 'sms' | 'whatsapp' | 'mixto';
  plantilla_id?: string;
  programacion: any;  // JSONB
  deudas_asignadas: string[];  // Array de UUIDs
  activa: boolean;
  created_at: string;
}

export interface Plantilla {
  id: string;
  usuario_id: string;
  nombre: string;
  tipo: 'email' | 'voz' | 'sms' | 'whatsapp';
  contenido: string;
  created_at: string;
}

export interface Historial {
  id: string;
  usuario_id: string;
  deuda_id: string;
  rut: string;
  contacto_id?: string;
  campana_id?: string;
  tipo_accion: 'email' | 'llamada' | 'sms' | 'whatsapp';
  fecha: string;
  estado: string;
  detalles?: any;  // JSONB
  created_at: string;
}

export interface Pago {
  id: string;
  usuario_id: string;
  deuda_id: string;
  rut: string;
  monto_pagado: number;
  fecha_pago: string;
  metodo: string;
  estado: 'confirmado' | 'pendiente';
  referencia_externa?: string;
  created_at: string;
}
```

**Funciones de utilidad** (mantener del archivo viejo):
- `validarRUT()` ✅
- `formatearRUT()` ✅
- `normalizarRUT()` ✅
- `validarEmail()` ✅
- `validarTelefono()` ✅
- `formatearTelefono()` ✅
- `formatearMonto()` ✅

**Funciones a ELIMINAR** (ya no aplican):
- ❌ `createDeudor()` - Reemplazar por nueva lógica
- ❌ `getDeudores()` - Actualizar para nueva estructura
- ❌ Todas las funciones de `historial_emails` (ya no existe esa tabla)

---

#### C) Componentes de deudores desactualizados
**Directorio:** `src/app/deudores/components/`

**Problema:** Los componentes asumen una estructura vieja (deudor con monto y fecha directamente).

**Qué hacer:**
1. **Revisar y actualizar** `DeudoresTable.tsx`:
   - Debe mostrar deudores con sus deudas asociadas
   - Buscar deudas desde la tabla `deudas` con `deudor_id`
   
2. **Actualizar** `DeudorForm.tsx`:
   - Solo debe crear el deudor (nombre + RUT)
   - Los contactos y deudas se agregan después en pasos separados

**Ejemplo de consulta correcta:**
```typescript
// Obtener deudores con sus deudas
const { data } = await supabase
  .from('deudores')
  .select(`
    *,
    deudas (
      id,
      monto,
      fecha_vencimiento,
      estado
    ),
    contactos (
      id,
      tipo_contacto,
      valor,
      preferido
    )
  `)
  .order('created_at', { ascending: false })
```

---

#### D) Rutas de test en el Sidebar
**Archivo:** `src/components/Sidebar.tsx`

**Problema:** Tiene rutas de prueba como `/test-email`, `/test-llamadas` que no deberían estar en producción.

**Qué hacer:**
```typescript
// ELIMINAR estas líneas del array navigationItems:
{
  title: "Test Email",      // ❌ ELIMINAR
  href: "/test-email",
  icon: Mail,
},
{
  title: "Test Llamadas",   // ❌ ELIMINAR
  href: "/test-llamadas",
  icon: Phone,
},
```

**Mantener solo:**
- Dashboard
- Gestión de Deudores
- Campañas
- Historial
- Plantillas
- Teléfono (si es para gestionar números del módulo de llamadas)
- Pagos
- Billing

---

#### E) Metadata del layout
**Archivo:** `src/app/layout.tsx`

**Cambiar:**
```typescript
export const metadata: Metadata = {
  title: "Create Next App",  // ❌ Genérico
  description: "Generated by create next app",  // ❌ Genérico
};
```

**Por:**
```typescript
export const metadata: Metadata = {
  title: "Cobranza - Sistema de Gestión",
  description: "Plataforma de cobranza automatizada con emails, llamadas, SMS y WhatsApp",
};
```

---

### 🟡 Archivos a MODIFICAR:

#### A) Estados de deuda
**Archivo:** `src/lib/database.ts` (nuevo)

**Problema:** Los estados en el archivo viejo no coinciden con la BD nueva.

**Estados correctos según la BD:**
```typescript
export const ESTADOS_DEUDA = {
  NUEVA: 'nueva',
  PENDIENTE: 'pendiente',
  PAGADO: 'pagado',
} as const;

export const ESTADOS_DEUDA_CONFIG = {
  nueva: {
    label: 'Nueva',
    color: 'bg-blue-100 text-blue-800',
    icon: '🆕',
  },
  pendiente: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '⏳',
  },
  pagado: {
    label: 'Pagado',
    color: 'bg-green-100 text-green-800',
    icon: '✅',
  },
} as const;
```

---

## 3. Estructura recomendada de la aplicación

### 📁 Estructura de carpetas ideal:

```
src/
├── app/                          # Rutas de la app (Next.js App Router)
│   ├── layout.tsx                # Layout raíz ✅
│   ├── page.tsx                  # Redirige a /dashboard ⚠️ MODIFICAR
│   │
│   ├── (auth)/                   # Grupo de rutas de autenticación
│   │   ├── login/
│   │   │   └── page.tsx          # ✅ Ya existe
│   │   ├── register/
│   │   │   └── page.tsx          # ✅ Ya existe
│   │   ├── forgot-password/
│   │   │   └── page.tsx          # ✅ Ya existe
│   │   └── auth/
│   │       ├── callback/
│   │       │   └── page.tsx      # ✅ Ya existe
│   │       └── reset-password/
│   │           └── page.tsx      # ✅ Ya existe
│   │
│   ├── (dashboard)/              # Grupo de rutas protegidas
│   │   ├── dashboard/
│   │   │   └── page.tsx          # 📊 Dashboard principal
│   │   │
│   │   ├── deudores/             # Gestión de deudores
│   │   │   ├── page.tsx          # Lista de deudores ✅
│   │   │   ├── [id]/             # Detalle de un deudor
│   │   │   │   └── page.tsx      # Ver/editar deudor específico
│   │   │   └── components/       # Componentes específicos ✅
│   │   │       ├── DeudoresTable.tsx
│   │   │       ├── DeudorForm.tsx
│   │   │       ├── ContactosForm.tsx  # 🆕 CREAR
│   │   │       ├── DeudasForm.tsx     # 🆕 CREAR
│   │   │       └── ...
│   │   │
│   │   ├── campanas/             # Campañas de cobranza
│   │   │   ├── page.tsx          # Lista de campañas
│   │   │   ├── nueva/
│   │   │   │   └── page.tsx      # Crear campaña nueva
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # Editar campaña
│   │   │   └── components/
│   │   │       ├── CampanaForm.tsx
│   │   │       ├── JourneyBuilder.tsx  # Constructor de steps
│   │   │       └── ...
│   │   │
│   │   ├── historial/            # Historial de acciones
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── HistorialTable.tsx
│   │   │       ├── DetalleAccion.tsx
│   │   │       └── ...
│   │   │
│   │   ├── plantillas/           # Plantillas de mensajes
│   │   │   ├── page.tsx
│   │   │   ├── nueva/
│   │   │   │   └── page.tsx
│   │   │   └── components/
│   │   │       ├── PlantillaForm.tsx
│   │   │       ├── EditorContenido.tsx
│   │   │       └── ...
│   │   │
│   │   ├── telefono/             # Módulo de llamadas (ElevenLabs)
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── AgentesLista.tsx
│   │   │       ├── NumerosPool.tsx
│   │   │       ├── ConfiguracionAgente.tsx
│   │   │       └── ...
│   │   │
│   │   ├── pagos/                # Gestión de pagos de deudas
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── PagosTable.tsx
│   │   │       ├── RegistrarPago.tsx
│   │   │       └── ...
│   │   │
│   │   ├── billing/              # Pagos de suscripción
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── PlanesSuscripcion.tsx
│   │   │       ├── HistorialPagos.tsx
│   │   │       └── ...
│   │   │
│   │   └── profile/              # Perfil del usuario
│   │       ├── page.tsx
│   │       └── components/
│   │           └── ...
│   │
│   ├── test-email/               # Testing de emails
│   │   ├── page.tsx              # ✅ Ya existe
│   │   └── components/           # ✅ Ya existe
│   │       ├── FormularioEmail.tsx
│   │       └── SelectorDeudor.tsx
│   │
│   ├── test-llamadas/            # Testing de llamadas
│   │   └── page.tsx              # ✅ Ya existe
│   │
│   ├── test-supabase/            # Testing de base de datos
│   │   └── page.tsx              # ✅ Ya existe
│   │
│   ├── api/                      # API Routes (backend)
│   │   ├── auth/
│   │   │   ├── session/
│   │   │   │   └── route.ts      # ✅ Ya existe
│   │   │   └── signout/
│   │   │       └── route.ts      # ✅ Ya existe
│   │   ├── deudores/
│   │   │   └── route.ts          # 🆕 CREAR
│   │   ├── send-email/
│   │   │   └── route.ts          # ✅ Ya existe
│   │   ├── elevenlabs/
│   │   │   └── ...               # ✅ Ya existe
│   │   ├── test-deudores/        # ✅ Ya existe
│   │   │
│   │   ├── cron/                 # ✅ Ya existe - Jobs programados
│   │   │   └── ejecutor-programado/
│   │   │       └── route.ts      # ✅ Ya existe
│   │   │
│   │   └── webhooks/             # ✅ Ya existe - Webhooks externos
│   │       ├── resend/
│   │       │   └── route.ts      # ✅ Ya existe
│   │       ├── elevenlabs/
│   │       │   └── route.ts      # ✅ Ya existe
│   │       └── twilio/
│   │           └── route.ts     # 🆕 CREAR
│   │
│   └── globals.css               # Estilos globales ✅
│
├── components/                   # Componentes compartidos
│   ├── LayoutWrapper.tsx         # ✅ Ya existe
│   ├── Sidebar.tsx               # ✅ Ya existe (ajustar)
│   ├── Protected.tsx             # ✅ Ya existe
│   │
│   └── ui/                       # Componentes de shadcn/ui ✅
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── ...
│
├── contexts/                     # Contextos de React
│   └── AuthContext.tsx           # ✅ Ya existe
│
├── lib/                          # Utilidades y configuración
│   ├── supabase.ts               # ✅ Ya existe
│   ├── database.ts               # ✅ Ya existe (tipos completos)
│   ├── formateo.ts               # ✅ Ya existe (formateo CLP)
│   ├── guardrails.ts             # ✅ Ya existe (validaciones)
│   ├── reintentos.ts             # ✅ Ya existe (lógica de reintentos)
│   ├── rate-limiter.ts           # ✅ Ya existe (rate limiting)
│   ├── elevenlabs.ts             # ✅ Ya existe
│   ├── resend.ts                 # ✅ Ya existe
│   ├── csvUtils.ts               # ✅ Ya existe
│   └── utils.ts                  # ✅ Ya existe (cn, etc.)
│
├── hooks/                        # Custom hooks
│   ├── use-mobile.ts             # ✅ Ya existe
│   ├── useDeudores.ts            # 🆕 CREAR
│   ├── useCampanas.ts            # 🆕 CREAR
│   └── useHistorial.ts           # 🆕 CREAR
│
├── types/                        # Tipos TypeScript
│   └── programa.ts              # ✅ Ya existe
│
└── middleware.ts                 # ✅ Ya existe
```

---

### 📝 Notas sobre la estructura:

#### 1. **Grupos de rutas `(auth)` y `(dashboard)`**
- Los paréntesis `()` crean grupos de rutas sin afectar la URL
- **`(auth)`**: Agrupa login, register, etc.
- **`(dashboard)`**: Agrupa todas las rutas protegidas
- Permite aplicar layouts o lógica específica por grupo

#### 2. **Rutas dinámicas `[id]`**
- Para ver/editar un elemento específico
- Ejemplo: `/deudores/[id]` → `/deudores/abc-123-def`

#### 3. **Componentes por página**
- Cada sección tiene su carpeta `components/` con componentes específicos
- Los componentes compartidos van en `/src/components/`

#### 4. **API Routes separadas por funcionalidad**
- `/api/cron/`: Jobs programados (Vercel Cron)
- `/api/webhooks/`: Endpoints para proveedores externos
- `/api/[recurso]/`: CRUD de recursos

---

## 4. Componentes y librerías a usar

### ✅ Librerías YA instaladas (úsalas):

#### A) **shadcn/ui** - Componentes de UI
- **Qué es:** Componentes de React hermosos y accesibles basados en Radix UI
- **Cómo usar:**
  ```tsx
  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import { Card, CardContent, CardHeader } from "@/components/ui/card"
  
  <Button variant="default">Click me</Button>
  <Input type="email" placeholder="tu@email.com" />
  ```

- **Componentes disponibles:**
  - `Button` - Botones con variantes (default, outline, ghost, etc.)
  - `Input` - Campos de texto
  - `Card` - Tarjetas para agrupar contenido
  - `Table` - Tablas con estilos
  - `Dialog` - Modales/diálogos
  - `Select` - Selectores/dropdowns
  - `Badge` - Etiquetas/badges
  - `Alert` - Alertas/notificaciones
  - `Form` - Formularios con react-hook-form
  - `Checkbox`, `Textarea`, `Tooltip`, etc.

- **Agregar más componentes:**
  ```bash
  npx shadcn@latest add [componente]
  # Ejemplo:
  npx shadcn@latest add tabs
  npx shadcn@latest add calendar
  ```

---

#### B) **Lucide React** - Iconos
- **Qué es:** Biblioteca de iconos moderna y liviana
- **Cómo usar:**
  ```tsx
  import { Users, Mail, Phone, Plus, Trash2 } from "lucide-react"
  
  <Users className="h-4 w-4" />
  <Mail className="h-5 w-5 text-blue-500" />
  ```

- **Iconos útiles para la app:**
  - `Users` - Deudores
  - `Megaphone` - Campañas
  - `History` - Historial
  - `FileText` - Plantillas
  - `Phone` - Llamadas
  - `Mail` - Emails
  - `MessageSquare` - WhatsApp
  - `DollarSign` - Pagos
  - `CreditCard` - Billing
  - `Plus`, `Edit`, `Trash2`, `Download`, `Upload` - Acciones

---

#### C) **React Hook Form + Zod** - Formularios
- **Qué es:** Librería para manejar formularios con validación
- **Cómo usar:**
  ```tsx
  import { useForm } from "react-hook-form"
  import { zodResolver } from "@hookform/resolvers/zod"
  import * as z from "zod"
  
  const schema = z.object({
    nombre: z.string().min(1, "Nombre requerido"),
    email: z.string().email("Email inválido"),
    monto: z.number().positive("Monto debe ser positivo"),
  })
  
  const form = useForm({
    resolver: zodResolver(schema),
  })
  
  const onSubmit = (data) => {
    console.log(data) // Datos validados
  }
  ```

---

#### D) **Sonner** - Notificaciones/Toasts
- **Qué es:** Sistema de notificaciones elegante
- **Cómo usar:**
  ```tsx
  import { toast } from "sonner"
  
  toast.success("Deudor creado exitosamente")
  toast.error("Error al crear deudor")
  toast.info("Procesando...")
  toast.loading("Guardando...")
  ```

- **Ya está configurado en el layout** (Toaster component)

---

#### E) **Tailwind CSS** - Estilos
- **Qué es:** Framework de CSS utility-first
- **Cómo usar:**
  ```tsx
  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
    <h1 className="text-2xl font-bold">Título</h1>
    <Button className="bg-blue-500 hover:bg-blue-600">Acción</Button>
  </div>
  ```

- **Clases útiles:**
  - Layout: `flex`, `grid`, `container`, `mx-auto`
  - Spacing: `p-4`, `px-6`, `py-2`, `m-4`, `gap-4`
  - Colors: `bg-blue-500`, `text-gray-700`, `border-red-300`
  - Typography: `text-xl`, `font-bold`, `tracking-tight`
  - Effects: `shadow`, `rounded-lg`, `hover:bg-gray-100`

---

### 🆕 Librerías a AGREGAR (según documento backend):

#### A) **rate-limiter-flexible** - Rate limiting
```bash
npm install rate-limiter-flexible
```

#### B) **ioredis** - Redis para rate limiting (opcional, para producción)
```bash
npm install ioredis
```

#### C) **twilio** - SMS y WhatsApp
```bash
npm install twilio
```

---

## 5. Ejemplos prácticos de implementación

### Ejemplo 1: Página de Dashboard (actualizar)

**Archivo:** `src/app/dashboard/page.tsx`

**Reemplazar contenido por:**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Protected from '@/components/Protected'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatearMontoCLP } from '@/lib/formateo'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    total_deudores: 0,
    total_deudas: 0,
    monto_total: 0,
    deudas_vencidas: 0,
  })

  useEffect(() => {
    if (!user) return
    cargarEstadisticas()
  }, [user])

  const cargarEstadisticas = async () => {
    // Contar deudores
    const { count: totalDeudores } = await supabase
      .from('deudores')
      .select('*', { count: 'exact', head: true })

    // Contar deudas
    const { count: totalDeudas } = await supabase
      .from('deudas')
      .select('*', { count: 'exact', head: true })

    // Calcular monto total
    const { data: deudas } = await supabase
      .from('deudas')
      .select('monto')
      .eq('estado', 'pendiente')

    const montoTotal = deudas?.reduce((sum, d) => sum + d.monto, 0) || 0

    // Deudas vencidas
    const { count: vencidas } = await supabase
      .from('deudas')
      .select('*', { count: 'exact', head: true })
      .lt('fecha_vencimiento', new Date().toISOString().split('T')[0])
      .eq('estado', 'pendiente')

    setStats({
      total_deudores: totalDeudores || 0,
      total_deudas: totalDeudas || 0,
      monto_total: montoTotal,
      deudas_vencidas: vencidas || 0,
    })
  }

  return (
    <Protected>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Deudores
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_deudores}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Deudas Activas
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_deudas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Monto Total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatearMontoCLP(stats.monto_total)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Deudas Vencidas
              </CardTitle>
              <Clock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.deudas_vencidas}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Aquí puedes agregar más secciones: gráficos, últimas acciones, etc. */}
      </div>
    </Protected>
  )
}
```

**Explicación:**
- Usa `Protected` para proteger la ruta
- Muestra 4 tarjetas con estadísticas clave
- Usa `formatearMontoCLP` para mostrar montos en formato chileno
- Consulta la BD con la estructura NUEVA (deudores + deudas separados)

---

### Ejemplo 2: Formulario de Deudor (actualizar)

**Archivo:** `src/app/deudores/components/DeudorForm.tsx`

**Concepto clave:** Ahora el deudor solo tiene nombre + RUT. Las deudas y contactos se agregan después.

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { validarRUT, normalizarRUT } from '@/lib/database'

// Esquema de validación
const schema = z.object({
  nombre: z.string().min(1, "Nombre es requerido"),
  rut: z.string().refine(validarRUT, "RUT inválido"),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  deudorEditando?: any
}

export function DeudorForm({ open, onClose, onSuccess, deudorEditando }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: deudorEditando?.nombre || '',
      rut: deudorEditando?.rut || '',
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        nombre: data.nombre.trim(),
        rut: normalizarRUT(data.rut), // Se normaliza automáticamente
      }

      if (deudorEditando) {
        // Editar
        const { error } = await supabase
          .from('deudores')
          .update(payload)
          .eq('id', deudorEditando.id)

        if (error) throw error
        toast.success('Deudor actualizado exitosamente')
      } else {
        // Crear
        const { error } = await supabase
          .from('deudores')
          .insert([payload])

        if (error) throw error
        toast.success('Deudor creado exitosamente')
      }

      onSuccess()
      onClose()
      form.reset()
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar deudor')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {deudorEditando ? 'Editar Deudor' : 'Nuevo Deudor'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre Completo</Label>
            <Input
              id="nombre"
              {...form.register('nombre')}
              placeholder="Juan Pérez"
            />
            {form.formState.errors.nombre && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.nombre.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="rut">RUT</Label>
            <Input
              id="rut"
              {...form.register('rut')}
              placeholder="19.090.595-0"
            />
            {form.formState.errors.rut && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.rut.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Explicación:**
- Usa `react-hook-form` + `zod` para validación
- Solo pide nombre + RUT (estructura nueva)
- Valida el RUT antes de guardar
- Normaliza el RUT automáticamente
- Muestra notificaciones con `sonner`

---

### Ejemplo 3: Listar deudores con sus deudas

**Archivo:** `src/app/deudores/page.tsx` (simplificado)

```tsx
'use client'

import { useEffect, useState } from 'react'
import Protected from '@/components/Protected'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'
import { DeudorForm } from './components/DeudorForm'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatearRUT, formatearMontoCLP } from '@/lib/database'

export default function DeudoresPage() {
  const [deudores, setDeudores] = useState<any[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    cargarDeudores()
  }, [])

  const cargarDeudores = async () => {
    // Obtener deudores con sus deudas asociadas
    const { data, error } = await supabase
      .from('deudores')
      .select(`
        *,
        deudas (
          id,
          monto,
          estado,
          fecha_vencimiento
        )
      `)
      .order('created_at', { ascending: false })

    if (!error) {
      setDeudores(data || [])
    }
  }

  // Calcular monto total de deudas pendientes por deudor
  const calcularMontoTotal = (deudas: any[]) => {
    return deudas
      ?.filter(d => d.estado !== 'pagado')
      .reduce((sum, d) => sum + d.monto, 0) || 0
  }

  return (
    <Protected>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gestión de Deudores</h1>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Deudor
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>RUT</TableHead>
              <TableHead>Deudas</TableHead>
              <TableHead>Monto Total</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deudores.map(deudor => (
              <TableRow key={deudor.id}>
                <TableCell>{deudor.nombre}</TableCell>
                <TableCell>{formatearRUT(deudor.rut)}</TableCell>
                <TableCell>{deudor.deudas?.length || 0}</TableCell>
                <TableCell>
                  {formatearMontoCLP(calcularMontoTotal(deudor.deudas))}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">Ver</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <DeudorForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={cargarDeudores}
        />
      </div>
    </Protected>
  )
}
```

**Explicación:**
- Consulta deudores con sus deudas (relación 1:N)
- Calcula el monto total de deudas pendientes
- Usa componentes de shadcn/ui (Table, Button)
- Usa funciones de formateo personalizadas

---

### Ejemplo 4: Crear contacto para un deudor

**Archivo:** `src/app/deudores/components/ContactoForm.tsx` (CREAR)

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { validarEmail, validarTelefono } from '@/lib/database'

const schema = z.object({
  tipo_contacto: z.enum(['email', 'telefono', 'sms', 'whatsapp']),
  valor: z.string().min(1, "Valor es requerido"),
  preferido: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  deudor: any
  onSuccess: () => void
}

export function ContactoForm({ open, onClose, deudor, onSuccess }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const tipoContacto = form.watch('tipo_contacto')

  const onSubmit = async (data: FormData) => {
    try {
      // Validar según tipo
      if (data.tipo_contacto === 'email' && !validarEmail(data.valor)) {
        toast.error('Email inválido')
        return
      }
      if (['telefono', 'sms', 'whatsapp'].includes(data.tipo_contacto) && !validarTelefono(data.valor)) {
        toast.error('Teléfono inválido')
        return
      }

      const payload = {
        deudor_id: deudor.id,
        rut: deudor.rut, // Se copia del deudor
        tipo_contacto: data.tipo_contacto,
        valor: data.valor,
        preferido: data.preferido,
      }

      const { error } = await supabase
        .from('contactos')
        .insert([payload])

      if (error) throw error

      toast.success('Contacto agregado exitosamente')
      onSuccess()
      onClose()
      form.reset()
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar contacto')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Contacto - {deudor?.nombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Tipo de Contacto</Label>
            <Select onValueChange={(value) => form.setValue('tipo_contacto', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="telefono">Teléfono</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="valor">
              {tipoContacto === 'email' ? 'Email' : 'Teléfono'}
            </Label>
            <Input
              id="valor"
              {...form.register('valor')}
              placeholder={tipoContacto === 'email' ? 'ejemplo@email.com' : '+56912345678'}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...form.register('preferido')}
              className="h-4 w-4"
            />
            <Label>Marcar como preferido</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Explicación:**
- Formulario para agregar contactos (email, teléfono, SMS, WhatsApp)
- Valida según el tipo de contacto
- El RUT se copia automáticamente del deudor (no lo pide al usuario)
- Permite marcar un contacto como preferido

---

## 🎯 Resumen de Acciones

### ✅ Lo que debes hacer AHORA:

1. **Modificar `src/app/page.tsx`**
   - Hacer que redirija a `/dashboard`

2. **Reemplazar `src/lib/database.ts`**
   - Crear tipos nuevos según la BD implementada
   - Mantener funciones de utilidad (formateo, validación)

3. **Actualizar `src/components/Sidebar.tsx`**
   - Eliminar rutas de test
   - Dejar solo las rutas de producción

4. **Actualizar `src/app/layout.tsx`**
   - Cambiar metadata (title, description)

5. **Crear archivos nuevos:**
   - `src/lib/formateo.ts` - Formateo CLP
   - `src/lib/ofuscacion.ts` - Ofuscar teléfonos
   - `src/lib/guardrails.ts` - Validaciones (del documento backend)
   - `src/lib/reintentos.ts` - Lógica de reintentos (del documento backend)
   - `src/lib/rate-limiter.ts` - Rate limiting (del documento backend)

6. **Actualizar componentes de deudores:**
   - Adaptar a la nueva estructura (deudor + deudas + contactos separados)

7. **Implementar páginas faltantes:**
   - Dashboard con estadísticas
   - Campañas
   - Historial
   - Plantillas
   - Teléfono (agentes)
   - Pagos
   - Billing

8. **Implementar backend (del documento `ultimo_paso_database_imp.md`):**
   - Job programado (`/api/cron/ejecutor-programado`)
   - Webhooks (`/api/webhooks/...`)
   - Funciones de negocio (guardrails, reintentos, etc.)

---

## 📚 Recursos Útiles

- **shadcn/ui**: https://ui.shadcn.com/
- **Lucide Icons**: https://lucide.dev/
- **React Hook Form**: https://react-hook-form.com/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Supabase Docs**: https://supabase.com/docs

---

**Última actualización:** Octubre 2025

---

## 📝 Registro de Cambios Implementados

### ✅ **2.B) Tipos y funciones desactualizadas** - COMPLETADO
**Fecha:** 2025-10-24 15:30:00

**Archivo:** `src/lib/database.ts`

**Cambios realizados:**
- ✅ **Eliminado** archivo anterior y creado nuevo con estructura actualizada
- ✅ **Agregados** nuevos tipos TypeScript:
  - `Usuario` - Estructura de usuarios
  - `Deudor` - Estructura básica de deudores (solo id, usuario_id, rut, nombre, created_at)
  - `Contacto` - Tabla de contactos (email, teléfono, SMS, WhatsApp)
  - `Deuda` - Tabla de deudas separada
  - `Campana` - Campañas de cobranza
  - `Plantilla` - Plantillas de mensajes
  - `Historial` - Historial de acciones
  - `Pago` - Registro de pagos
- ✅ **Mantenidas** funciones de utilidad:
  - `validarRUT()`, `formatearRUT()`, `normalizarRUT()`
  - `validarEmail()`, `validarTelefono()`, `formatearTelefono()`
  - `formatearMonto()`, `calcularDiasVencidos()`, `determinarEstadoAutomatico()`
- ✅ **Eliminadas** funciones obsoletas:
  - `createDeudor()`, `getDeudores()`, `deleteDeudor()`
  - Todas las funciones de `historial_emails`
  - `ESTADOS_DEUDA`, `ESTADOS_DEUDA_CONFIG`
- ✅ **Corregidos** tipos `any` por `Record<string, unknown>` para campos JSONB

---

### ✅ **2.C) Componentes de deudores desactualizados** - COMPLETADO
**Fecha:** 2025-10-24 15:45:00 - 16:30:00

#### **DeudoresTable.tsx** - ACTUALIZADO
**Cambios realizados:**
- ✅ **Creada** interfaz `DeudorConDatos` que combina datos de deudor + deudas + contactos
- ✅ **Actualizada** función `cargarDeudores()` para consultar datos desde múltiples tablas
- ✅ **Implementada** lógica para calcular campos derivados:
  - `email` y `telefono` (desde contactos preferidos)
  - `monto_total` (suma de deudas)
  - `fecha_vencimiento_mas_reciente`
  - `estado_general` (calculado automáticamente)
- ✅ **Reemplazadas** llamadas a funciones obsoletas por consultas directas a Supabase
- ✅ **Actualizada** lógica de eliminación para borrar deudas y contactos asociados
- ✅ **Corregidos** filtros para usar nueva estructura de estados

#### **DeudorForm.tsx** - ACTUALIZADO
**Cambios realizados:**
- ✅ **Simplificado** formulario para crear solo deudores básicos (nombre + RUT)
- ✅ **Eliminadas** referencias a campos obsoletos (`monto_deuda`, `fecha_vencimiento`)
- ✅ **Actualizada** validación para usar solo campos básicos
- ✅ **Implementada** lógica de creación/edición con Supabase directo

#### **EstadoBadge.tsx** - ACTUALIZADO
**Cambios realizados:**
- ✅ **Reemplazada** configuración de estados obsoleta
- ✅ **Implementada** nueva configuración de estados:
  - `sin_deudas`, `pendiente`, `vencida`, `pagada`
- ✅ **Actualizada** lógica de colores y etiquetas

#### **ImportCSVModal.tsx** - ACTUALIZADO
**Cambios realizados:**
- ✅ **Actualizada** estructura de datos para nueva BD
- ✅ **Corregidas** referencias a campos obsoletos
- ✅ **Implementada** lógica para crear deudores + contactos + deudas por separado

#### **SelectorDeudor.tsx** - ACTUALIZADO
**Cambios realizados:**
- ✅ **Creada** interfaz `DeudorConDatos` para datos combinados
- ✅ **Implementada** consulta con JOIN para obtener deudores + deudas + contactos
- ✅ **Actualizada** lógica de transformación de datos
- ✅ **Corregidos** tipos TypeScript para evitar errores de compilación

#### **FormularioEmail.tsx** - ACTUALIZADO
**Cambios realizados:**
- ✅ **Creada** interfaz `DeudorConDatos` para datos combinados
- ✅ **Actualizada** lógica para trabajar con nueva estructura
- ✅ **Corregidas** referencias a campos obsoletos

#### **FiltrosDeudores.tsx** - ACTUALIZADO
**Cambios realizados:**
- ✅ **Reemplazada** configuración de estados obsoleta
- ✅ **Implementada** nueva configuración de estados
- ✅ **Actualizada** lógica de filtrado

#### **SelectorEstado.tsx** - ACTUALIZADO
**Cambios realizados:**
- ✅ **Reemplazada** configuración de estados obsoleta
- ✅ **Implementada** nueva configuración de estados
- ✅ **Actualizada** lógica de cambio de estado

#### **AccionesRapidas.tsx** - ACTUALIZADO
**Cambios realizados:**
- ✅ **Creada** interfaz `DeudorConContactos` para datos combinados
- ✅ **Actualizada** lógica para trabajar con nueva estructura
- ✅ **Corregidas** referencias a campos obsoletos

---

### ✅ **Build y Compilación** - COMPLETADO
**Fecha:** 2025-10-24 16:30:00

**Resultado:**
- ✅ **Build exitoso** sin errores de compilación
- ✅ **Solo warnings** de ESLint (variables no utilizadas) que no afectan funcionalidad
- ✅ **Todos los componentes** actualizados y funcionando
- ✅ **Tipos TypeScript** corregidos y validados

**Archivos corregidos durante el proceso:**
- `src/lib/database.ts` - Tipos actualizados
- `src/app/deudores/components/DeudoresTable.tsx` - Lógica de datos actualizada
- `src/app/deudores/components/DeudorForm.tsx` - Formulario simplificado
- `src/app/deudores/components/EstadoBadge.tsx` - Estados actualizados
- `src/app/deudores/components/ImportCSVModal.tsx` - Estructura actualizada
- `src/app/deudores/components/SelectorEstado.tsx` - Estados actualizados
- `src/app/deudores/components/FiltrosDeudores.tsx` - Filtros actualizados
- `src/app/deudores/components/AccionesRapidas.tsx` - Lógica actualizada
- `src/app/test-email/components/FormularioEmail.tsx` - Estructura actualizada
- `src/app/test-email/components/SelectorDeudor.tsx` - Lógica de datos actualizada

---

### 📋 **Próximos Pasos Recomendados**

Según el documento `parte3_front_app.md`, los siguientes pasos serían:

1. **2.D) Páginas principales desactualizadas**
   - Actualizar páginas principales para usar nueva estructura
   - Implementar lógica de carga de datos desde nuevas tablas
   - Actualizar navegación y flujos de usuario

2. **Implementar páginas faltantes:**
   - Dashboard con estadísticas
   - Campañas
   - Historial
   - Plantillas
   - Teléfono (agentes)
   - Pagos
   - Billing

3. **Implementar backend:**
   - Job programado (`/api/cron/ejecutor-programado`)
   - Webhooks (`/api/webhooks/...`)
   - Funciones de negocio (guardrails, reintentos, etc.)

---

**Registro completado:** 2025-10-24 16:35:00

---

## Registro de Cambios - Metadata del Layout

**Fecha:** 2025-10-24
**Tarea:** Actualización del metadata del layout principal

**Estado:** ✅ **YA COMPLETADO**

**Verificación realizada:**
- El archivo `src/app/layout.tsx` ya contiene metadata personalizado para Kronopay
- Título: "Kronopay - La Infraestructura de Cobranza para Internet"
- Descripción: "Sistema inteligente de cobranza con llamadas automáticas, emails personalizados y seguimiento avanzado. Reduce el tiempo de cobranza en un 70%."
- Incluye keywords, autores y configuración OpenGraph
- El metadata está optimizado para SEO y branding

**Conclusión:** La tarea de actualización del metadata ya estaba implementada correctamente en el proyecto.

---

## 📋 RESUMEN DE IMPLEMENTACIONES REALIZADAS

### ✅ Estados de Deuda - COMPLETADO
**Archivo modificado:** `src/lib/database.ts`

**Cambios realizados:**
- ✅ Agregadas constantes `ESTADOS_DEUDA` con valores: 'nueva', 'pendiente', 'pagado'
- ✅ Agregada configuración `ESTADOS_DEUDA_CONFIG` con:
  - **Nueva**: Azul (bg-blue-100 text-blue-800) + icono 🆕
  - **Pendiente**: Amarillo (bg-yellow-100 text-yellow-800) + icono ⏳
  - **Pagado**: Verde (bg-green-100 text-green-800) + icono ✅

**Beneficios:**
- Centraliza la configuración de estados de deuda
- Evita hardcodear strings en componentes UI
- Proporciona configuración visual consistente
- Mejora la mantenibilidad del código

**Estado:** ✅ COMPLETADO - Los estados de deuda están ahora correctamente definidos y listos para usar en los componentes de la interfaz.

