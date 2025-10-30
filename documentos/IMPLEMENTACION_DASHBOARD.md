# Implementación del Dashboard

## 1. Objetivo
- Implementar un dashboard operativo y ejecutivo con KPIs clave de cobranza, contactabilidad, telefonía y uso del plan.
- Reutilizar endpoints y componentes existentes, sin romper funcionalidades actuales.

## 2. Alcance v1 (sin cambios de backend)
- Página: `src/app/dashboard/page.tsx` (ya existe; actualmente vacía).
- Fuentes de datos:
  - Historial: `GET /api/historial/metrics`, `GET /api/historial`
  - Telefonía: `GET /api/telefono/llamadas/stats`, `GET /api/telefono/agentes/stats`, `GET /api/telefono/numeros/stats`
  - Suscripciones/uso: `GET /api/suscripciones/actual`, `GET /api/suscripciones/uso`, `GET /api/suscripciones/facturas`
- Reutilización de UI:
  - `src/app/billing/components/{PlanActual, UsoActual, Facturacion, ConsumoDetalle}.tsx` para tarjetas resumidas.
  - `src/app/historial/components/MetricasHeader.tsx` como guía para KPIs de encabezado.
  - `src/components/ui/*` para tarjetas, tablas, skeletons.

## 3. KPIs v1
- Contactabilidad
  - Intentos totales (últimos 7/30 días)
  - Contactos efectivos y tasa de contacto = contactos / intentos
  - Por canal: teléfono, email, SMS, WhatsApp
  - Fuente: `/api/historial/metrics`
- Telefonía
  - Llamadas hoy y mes, duración total/promedio
  - Tasa de conexión = llamadas conectadas / intentos
  - Agentes activos y números activos
  - Fuente: `/api/telefono/llamadas/stats`, `/api/telefono/agentes/stats`, `/api/telefono/numeros/stats`
- Uso y costos (plan)
  - Consumo del mes: emails, llamadas (min), SMS, WhatsApp, almacenamiento
  - Porcentaje de uso vs límites del plan
  - Costo del mes por canal y total
  - Fuente: `/api/suscripciones/uso`, `/api/suscripciones/actual`
- Actividad reciente
  - Últimos 5–10 eventos con filtros rápidos
  - Fuente: `/api/historial`

> Nota: KPIs de cartera (total de deudores, deudas activas, monto total, buckets de antigüedad) se proponen para v1.5 si existe endpoint en `/api/deudores` o agregado en `historial/metrics`.

## 4. Diseño de la página
- Encabezado
  - 4 KPIs: Intentos, Contactos, Tasa de contacto, Llamadas hoy
- Fila 1
  - Card "Telefonía": llamadas mes, duración, tasa de conexión, agentes activos
  - Card "Uso del plan": barras de progreso y límites
- Fila 2
  - Card "Actividad reciente": tabla compacta con tipo, canal, fecha, estado
  - Card "Costos del mes": costo por canal y total (resumen)
- Fila 3
  - Card "Suscripción": plan actual, estado, próxima renovación
  - Card "Facturas recientes": últimas 2–3 con enlace a `/billing`

## 5. Estrategia de datos (fetch)
- Carga en paralelo en el cliente (mantener `Protected`):
  - `/api/historial/metrics`, `/api/historial`
  - `/api/telefono/llamadas/stats`, `/api/telefono/agentes/stats`, `/api/telefono/numeros/stats`
  - `/api/suscripciones/uso`, `/api/suscripciones/actual`, `/api/suscripciones/facturas`
- Estados
  - Loading: `components/ui/skeleton` en tarjetas y tablas
  - Empty: mensajes descriptivos y enlaces a secciones fuente (p.ej., "Ir a Historial")
  - Error: mensaje breve con reintento
- Frecuencia/auto-refresh
  - Telefonía: refresco cada 30–60s opcional
  - Resto: fetch on mount + refresco manual

## 6. Mapeo de endpoints a tarjetas
- Encabezado KPIs:
  - Tasa de contacto e intentos/contactos: `/api/historial/metrics`
- Telefonía:
  - Llamadas y duración: `/api/telefono/llamadas/stats`
  - Agentes activos: `/api/telefono/agentes/stats`
  - Números activos: `/api/telefono/numeros/stats`
- Uso/Plan:
  - Límites y uso: `/api/suscripciones/actual`, `/api/suscripciones/uso`
- Costos:
  - Dentro de `/api/suscripciones/uso` si ya incluye costos por canal
- Actividad reciente:
  - `/api/historial` (paginado/limit 10)

## 7. Componentización propuesta
- `DashboardKpiCard` (Card simple con valor, subtítulo, ícono y estado)
- `TelefoniaResumenCard`
- `UsoPlanCard` (puede reutilizar lógica de `UsoActual`)
- `CostosResumenCard` (agrega por canal)
- `ActividadRecienteTable`
- `SuscripcionResumenCard` (reutiliza `PlanActual` simplificado)
- `FacturasRecientesCard` (reutiliza `Facturacion` compacta)

> En v1 se puede mantener todo en `src/app/dashboard/page.tsx`. Si se decide extraer, ubicarlas en `src/app/dashboard/components/`.

## 8. Estados y UX
- Skeletons para cada card
- Tooltips con definiciones de KPI
- Colores semáforo para uso vs límite (p.ej., >80% naranja, >95% rojo)
- Acciones:
  - Ver más → enlaza a `/historial`, `/telefono`, `/billing`

## 9. Seguridad
- Mantener `Protected` y `middleware` como hoy
- Evitar exponer datos sensibles en cliente
- Respetar rate limits (si aplica) y no hacer pooling agresivo

## 10. Performance
- Fetch en paralelo
- Evitar renders pesados; memoizar listas
- Paginación/limit en actividad reciente
- Sin gráficos pesados en v1 (usar números y barras simples)

## 11. Roadmap v1.5–v2
- v1.5: KPIs de Cartera (si se expone agregado de `deudores/deudas`)
- v2: Promesas de pago (PTP), Recupero y Tasa de recupero, ROI campañas
- v2: Filtros globales (rango de fechas, canal, campaña, agente)

## 12. Criterios de aceptación
- La página `/dashboard` muestra: 4 KPIs encabezado, 4–6 tarjetas funcionales, actividad reciente.
- Datos cargan con skeletons y manejan estados vacío/error.
- Enlaces “Ver más” funcionan a sus secciones.
- No se rompe ninguna sección existente (`/billing`, `/historial`, `/telefono`).

## 13. Sin cambios de código en esta etapa
- Este documento planifica; no modifica archivos.
- Implementación posterior reusará endpoints y componentes existentes.
