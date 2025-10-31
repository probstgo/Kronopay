# Plan de Implementación - Sección de Suscripciones

**Estado:** En Progreso  
**Prioridad:** Media  
**Modelo de Negocio:** Pago por uso (SaaS de cobranza omnicanal)

---

## 📋 Resumen Ejecutivo

### ✅ **Estado Actual**
- Página `/billing` implementada con UI de Suscripciones
- Ruta protegida en middleware ✅
- Sidebar muestra "Suscripciones" ✅
- **Backend/API**: 5 endpoints de Suscripciones implementados ✅
- **Base de datos**: `suscripciones`, `pagos_usuarios`, `usos` existentes ✅; `facturas` creada ✅; campos extra en `usuarios` agregados ✅; RLS e índices configurados ✅

### 🎯 **Objetivos del Plan**
1. Renombrar sección "Billing" → "Suscripciones"
2. Implementar visualización del plan actual
3. Mostrar métricas de uso del mes actual
4. Implementar historial de facturación
5. Opción para cambiar de plan

---

## 📁 Estructura de Archivos

```
src/app/billing/
├── page.tsx                    # Página principal de suscripciones
└── components/
    ├── PlanActual.tsx          # Card con plan actual y estado
    ├── UsoActual.tsx           # Métricas de uso del mes (emails, llamadas, SMS)
    ├── Facturacion.tsx         # Próximo cargo y historial de facturas
    └── LimitesPlan.tsx         # Límites y alertas del plan
```

---

## 🔧 Cambios Necesarios

### 1. **Renombrar Sección**
- `src/components/Sidebar.tsx` línea 59: "Billing" → "Suscripciones"
- `src/app/billing/page.tsx` línea 7: Título "Billing" → "Suscripciones"

### 2. **Implementar Componentes Principales**

#### **PlanActual.tsx**
- Implementado. Muestra plan y estado. Maneja usuario sin plan (estado "Sin Plan").

#### **UsoActual.tsx**
- Implementado. Métricas del mes con barras de progreso. Maneja base vacía y sin límites.

#### **Facturacion.tsx**
- Implementado. Próximo cargo e historial. Maneja base vacía y sin plan.

#### **LimitesPlan.tsx**
- Pendiente. UI de límites y alertas visuales.

---

## 💾 Estructura de Datos (Supabase)

### ✅ **Tablas Ya Existentes** (según `parte1_DATABASE_IMPLEMENTACION.md`)

#### 1. **Tabla `suscripciones`** ✅ EXISTE
```sql
suscripciones (
  id, nombre, descripcion, precio_mensual, 
  limite_emails, limite_llamadas, limite_sms, 
  limite_whatsapp, limite_memoria_mb, activo, created_at
)
```
- **Uso**: Define los planes disponibles (Básico, Pro, Enterprise)
- **RLS**: Lectura global, edición solo admin

#### 2. **Tabla `usuarios`** ✅ EXISTE (con campo de plan)
```sql
usuarios (
  id, email, nombre_empresa, 
  plan_suscripcion_id → REFERENCES suscripciones(id), 
  created_at
)
```
- **Uso**: Cada usuario tiene un `plan_suscripcion_id` que referencia su plan actual

#### 3. **Tabla `pagos_usuarios`** ✅ EXISTE
```sql
pagos_usuarios (
  id, usuario_id, suscripcion_id, monto_pagado, 
  fecha_pago, metodo, estado, referencia_externa, created_at
)
```
- **Uso**: Historial de pagos de suscripción
- **Estado**: 'confirmado' | 'pendiente'

#### 4. **Tabla `usos`** ✅ EXISTE
```sql
usos (
  id, usuario_id, deudor_id, rut,
  emails_enviados, llamadas_ejecutadas, sms_enviados, 
  whatsapp_enviados, duracion_llamadas, memoria_db_usada,
  costo_emails, costo_llamadas, costo_sms, costo_whatsapp, 
  costo_db, costo_total, periodo, updated_at
)
```
- **Uso**: Métricas de consumo y costos
- **Campo `periodo`**: Permite agrupar por mes/año

### ✅ **Actualización de Tablas**

#### 1. **Tabla `facturas`** ✅ CREADA
```sql
-- NECESARIA para historial de facturas y PDFs
CREATE TABLE facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id) NOT NULL,
  suscripcion_id uuid REFERENCES suscripciones(id),
  monto numeric NOT NULL,
  fecha timestamptz NOT NULL,
  periodo text NOT NULL, -- "2025-01" formato
  descripcion text,
  estado text NOT NULL CHECK (estado IN ('generada', 'pagada', 'vencida')),
  pdf_url text,
  detalles jsonb, -- Items desglosados
  created_at timestamptz DEFAULT now()
);
```

#### 2. **Campos Adicionales en `usuarios`** ✅ AGREGADOS
```sql
-- Agregar si no existen:
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS fecha_inicio_suscripcion timestamptz,
ADD COLUMN IF NOT EXISTS fecha_renovacion timestamptz,
ADD COLUMN IF NOT EXISTS estado_suscripcion text DEFAULT 'activo' 
  CHECK (estado_suscripcion IN ('activo', 'vencido', 'cancelado', 'suspendido'));
```

---

## 🚀 Funcionalidades Principales

### 1. **Vista General**
- ✅ Plan actual destacado
- ✅ Uso del mes con barras de progreso
- ✅ Próximo cargo estimado
- ✅ Estado de la suscripción

### 2. **Gestión de Plan**
- Cambiar de plan (upgrade/downgrade)
- Ver planes disponibles con comparación
- Cancelar suscripción (si aplica)

### 3. **Facturación**
- Historial de facturas (descargar PDFs)

### 4. **Alertas y Límites**
- Alertas cuando uso > 80% del límite
- Notificaciones antes de límites
- Sugerencias para upgrade de plan

---

## 📊 Métricas a Mostrar

### Por Tipo de Acción
- **Emails**: Cantidad enviada / límite mensual
- **Llamadas**: Minutos usados / límite mensual
- **SMS**: Cantidad enviada / límite mensual
- **Contactos**: Cantidad gestionada / límite
- **Campañas**: Cantidad activas / límite

### Costo Estimado
```
Costo mensual = 
  (emails_enviados × precio_email) +
  (llamadas_minutos × precio_minuto) +
  (sms_enviados × precio_sms) +
  precio_base_plan
```

---

## 🔐 Consideraciones de Seguridad

- ✅ Ruta `/billing` ya protegida en middleware
- Verificar que solo el usuario pueda ver su propia suscripción
- Validar permisos antes de cambiar plan

---

## 📝 Notas de Implementación

### Prioridad de Desarrollo
1. **Fase 1**: Renombrar + Plan actual básico — Completada ✅
2. **Fase 2**: Métricas de uso actual — Completada ✅
3. **Fase 3**: Historial de facturación — Completada ✅
4. **Fase 4**: Cambio de plan — Pendiente ⚠️ (UI para seleccionar plan y llamar POST)

### Integración con Backend
- Endpoints API implementados:
  - `GET /api/suscripciones/actual` — OK
  - `GET /api/suscripciones/uso` — OK
  - `GET /api/suscripciones/facturas` — OK
  - `POST /api/suscripciones/cambiar-plan` — OK
  - `GET /api/suscripciones/planes` — OK

#### Contratos de API (Request/Response)

1) GET `/api/suscripciones/actual`
```
Response 200
{
  "plan": {
    "id": "uuid",
    "nombre": "string",
    "precio_mensual": number,
    "limite_emails": number,
    "limite_llamadas": number,
    "limite_sms": number,
    "limite_whatsapp": number,
    "limite_memoria_mb": number
  },
  "estado_suscripcion": "activo|vencido|cancelado|suspendido",
  "fecha_inicio_suscripcion": "ISO-8601|null",
  "fecha_renovacion": "ISO-8601|null"
}
```

2) GET `/api/suscripciones/uso`
```
Query: none (usa usuario autenticado y periodo actual)
Response 200
{
  "periodo": "YYYY-MM",
  "emails_enviados": number,
  "llamadas_ejecutadas": number,
  "sms_enviados": number,
  "whatsapp_enviados": number,
  "duracion_llamadas": number,
  "memoria_db_usada": number,
  "costo_total": number
}
```

3) GET `/api/suscripciones/facturas`
```
Response 200
[
  {
    "id": "uuid",
    "periodo": "YYYY-MM",
    "fecha": "ISO-8601",
    "monto": number,
    "estado": "generada|pagada|vencida",
    "pdf_url": "string|null"
  }
]
```

4) POST `/api/suscripciones/cambiar-plan`
```
Request JSON
{ "suscripcion_id": "uuid" }

Response 200
{
  "ok": true,
  "plan_suscripcion_id": "uuid",
  "fecha_renovacion": "ISO-8601|null"
}
```

5) GET `/api/suscripciones/planes`
```
Response 200
[
  {
    "id": "uuid",
    "nombre": "string",
    "descripcion": "string|null",
    "precio_mensual": number,
    "limite_emails": number,
    "limite_llamadas": number,
    "limite_sms": number,
    "limite_whatsapp": number,
    "limite_memoria_mb": number
  }
]
```

---

## ✅ Checklist de Implementación

### Frontend
- [x] Renombrar "Billing" → "Suscripciones" en Sidebar
- [x] Actualizar título en página principal
- [x] Crear componente PlanActual
- [x] Crear componente UsoActual
- [x] Crear componente Facturacion
- [ ] Crear componente LimitesPlan

### Backend / API
- [x] Implementar endpoints API necesarios
  - [x] `GET /api/suscripciones/actual`
  - [x] `GET /api/suscripciones/uso`
  - [x] `GET /api/suscripciones/facturas`
  - [x] `GET /api/suscripciones/planes`
  - [x] `POST /api/suscripciones/cambiar-plan`

### Base de Datos
- [x] ✅ Tabla `suscripciones` existe
- [x] ✅ Tabla `pagos_usuarios` existe
- [x] ✅ Tabla `usos` existe
- [x] Crear tabla `facturas` en Supabase
- [x] Agregar campos adicionales a `usuarios` (fecha_inicio, fecha_renovacion, estado)
- [x] Crear políticas RLS para nuevas tablas
- [x] Crear índices necesarios

### Integración
- [ ] Agregar alertas de límites (UI + umbrales)
- [ ] Testing completo (API y componentes: loading, error, sin plan, con plan)

---

**Última actualización:** Octubre 2025

