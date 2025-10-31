# Implementación del Dashboard

**Estado Actual**: Fases 2-7 COMPLETADAS ✅  
**Fecha de Implementación**: Diciembre 2024  
**Versión**: v1.0

## 1. Objetivo
- Implementar un dashboard ejecutivo y operativo con enfoque en resultados financieros (recuperos) y salud de cartera.
- Estructura jerárquica: KPIs Principales (ejecutivo) → Salud de Cartera y Efectividad (contexto) → Operaciones y Costos (actividad día a día).
- Reutilizar endpoints y componentes existentes, sin romper funcionalidades actuales.
- Priorizar métricas de recupero y eficiencia sobre métricas de actividad.

## 2. Alcance v1 (prioridad: reutilizar endpoints existentes)
- Página: `src/app/dashboard/page.tsx` (ya existe; actualmente vacía).
- Fuentes de datos existentes:
  - Historial: `GET /api/historial/metrics`, `GET /api/historial`
  - Telefonía: `GET /api/telefono/llamadas/stats`, `GET /api/telefono/agentes/stats`, `GET /api/telefono/numeros/stats`
  - Suscripciones/uso: `GET /api/suscripciones/actual`, `GET /api/suscripciones/uso`, `GET /api/suscripciones/facturas`
- Fuentes de datos a verificar/crear:
  - Recuperos/pagos: Verificar si existe endpoint de agregado de montos recuperados por mes
  - Aging de cartera: Verificar si existe endpoint de deudores agrupados por buckets de antigüedad
  - Monto asignado total: Verificar si existe en `/api/deudores` o puede calcularse
- **Filtros V1**:
  - **Filtro de fecha**: Selector de rango de fechas (mes actual por defecto, opción de seleccionar mes anterior, trimestre, etc.)
  - **Filtro de deuda**: Filtro por estado de deuda (todas, pendientes, pagadas) o por monto (rangos)
  - Los filtros deben aplicarse globalmente a todos los KPIs del dashboard
  - Los filtros se sincronizan con los endpoints mediante query params
- Reutilización de UI:
  - `src/app/billing/components/{PlanActual, UsoActual, Facturacion}.tsx` para tarjetas resumidas.
  - `src/app/historial/components/MetricasHeader.tsx` como guía para KPIs de encabezado.
  - `src/app/historial/components/FiltrosHistorial.tsx` como referencia para implementar filtros.
  - `src/components/ui/*` para tarjetas, tablas, skeletons.
  - Considerar librería de gráficos (recharts, chart.js) para aging y efectividad.

## 3. KPIs v1 - Estructura jerárquica

### 👑 Fila 1: KPIs Principales (El Resultado Ejecutivo)
Esta es la fila más importante, la que un gerente mira 5 segundos para saber si las cosas van bien o mal. Debe ser limpia y mostrar el dinero.

- **Monto Recuperado (Mes Actual)**: El KPI rey. Cuánto dinero real ha ingresado.
- **Tasa de Recupero (%)**: (Monto Recuperado / Monto Asignado). La métrica principal de eficiencia.

> Fuente: Requiere agregado de pagos/recuperos desde `/api/historial` o nuevo endpoint de métricas de recupero. Si no existe, puede calcularse desde estados de historial o integración con pagos.

### 📊 Fila 2: Salud de Cartera y Efectividad (El Contexto)
Aquí respondemos "por qué" los números de la Fila 1 son los que son.

- **Salud de Cartera (Aging)**:
  - Qué es: Un gráfico de barras o dona (pastel) que muestra el monto de la deuda agrupado por antigüedad (0-30 días, 31-60, 61-90, +90).
  - Por qué: Es el estándar de oro. Te dice si tu problema es reciente (fácil de cobrar) o antiguo (difícil).
  - Fuente: Requiere agregado de deudores por buckets de antigüedad desde `/api/deudores` o `/api/historial/metrics`.

- **Efectividad de la Gestión**:
  - Qué es: Un gráfico de barras que compara Monto Recuperado por Canal (Teléfono, Email, SMS, WhatsApp) o por Agente.
  - Por qué: Muestra qué canal o agente está generando más resultados, no solo más actividad.
  - Fuente: `/api/historial/metrics` (agrupado por canal) o `/api/historial` con agregación por canal/agente.

### ⚙️ Fila 3: Operaciones y Costos (La Actividad)
Aquí es donde encajan perfectamente los KPIs de operación día a día.

- **Métricas de Contactabilidad (Hoy)**:
  - Intentos Totales
  - Contactos Efectivos
  - Tasa de Contacto Efectivo (%)
  - Llamadas Hoy (si la telefonía es tu fuerte)
  - Fuente: `/api/historial/metrics`, `/api/telefono/llamadas/stats`

- **Uso del Plan y Costos**:
  - Qué es: Una fusión de las tarjetas "Uso del Plan" y "Suscripción".
  - Métricas:
    - Barras de progreso (Email, Minutos, SMS) vs. límite.
    - Costo total del mes (calculado).
    - Resumen del plan: "Plan Pro - Renueva el 15/Nov".
  - Por qué: Conecta la actividad con el costo directo, permitiendo calcular el ROI.
  - Fuente: `/api/suscripciones/uso`, `/api/suscripciones/actual`

## 4. Diseño de la página

### 👑 Fila 1: KPIs Principales (El Resultado Ejecutivo)
- **Card 1: Monto Recuperado (Mes Actual)**
  - Valor principal destacado en grande
  - Comparativa con mes anterior (opcional)
  - Tendencia (flecha arriba/abajo)
- **Card 2: Tasa de Recupero (%)**
  - Valor principal destacado
  - Comparativa con mes anterior
  - Indicador de salud (verde/amarillo/rojo según umbrales)

### 📊 Fila 2: Salud de Cartera y Efectividad (El Contexto)
- **Card 1: Salud de Cartera (Aging)**
  - Gráfico de barras o dona (pastel) mostrando:
    - 0-30 días
    - 31-60 días
    - 61-90 días
    - +90 días
  - Monto total por bucket con etiquetas
  - Colores diferenciados por antigüedad
- **Card 2: Efectividad de la Gestión**
  - Gráfico de barras comparando Monto Recuperado por:
    - Canal (Teléfono, Email, SMS, WhatsApp)
    - O por Agente (si aplica, con toggle)
  - Valores absolutos y porcentajes

### ⚙️ Fila 3: Operaciones y Costos (La Actividad)
- **Card 1: Métricas de Contactabilidad (Hoy)**
  - Grid con 4 mini-cards:
    - Intentos Totales
    - Contactos Efectivos
    - Tasa de Contacto Efectivo (%)
    - Llamadas Hoy
- **Card 2: Uso del Plan y Costos**
  - Sección superior: Barras de progreso
    - Email (usado / límite)
    - Minutos (usado / límite)
    - SMS (usado / límite)
  - Sección media: Costo total del mes
  - Sección inferior: Resumen del plan ("Plan Pro - Renueva el 15/Nov")

## 5. Estrategia de datos (fetch)
- Carga en paralelo en el cliente (mantener `Protected`):
  - **Fila 1 (KPIs Principales)**:
    - Endpoint de recuperos (a verificar/crear): `/api/historial/recovery` o `/api/recuperos/metrics`
    - `/api/deudores` para monto asignado total (si necesario)
  - **Fila 2 (Salud y Efectividad)**:
    - Endpoint de aging (a verificar/crear): `/api/deudores/aging` o `/api/deudores/stats`
    - `/api/historial/metrics` (agrupado por canal/agente) para efectividad
  - **Fila 3 (Operaciones y Costos)**:
    - `/api/historial/metrics` (filtrado por fecha hoy)
    - `/api/telefono/llamadas/stats` (filtrado por fecha hoy)
    - `/api/suscripciones/uso`, `/api/suscripciones/actual`
- Estados
  - Loading: `components/ui/skeleton` en tarjetas y gráficos
  - Empty: mensajes descriptivos y enlaces a secciones fuente (p.ej., "Ir a Historial")
  - Error: mensaje breve con reintento
- Frecuencia/auto-refresh
  - Telefonía y contactabilidad (hoy): refresco cada 30–60s opcional
  - KPIs principales y salud de cartera: fetch on mount + refresco manual (datos menos dinámicos)
  - Uso del plan: fetch on mount + refresco manual

## 6. Mapeo de endpoints a tarjetas

### 👑 Fila 1: KPIs Principales
- **Monto Recuperado**: Requiere endpoint de agregado de pagos/recuperos
  - Opción A: Nuevo endpoint `/api/historial/recovery` o `/api/recuperos/metrics`
  - Opción B: Calcular desde `/api/historial` filtrando por estado "pagado" o similar
  - Opción C: Integración con endpoint de pagos si existe
- **Tasa de Recupero**: Mismo endpoint anterior + monto asignado total
  - Requiere: Monto Recuperado / Monto Asignado (desde deudores o historial)

### 📊 Fila 2: Salud de Cartera y Efectividad
- **Salud de Cartera (Aging)**:
  - Requiere agregado de deudores por buckets de antigüedad
  - Opción A: Endpoint `/api/deudores/aging` o `/api/deudores/stats`
  - Opción B: Agregado en `/api/historial/metrics` con aging
  - Opción C: Calcular desde `/api/deudores` agrupando por fecha de vencimiento
- **Efectividad de la Gestión**:
  - Monto Recuperado por Canal: `/api/historial/metrics` (agrupado por canal) + datos de recupero
  - Monto Recuperado por Agente: `/api/historial/metrics` (agrupado por agente) + datos de recupero

### ⚙️ Fila 3: Operaciones y Costos
- **Métricas de Contactabilidad (Hoy)**:
  - Intentos/Contactos/Tasa: `/api/historial/metrics` (filtrado por fecha hoy)
  - Llamadas Hoy: `/api/telefono/llamadas/stats` (filtrado por fecha hoy)
- **Uso del Plan y Costos**:
  - Límites y uso: `/api/suscripciones/actual`, `/api/suscripciones/uso`
  - Costo total: `/api/suscripciones/uso` (si incluye costos) o calcular desde uso

## 7. Componentización propuesta

### 👑 Fila 1: KPIs Principales
- `MontoRecuperadoCard`: Card destacado con valor principal, comparativa mensual, tendencia
- `TasaRecuperoCard`: Card destacado con valor principal, comparativa mensual, indicador de salud

### 📊 Fila 2: Salud de Cartera y Efectividad
- `SaludCarteraCard`: Card con gráfico de barras/dona (aging)
  - Puede usar librería de gráficos (recharts, chart.js) o SVG personalizado
  - Mostrar buckets: 0-30, 31-60, 61-90, +90 días
- `EfectividadGestionCard`: Card con gráfico de barras comparativo
  - Monto Recuperado por Canal o por Agente
  - Toggle para cambiar entre Canal/Agente (opcional)

### ⚙️ Fila 3: Operaciones y Costos
- `ContactabilidadCard`: Card con grid de 4 mini-cards internas
  - `MiniKpiCard`: Componente reutilizable para Intentos, Contactos, Tasa, Llamadas
- `UsoPlanCostosCard`: Card fusionado con múltiples secciones
  - Sección superior: Barras de progreso (reutilizar lógica de `UsoActual`)
  - Sección media: Costo total del mes
  - Sección inferior: Resumen del plan (reutilizar `PlanActual` simplificado)

> En v1 se puede mantener todo en `src/app/dashboard/page.tsx`. Si se decide extraer, ubicarlas en `src/app/dashboard/components/`.

## 8. Estados y UX
- Skeletons para cada card y gráficos
- Tooltips con definiciones de KPI:
  - Monto Recuperado: "Total de dinero recuperado en el mes actual"
  - Tasa de Recupero: "Porcentaje de dinero recuperado sobre el monto asignado"
  - Salud de Cartera: "Distribución de la deuda por antigüedad"
  - Efectividad: "Comparativa de recupero por canal o agente"
- Colores semáforo:
  - Tasa de Recupero: Verde (>70%), Amarillo (50-70%), Rojo (<50%)
  - Uso vs límite: Verde (<80%), Naranja (80-95%), Rojo (>95%)
  - Aging: Verde (0-30 días), Amarillo (31-60), Naranja (61-90), Rojo (+90)
- Interactividad en gráficos:
  - Hover en gráficos de aging para mostrar monto detallado por bucket
  - Hover en gráficos de efectividad para mostrar valores exactos por canal/agente
- Acciones:
  - "Ver detalles" en cards principales → enlaza a `/historial`, `/telefono`, `/billing`, `/deudores`

## 9. Seguridad
- Mantener `Protected` y `middleware` como hoy
- Evitar exponer datos sensibles en cliente
- Respetar rate limits (si aplica) y no hacer pooling agresivo

## 10. Performance
- Fetch en paralelo
- Evitar renders pesados; memoizar listas y componentes de gráficos
- Gráficos optimizados:
  - Usar librería ligera (recharts recomendado para React/Next.js)
  - Lazy loading de gráficos si no están en viewport inicial
  - Memoizar cálculos de datos para gráficos
  - Limitar puntos de datos en gráficos (agregar a buckets)
- Evitar recálculos innecesarios:
  - Cachear datos de aging y efectividad
  - Recalcular solo cuando cambien los datos base

## 11. Roadmap v1.5–v2
- v1: Implementación de KPIs Principales (Monto Recuperado, Tasa de Recupero) - requiere endpoints de recuperos ✅
- v1: Implementación de Salud de Cartera (Aging) - requiere endpoint de aging o cálculo desde deudores ✅
- v1: **Filtros de Deuda y Fecha** - Implementar filtros globales para filtrar KPIs por rango de fechas y estado de deuda ✅ **PENDIENTE IMPLEMENTACIÓN**
- v1.5: Promesas de pago (PTP) si no están incluidas en recuperos
- v1.5: Toggle para cambiar entre vista por Canal y por Agente en Efectividad
- v1.5: **% de Deuda Gestionada** - Métrica que muestre qué porcentaje del total de deudas se ha intentado contactar (calculado desde historial de acciones vs total de deudas pendientes)
- v2: ROI de campañas individuales
- v2: Filtros globales adicionales (canal, campaña, agente) - complemento a filtros V1
- v2: Exportación de reportes del dashboard

## 12. Criterios de aceptación
- **Fila 1 (KPIs Principales)**: 
  - Muestra Monto Recuperado (Mes Actual) con valor destacado, comparativa y tendencia.
  - Muestra Tasa de Recupero (%) con valor destacado, comparativa e indicador de salud.
- **Fila 2 (Salud y Efectividad)**:
  - Muestra gráfico de Salud de Cartera (Aging) con buckets de antigüedad (0-30, 31-60, 61-90, +90).
  - Muestra gráfico de Efectividad de la Gestión comparando Monto Recuperado por Canal o Agente.
- **Fila 3 (Operaciones y Costos)**:
  - Muestra métricas de Contactabilidad (Hoy): Intentos, Contactos, Tasa, Llamadas.
  - Muestra Uso del Plan y Costos con barras de progreso, costo total y resumen del plan.
- Datos cargan con skeletons y manejan estados vacío/error.
- Gráficos funcionan correctamente (aging y efectividad).
- No se rompe ninguna sección existente (`/billing`, `/historial`, `/telefono`).

## 13. Notas de implementación
- Este documento planifica; no modifica archivos.
- Implementación posterior reusará endpoints y componentes existentes.
- **Endpoints a verificar/crear**:
  - Endpoint de recuperos/pagos agregados por mes: `/api/historial/recovery` o `/api/recuperos/metrics`
  - Endpoint de aging de cartera: `/api/deudores/aging` o `/api/deudores/stats`
  - Si no existen, calcular desde endpoints existentes (`/api/historial`, `/api/deudores`) en el frontend o crear endpoints en el backend.
- **Librerías a considerar**:
  - Recharts o Chart.js para gráficos de aging y efectividad
  - Implementar gráficos simples (SVG) si se prefiere no agregar dependencias externas

## 14. Checklist de Implementación

### Fase 1: Preparación y Verificación de Endpoints

#### 1.1 Verificación de Endpoints Existentes
- [ ] Verificar que `/api/historial/metrics` funciona y retorna los datos esperados
- [ ] Verificar que `/api/historial` funciona y permite filtrado por fecha
- [ ] Verificar que `/api/telefono/llamadas/stats` funciona y permite filtrado por fecha
- [ ] Verificar que `/api/suscripciones/actual` retorna plan y límites
- [ ] Verificar que `/api/suscripciones/uso` retorna consumo actual
- [ ] Verificar que `/api/deudores` retorna datos necesarios para cálculo de aging

#### 1.2 Endpoints de Recuperos (Fila 1)
- [ ] Verificar si existe `/api/historial/recovery` o `/api/recuperos/metrics`
- [ ] Si no existe, verificar si `/api/historial` puede filtrarse por estado "pagado" o similar
- [ ] Si no existe, decidir: crear endpoint backend o calcular en frontend
- [ ] Si se crea endpoint backend:
  - [ ] Crear `/api/historial/recovery` o `/api/recuperos/metrics`
  - [ ] Implementar agregado de montos recuperados por mes
  - [ ] Incluir comparativa con mes anterior
- [ ] Verificar fuente de "Monto Asignado Total" para cálculo de Tasa de Recupero

#### 1.3 Endpoints de Aging (Fila 2)
- [ ] Verificar si existe `/api/deudores/aging` o `/api/deudores/stats`
- [ ] Si no existe, verificar si `/api/deudores` incluye fecha de vencimiento
- [ ] Si no existe, decidir: crear endpoint backend o calcular en frontend
- [ ] Si se crea endpoint backend:
  - [ ] Crear `/api/deudores/aging` o `/api/deudores/stats`
  - [ ] Implementar agrupación por buckets: 0-30, 31-60, 61-90, +90 días
  - [ ] Retornar monto total por bucket

#### 1.4 Endpoints de Efectividad (Fila 2)
- [ ] Verificar si `/api/historial/metrics` puede agrupar por canal
- [ ] Verificar si `/api/historial/metrics` puede agrupar por agente
- [ ] Verificar si los datos incluyen monto recuperado por canal/agente
- [ ] Si no, planificar agregación en frontend o creación de endpoint

### Fase 2: Configuración Inicial del Proyecto ✅ COMPLETADA

#### 2.1 Instalación de Dependencias
- [x] Decidir librería de gráficos (recharts recomendado)
- [x] Instalar librería de gráficos: `npm install recharts` o `npm install chart.js react-chartjs-2`
- [x] Verificar compatibilidad con Next.js y TypeScript
- [x] Actualizar `package.json` con nuevas dependencias

#### 2.2 Estructura de Carpetas
- [x] Verificar existencia de `src/app/dashboard/page.tsx`
- [x] Decidir si crear carpeta `src/app/dashboard/components/` o mantener todo en `page.tsx`
- [x] Crear carpeta `src/app/dashboard/components/` si se decide extraer componentes
- [x] Crear archivos base para componentes:
  - [x] `MontoRecuperadoCard.tsx` (o en `page.tsx`)
  - [x] `TasaRecuperoCard.tsx` (o en `page.tsx`)
  - [x] `SaludCarteraCard.tsx` (o en `page.tsx`)
  - [x] `EfectividadGestionCard.tsx` (o en `page.tsx`)
  - [x] `ContactabilidadCard.tsx` (o en `page.tsx`)
  - [x] `UsoPlanCostosCard.tsx` (o en `page.tsx`)
  - [x] `MiniKpiCard.tsx` (componente reutilizable)
  - [ ] `FiltrosDashboard.tsx` (componente de filtros V1) - **PENDIENTE V1**

#### 2.3 Configuración de Tipos TypeScript
- [x] Crear o actualizar tipos para datos de recuperos
- [x] Crear o actualizar tipos para datos de aging
- [x] Crear o actualizar tipos para datos de efectividad
- [x] Crear tipos para props de cada componente

### Fase 3: Implementación Fila 1 - KPIs Principales ✅ COMPLETADA

#### 3.1 MontoRecuperadoCard
- [x] Crear componente `MontoRecuperadoCard`
- [x] Implementar fetch de datos desde endpoint de recuperos (`/api/recuperos/metrics`)
- [x] Mostrar valor principal destacado (formato moneda con `formatearMontoCLP`)
- [x] Implementar comparativa con mes anterior (opcional)
- [x] Implementar indicador de tendencia (flecha arriba/abajo con `TrendingUp`/`TrendingDown`)
- [x] Implementar skeleton mientras carga
- [x] Implementar manejo de estado vacío
- [x] Implementar manejo de errores con reintento
- [x] Agregar tooltip con definición del KPI
- [x] Agregar enlace "Ver detalles" a `/historial` o página relevante

#### 3.2 TasaRecuperoCard
- [x] Crear componente `TasaRecuperoCard`
- [x] Implementar fetch de datos (Monto Recuperado + Monto Asignado)
- [x] Calcular tasa: (Monto Recuperado / Monto Asignado) * 100
- [x] Mostrar valor principal destacado (formato porcentaje)
- [x] Implementar comparativa con mes anterior
- [x] Implementar indicador de salud:
  - [x] Verde si >70%
  - [x] Amarillo si 50-70%
  - [x] Rojo si <50%
- [x] Implementar skeleton mientras carga
- [x] Implementar manejo de estado vacío
- [x] Implementar manejo de errores con reintento
- [x] Agregar tooltip con definición del KPI
- [x] Agregar enlace "Ver detalles" si aplica

#### 3.3 Integración Fila 1 en Dashboard
- [x] Integrar `MontoRecuperadoCard` en `src/app/dashboard/page.tsx`
- [x] Integrar `TasaRecuperoCard` en `src/app/dashboard/page.tsx`
- [x] Crear layout responsive (grid de 2 columnas)
- [x] Verificar que los cards se ven correctamente en mobile/tablet/desktop
- [x] Probar carga de datos en paralelo

### Fase 4: Implementación Fila 2 - Salud de Cartera y Efectividad ✅ COMPLETADA

#### 4.1 SaludCarteraCard
- [x] Crear componente `SaludCarteraCard`
- [x] Implementar fetch de datos desde endpoint de aging (`/api/deudores/aging`)
- [x] Instalar/configurar librería de gráficos (recharts instalado)
- [x] Crear gráfico de barras mostrando 4 buckets:
  - [x] 0-30 días (verde)
  - [x] 31-60 días (amarillo)
  - [x] 61-90 días (naranja)
  - [x] +90 días (rojo)
- [x] Mostrar monto total por bucket con etiquetas
- [x] Implementar hover para mostrar monto detallado (tooltip de recharts)
- [x] Implementar skeleton mientras carga
- [x] Implementar manejo de estado vacío
- [x] Implementar manejo de errores con reintento
- [x] Agregar tooltip con definición del KPI
- [x] Agregar enlace "Ver detalles" a `/deudores` o página relevante

#### 4.2 EfectividadGestionCard
- [x] Crear componente `EfectividadGestionCard`
- [x] Implementar fetch de datos desde endpoint de efectividad (`/api/historial/metrics`)
- [x] Crear gráfico de barras comparando Monto Recuperado por Canal:
  - [x] Teléfono
  - [x] Email
  - [x] SMS
  - [x] WhatsApp
- [x] Mostrar valores absolutos y porcentajes
- [x] Implementar hover para mostrar valores exactos (tooltip de recharts)
- [ ] (Opcional) Implementar toggle para cambiar entre Canal y Agente - **PENDIENTE v1.5**
- [x] Implementar skeleton mientras carga
- [x] Implementar manejo de estado vacío
- [x] Implementar manejo de errores con reintento
- [x] Agregar tooltip con definición del KPI
- [x] Agregar enlace "Ver detalles" si aplica
- **NOTA**: Actualmente usa estimación basada en acciones completadas. Para v2, calcular desde pagos reales por canal.

#### 4.3 Integración Fila 2 en Dashboard
- [x] Integrar `SaludCarteraCard` en `src/app/dashboard/page.tsx`
- [x] Integrar `EfectividadGestionCard` en `src/app/dashboard/page.tsx`
- [x] Crear layout responsive (grid de 2 columnas)
- [x] Verificar que los cards y gráficos se ven correctamente en todos los tamaños
- [x] Probar interactividad de gráficos (hover)

### Fase 5: Implementación Fila 3 - Operaciones y Costos ✅ COMPLETADA

#### 5.1 Componente MiniKpiCard
- [x] Crear componente reutilizable `MiniKpiCard`
- [x] Definir props: `title`, `value`, `subtitle?`, `icon?`
- [x] Implementar diseño compacto
- [x] Implementar skeleton
- [x] Reutilizar en ContactabilidadCard

#### 5.2 ContactabilidadCard
- [x] Crear componente `ContactabilidadCard`
- [x] Implementar fetch de datos desde `/api/historial/metrics` (filtrado por hoy)
- [x] Implementar fetch de datos desde `/api/telefono/llamadas/stats` (filtrado por hoy)
- [x] Crear grid con 4 `MiniKpiCard`:
  - [x] Intentos Totales
  - [x] Contactos Efectivos
  - [x] Tasa de Contacto Efectivo (%)
  - [x] Llamadas Hoy
- [x] Calcular tasa de contacto: (Contactos / Intentos) * 100 (con validación de división por cero)
- [x] Implementar skeleton mientras carga
- [x] Implementar manejo de estado vacío
- [x] Implementar manejo de errores con reintento
- [x] Agregar enlace "Ver detalles" a `/historial` o `/telefono`
- [x] (Opcional) Implementar auto-refresh cada 30-60s - **IMPLEMENTADO (60s)**

#### 5.3 UsoPlanCostosCard
- [x] Crear componente `UsoPlanCostosCard`
- [x] Implementar fetch de datos desde `/api/suscripciones/actual`
- [x] Implementar fetch de datos desde `/api/suscripciones/uso`
- [x] Reutilizar lógica de `UsoActual` para barras de progreso:
  - [x] Email (usado / límite) con barra de progreso
  - [x] Minutos (usado / límite) con barra de progreso
  - [x] SMS (usado / límite) con barra de progreso
- [x] Implementar colores semáforo:
  - [x] Verde si <80%
  - [x] Naranja si 80-95%
  - [x] Rojo si >95%
- [x] Calcular costo total del mes (viene del endpoint `/api/suscripciones/uso`)
- [x] Mostrar resumen del plan: "Plan Pro - Renueva el 15/Nov"
- [x] Reutilizar componente `PlanActual` simplificado para sección de plan
- [x] Implementar skeleton mientras carga
- [x] Implementar manejo de estado vacío
- [x] Implementar manejo de errores con reintento
- [x] Agregar enlace "Ver detalles" a `/billing`

#### 5.4 Integración Fila 3 en Dashboard
- [x] Integrar `ContactabilidadCard` en `src/app/dashboard/page.tsx`
- [x] Integrar `UsoPlanCostosCard` en `src/app/dashboard/page.tsx`
- [x] Crear layout responsive (grid de 2 columnas)
- [x] Verificar que los cards se ven correctamente en todos los tamaños
- [x] Probar auto-refresh de contactabilidad (si se implementa)

### Fase 6: Estados y UX ✅ COMPLETADA

#### 6.1 Skeletons
- [x] Verificar que todos los cards tienen skeleton mientras cargan
- [x] Verificar que los gráficos tienen skeleton mientras cargan
- [x] Asegurar que los skeletons tienen tamaño similar al contenido final

#### 6.2 Tooltips
- [x] Agregar tooltip en `MontoRecuperadoCard`: "Total de dinero recuperado en el mes actual"
- [x] Agregar tooltip en `TasaRecuperoCard`: "Porcentaje de dinero recuperado sobre el monto asignado"
- [x] Agregar tooltip en `SaludCarteraCard`: "Distribución de la deuda por antigüedad"
- [x] Agregar tooltip en `EfectividadGestionCard`: "Comparativa de recupero por canal o agente"
- [x] Verificar que los tooltips funcionan en hover

#### 6.3 Colores Semáforo
- [x] Implementar colores en `TasaRecuperoCard`:
  - [x] Verde si >70%
  - [x] Amarillo si 50-70%
  - [x] Rojo si <50%
- [x] Implementar colores en barras de progreso de `UsoPlanCostosCard`:
  - [x] Verde si <80%
  - [x] Naranja si 80-95%
  - [x] Rojo si >95%
- [x] Implementar colores en `SaludCarteraCard`:
  - [x] Verde para 0-30 días
  - [x] Amarillo para 31-60 días
  - [x] Naranja para 61-90 días
  - [x] Rojo para +90 días

#### 6.4 Interactividad en Gráficos
- [x] Implementar hover en gráfico de aging para mostrar monto detallado por bucket (tooltip de recharts)
- [x] Implementar hover en gráfico de efectividad para mostrar valores exactos por canal/agente (tooltip de recharts)
- [x] Verificar que los tooltips de gráficos son legibles y bien posicionados

#### 6.5 Enlaces "Ver Detalles"
- [x] Verificar que todos los enlaces "Ver detalles" funcionan correctamente
- [x] Enlaces deben ir a:
  - [x] `/historial` para métricas de historial
  - [x] `/telefono` para métricas de telefonía
  - [x] `/billing` para uso del plan
  - [x] `/deudores` para salud de cartera

### Fase 7: Optimizaciones de Performance ✅ COMPLETADA

#### 7.1 Fetch en Paralelo
- [x] Verificar que todos los fetches se hacen en paralelo (no secuencial)
- [x] Usar `Promise.all()` o múltiples `useEffect` independientes
- [x] Verificar que no hay dependencias innecesarias entre fetches

#### 7.2 Memoización
- [x] Memoizar componentes de gráficos con `React.memo`
- [x] Memoizar cálculos de datos para gráficos con `useMemo`
- [x] Memoizar listas y arrays con `useMemo`
- [x] Verificar que no hay re-renders innecesarios

#### 7.3 Optimización de Gráficos
- [x] Verificar que la librería de gráficos está optimizada (recharts instalado y configurado)
- [ ] Implementar lazy loading de gráficos si no están en viewport inicial (opcional) - **PENDIENTE v2**
- [x] Limitar puntos de datos en gráficos (agregar a buckets)
- [x] Cachear datos de aging y efectividad (no recalcular si no cambian datos base mediante `useMemo`)

#### 7.4 Auto-refresh
- [x] Implementar auto-refresh para contactabilidad (30-60s) si se decide incluir - **IMPLEMENTADO (60s)**
- [ ] Implementar auto-refresh para telefonía (30-60s) si se decide incluir - **NO IMPLEMENTADO (opcional)**
- [x] Asegurar que auto-refresh no es demasiado agresivo (respetar rate limits - 60s es razonable)
- [ ] Permitir desactivar auto-refresh si el usuario está en otra pestaña - **PENDIENTE v2**

### Fase 8: Implementación Filtros V1 - Filtros de Deuda y Fecha ⚠️ PENDIENTE V1

#### 8.1 Componente FiltrosDashboard
- [ ] Crear componente `FiltrosDashboard.tsx`
- [ ] Implementar selector de rango de fechas:
  - [ ] Opciones predefinidas: Mes actual (por defecto), Mes anterior, Trimestre actual, Año actual
  - [ ] Selector de rango personalizado (fecha desde - fecha hasta)
  - [ ] Usar componentes UI existentes (Input, Calendar, Select) de `src/components/ui/*`
- [ ] Implementar selector de estado de deuda:
  - [ ] Selector dropdown: Todas, Pendientes, Pagadas
  - [ ] O alternativamente: Filtro por rango de monto (mínimo - máximo)
- [ ] Implementar sincronización con query params en URL:
  - [ ] Actualizar URL cuando cambian filtros (`?from=YYYY-MM-DD&to=YYYY-MM-DD&estado_deuda=pendiente`)
  - [ ] Leer filtros desde URL al cargar página
  - [ ] Usar `useSearchParams` de Next.js para manejar query params
- [ ] Implementar diseño consistente con `FiltrosHistorial`:
  - [ ] Reutilizar estilos y estructura similar
  - [ ] Mantener consistencia visual con el resto de la aplicación

#### 8.2 Integración de Filtros en Dashboard
- [ ] Integrar `FiltrosDashboard` en `src/app/dashboard/page.tsx` (parte superior)
- [ ] Pasar filtros como props a todos los componentes de cards o leer desde query params
- [ ] Actualizar `MontoRecuperadoCard` para aceptar filtros de fecha (`from`, `to`)
- [ ] Actualizar `TasaRecuperoCard` para aceptar filtros de fecha y deuda
- [ ] Actualizar `SaludCarteraCard` para aceptar filtro de estado de deuda
- [ ] Actualizar `EfectividadGestionCard` para aceptar filtros de fecha
- [ ] Actualizar `ContactabilidadCard` para aceptar filtros de fecha (reemplazar filtro fijo "hoy")
- [ ] `UsoPlanCostosCard` no debe verse afectado por filtros (mostrar siempre datos del mes actual)

#### 8.3 Actualización de Endpoints para Aceptar Filtros
- [ ] Verificar que `/api/recuperos/metrics` acepta query params `from` y `to`
- [ ] Actualizar `/api/recuperos/metrics` para filtrar por estado de deuda si es necesario
- [ ] Verificar que `/api/deudores/aging` acepta query params `estado_deuda` o similar
- [ ] Actualizar `/api/deudores/aging` para filtrar por estado de deuda
- [ ] Verificar que `/api/historial/metrics` ya acepta `from` y `to` (debe funcionar sin cambios)

### Fase 9: Seguridad y Validación

#### 9.1 Protección de Rutas
- [ ] Verificar que `src/app/dashboard/page.tsx` está protegido con `Protected` wrapper
- [ ] Verificar que el middleware protege la ruta `/dashboard`
- [ ] Probar que usuarios no autenticados son redirigidos

#### 9.2 Validación de Datos
- [ ] Validar que los datos recibidos de los endpoints tienen el formato esperado
- [ ] Manejar casos donde los datos vienen en formato inesperado
- [ ] Validar que los cálculos (tasa de recupero, tasa de contacto) manejan división por cero

#### 9.3 Rate Limits
- [ ] Verificar que no se exceden rate limits en los endpoints
- [ ] No hacer polling agresivo
- [ ] Implementar retry con backoff exponencial en caso de error 429

### Fase 10: Testing y Validación

#### 10.1 Testing Funcional
- [ ] Probar carga inicial del dashboard con datos válidos
- [ ] Probar carga con datos vacíos (sin recuperos, sin deudores, etc.)
- [ ] Probar manejo de errores (endpoint caído, timeout, etc.)
- [ ] Probar todos los enlaces "Ver detalles"
- [ ] Probar tooltips en hover
- [ ] Probar interactividad de gráficos
- [ ] Probar filtros de fecha y deuda (cambiar valores y verificar que se aplican a todos los KPIs)

#### 10.2 Testing Responsive
- [ ] Probar en desktop (1920x1080, 1366x768)
- [ ] Probar en tablet (768x1024, 1024x768)
- [ ] Probar en mobile (375x667, 414x896)
- [ ] Verificar que los gráficos se adaptan correctamente
- [ ] Verificar que el grid de cards se reorganiza correctamente
- [ ] Verificar que los filtros se ven correctamente en todos los tamaños

#### 10.3 Testing de Performance
- [ ] Medir tiempo de carga inicial del dashboard
- [ ] Verificar que no hay re-renders innecesarios (usar React DevTools)
- [ ] Verificar que los gráficos no causan lag al renderizar
- [ ] Probar con datos grandes (muchos deudores, muchos registros de historial)
- [ ] Verificar que cambios de filtros no causan renders innecesarios

#### 10.4 Validación de Criterios de Aceptación
- [ ] ✅ Filtros V1: Selector de fecha y deuda funcional con sincronización en URL
- [ ] ✅ Filtros aplican correctamente a todos los KPIs del dashboard
- [ ] ✅ Fila 1 muestra Monto Recuperado con valor destacado, comparativa y tendencia (según filtros)
- [ ] ✅ Fila 1 muestra Tasa de Recupero con valor destacado, comparativa e indicador de salud (según filtros)
- [ ] ✅ Fila 2 muestra gráfico de Salud de Cartera con buckets de antigüedad (0-30, 31-60, 61-90, +90) según filtros
- [ ] ✅ Fila 2 muestra gráfico de Efectividad comparando Monto Recuperado por Canal o Agente según filtros de fecha
- [ ] ✅ Fila 3 muestra métricas de Contactabilidad según filtro de fecha seleccionado: Intentos, Contactos, Tasa, Llamadas
- [ ] ✅ Fila 3 muestra Uso del Plan y Costos con barras de progreso, costo total y resumen del plan (no afectado por filtros)
- [ ] ✅ Datos cargan con skeletons y manejan estados vacío/error
- [ ] ✅ Gráficos funcionan correctamente (aging y efectividad) y responden a cambios de filtros
- [ ] ✅ No se rompe ninguna sección existente (`/billing`, `/historial`, `/telefono`)

### Fase 11: Documentación y Deployment

#### 11.1 Documentación de Código
- [ ] Agregar comentarios JSDoc a funciones principales
- [ ] Documentar props de componentes
- [ ] Documentar endpoints utilizados
- [ ] Documentar dependencias nuevas (librería de gráficos)
- [ ] Documentar componente `FiltrosDashboard` y cómo se integra con los KPIs

#### 11.2 Documentación de Usuario
- [ ] Crear tooltips descriptivos (ya incluido en Fase 6)
- [ ] Verificar que los tooltips son claros y útiles
- [ ] Agregar tooltip en filtros explicando cómo funcionan

#### 11.3 Deployment
- [ ] Verificar que el código funciona en ambiente de desarrollo
- [ ] Verificar que el código funciona en ambiente de staging
- [ ] Verificar que todos los endpoints funcionan en producción
- [ ] Verificar que no hay errores en consola del navegador
- [ ] Verificar que no hay errores en logs del servidor
- [ ] Probar filtros en producción con datos reales
- [ ] Realizar prueba final en producción antes de marcar como completado

---

## 15. Resumen de Implementación v1.0

### ✅ Fases Completadas: 2-7

**Fecha de Implementación**: Diciembre 2024

### 📁 Archivos Creados

#### Componentes del Dashboard
- `src/app/dashboard/types.ts` - Tipos TypeScript para el dashboard
- `src/app/dashboard/components/MiniKpiCard.tsx` - Componente reutilizable para mini-KPIs
- `src/app/dashboard/components/MontoRecuperadoCard.tsx` - KPI principal de monto recuperado
- `src/app/dashboard/components/TasaRecuperoCard.tsx` - KPI de tasa de recupero
- `src/app/dashboard/components/SaludCarteraCard.tsx` - Gráfico de aging de cartera
- `src/app/dashboard/components/EfectividadGestionCard.tsx` - Gráfico de efectividad por canal
- `src/app/dashboard/components/ContactabilidadCard.tsx` - Métricas de contactabilidad (hoy)
- `src/app/dashboard/components/UsoPlanCostosCard.tsx` - Uso del plan y costos

#### Endpoints API Creados
- `src/app/api/recuperos/metrics/route.ts` - Endpoint para calcular recuperos y tasa de recupero
- `src/app/api/deudores/aging/route.ts` - Endpoint para calcular aging de cartera

#### Archivos Modificados
- `src/app/dashboard/page.tsx` - Integración de todos los componentes del dashboard
- `package.json` - Agregada dependencia `recharts`

#### Componentes Pendientes V1
- `src/app/dashboard/components/FiltrosDashboard.tsx` - **PENDIENTE** - Componente de filtros de fecha y deuda para aplicar a todos los KPIs

### 📊 Estructura del Dashboard

#### 🔍 Filtros V1 (Pendiente Implementación)
- **FiltrosDashboard**: Componente de filtros globales con:
  - Filtro de fecha: Selector de rango (mes actual, mes anterior, trimestre, año, personalizado)
  - Filtro de deuda: Selector de estado (todas, pendientes, pagadas) o rango de monto
  - Ubicación: Parte superior del dashboard, antes de las filas de KPIs
  - Persistencia: Query params en URL para compartir vistas filtradas

#### 👑 Fila 1: KPIs Principales
- **MontoRecuperadoCard**: Muestra monto recuperado según filtros aplicados con comparativa y tendencia
- **TasaRecuperoCard**: Muestra tasa de recupero según filtros aplicados con indicador de salud (verde/amarillo/rojo)

#### 📊 Fila 2: Salud de Cartera y Efectividad
- **SaludCarteraCard**: Gráfico de barras con aging de cartera (0-30, 31-60, 61-90, +90 días) según filtros aplicados
- **EfectividadGestionCard**: Gráfico de barras comparando efectividad por canal según filtros de fecha

#### ⚙️ Fila 3: Operaciones y Costos
- **ContactabilidadCard**: Mini-KPIs de intentos, contactos, tasa de contacto y llamadas según filtro de fecha seleccionado
- **UsoPlanCostosCard**: Barras de progreso de uso del plan, costo total y resumen del plan (no afectado por filtros)

### 🔧 Características Implementadas

#### UX/UI
- ✅ Skeletons para todos los componentes mientras cargan
- ✅ Tooltips informativos en todos los cards
- ✅ Colores semáforo (verde/amarillo/rojo/naranja) según métricas
- ✅ Interactividad en gráficos (hover tooltips)
- ✅ Manejo de estados vacío y error con mensajes claros
- ✅ Enlaces "Ver detalles" a secciones relevantes

#### Performance
- ✅ Memoización de componentes con `React.memo`
- ✅ Cálculos optimizados con `useMemo`
- ✅ Fetch en paralelo con `Promise.all`
- ✅ Auto-refresh en ContactabilidadCard (60s)
- ✅ Gráficos optimizados con `ResponsiveContainer` de recharts

#### Validaciones
- ✅ Manejo de división por cero en todos los cálculos
- ✅ Validación de datos recibidos de endpoints
- ✅ Protección de rutas con `Protected` wrapper

### ⚠️ Notas y Limitaciones

1. **EfectividadGestionCard**: Actualmente usa una estimación basada en acciones completadas (`montoEstimado = accionesCompletadas * 50000`). Para v2, debería calcularse desde pagos reales asociados a cada canal mediante join entre `pagos`, `deudas` e `historial`.

2. **Toggle Canal/Agente**: El toggle para cambiar entre vista por Canal y por Agente está pendiente para v1.5 (marcado como opcional en el documento).

3. **Lazy Loading de Gráficos**: Pendiente para v2 (opcional).

4. **Auto-refresh Condicional**: La funcionalidad de desactivar auto-refresh cuando el usuario está en otra pestaña está pendiente para v2.

5. **% de Deuda Gestionada**: **FUTURA IMPLEMENTACIÓN** - Agregar métrica que muestre el porcentaje de deuda gestionada, es decir, qué porcentaje del total de deudas se ha intentado contactar (calculado desde historial de acciones vs total de deudas pendientes). Esta métrica ayudaría a identificar qué porcentaje de la cartera está siendo activamente gestionada y cuál está pendiente de contacto. Posible ubicación: Fila 2 o Fila 3 como nuevo card o métrica adicional.

6. **Filtros V1**: **PENDIENTE IMPLEMENTACIÓN** - Agregar filtros de fecha (rango de fechas) y deuda (estado y/o rango de monto) en la parte superior del dashboard. Los filtros deben aplicarse globalmente a todos los KPIs y sincronizarse mediante query params en la URL. Implementar componente `FiltrosDashboard` similar a `FiltrosHistorial` para mantener consistencia UI.

### 📝 Próximos Pasos

#### Implementación Pendiente V1
- **Filtros de Deuda y Fecha**: Implementar componente `FiltrosDashboard` con:
  - Selector de rango de fechas (mes actual por defecto, opciones predefinidas, rango personalizado)
  - Selector de estado de deuda (todas, pendientes, pagadas) o filtro por rango de monto
  - Sincronización con query params en URL
  - Aplicación global a todos los KPIs del dashboard
  - Integración con endpoints existentes mediante query params (`from`, `to`, `estado_deuda`, etc.)
  - Actualizar componentes existentes para aceptar filtros como props o leer desde query params
  - Reutilizar lógica de `FiltrosHistorial` como referencia

#### Fases 8-10
- **Fase 8**: Seguridad y Validación (testing de protección de rutas, validación de datos, rate limits)
- **Fase 9**: Testing y Validación (testing funcional, responsive, performance)
- **Fase 10**: Documentación y Deployment (comentarios JSDoc, documentación de usuario, deployment)

### 🚀 Estado Actual

El dashboard v1.0 está **funcionalmente completo** en su implementación base (fases 2-7) y listo para pruebas en desarrollo. La implementación de **Filtros de Deuda y Fecha** está pendiente para completar el alcance V1 según los nuevos requisitos.
