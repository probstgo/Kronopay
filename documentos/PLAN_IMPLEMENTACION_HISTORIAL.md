# Plan de Implementación — Historial (/historial)

**Objetivo**
- Mostrar, filtrar y revisar acciones de cobranza (email, llamada, sms, whatsapp) de forma clara y simple.
- Mantener trazabilidad sin cambios de esquema.

**Datos a mostrar (tabla)**
- Fecha y hora (`fecha`)
- Canal (`tipo_accion`): email | llamada | sms | whatsapp
- Estado (`estado`): iniciado | entregado | completado | fallido | …
- Destino: email o teléfono completo (sin ofuscación)
- Campaña: `campana_id` (opcional mostrar nombre)
- Origen: `detalles.origen` ("cron" | "manual")

**Detalle (modal)**
- Comunes: `detalles.external_id`, `detalles.plantilla_id`, `detalles.plantilla_nombre`, `detalles.intento_n`/`detalles.max_intentos`
- Email: `delivered_at`, `opened_at`, `clicked_at`, `bounce_code`, `error_message`, `asunto`
- Llamada: `detalles.duracion` (s), `detalles.costo`, `detalles.motivo_fin` (completed | no-answer | failed), `detalles.conversation_id`, `detalles.agente_nombre`
- SMS/WhatsApp: `detalles.message_status` (sent|delivered|read|failed), `detalles.error_code`, `detalles.error_message`, `detalles.preview`

**Fuentes de datos (ya existentes)**
- Tabla `historial` (RLS por `usuario_id`).
- Escritura:
  - Job programado: inserta fila con estado inicial.
  - Webhooks: actualizan `estado` y `detalles` (Resend/ElevenLabs; Twilio cuando se integre).
- Todos los nuevos campos van en `historial.detalles` (JSONB).

**Filtros esenciales**
- Rango de fechas, Canal, Estado, Campaña, Búsqueda (RUT/email/teléfono).

**Métricas (encabezado de la página)**
- Totales por tipo (enviados, entregados/completados, fallidos) en el rango filtrado.
- Suma de `detalles.duracion` para llamadas.

**Consultas (UI)**
- Lista paginada (p. ej., 25 por página) ordenada por `fecha DESC`.
- Cargar `detalles` completo solo al abrir el modal.

**Seguridad y rendimiento**
- RLS ya activo; no exponer service keys en cliente.
- Índices ya existentes por `usuario_id` y `fecha` (suficiente para esta fase).

**Pruebas rápidas (E2E mínimo)**
1) Programación ejecutada por el job → fila "iniciado" visible.
2) Webhook Resend simulado → email "entregado" y `delivered_at` en `detalles`.
3) Webhook ElevenLabs simulado → llamada "completado" con `detalles.duracion`/`detalles.costo`.
4) Filtros combinados y paginación responden correctamente.

**Checklist de entrega**
- [x] Tabla con columnas definidas y paginación.
- [x] Filtros esenciales funcionando.
- [x] Modal de detalle con campos de `detalles` clave.
- [x] Métricas del rango filtrado.
- [x] Sin ofuscación de destino.
- [x] Sin cambios de esquema ni pérdida de funcionalidad.

**Elementos adicionales implementados (no en plan original)**
- [x] **Header de página** con título y subtítulo descriptivo
- [x] **Layout responsive** con Cards y espaciado consistente
- [x] **Filtros colapsables** con sección "Mostrar/Ocultar filtros avanzados"
- [x] **Chips de filtros activos** que muestran qué filtros están aplicados
- [x] **Debounce en búsqueda** para optimizar rendimiento
- [x] **Sincronización URL** - filtros se mantienen en la URL
- [x] **Estados de carga** con skeletons en tabla y modal
- [x] **Manejo de errores** consistente en toda la interfaz
- [x] **Badges con colores** para estados y canales
- [x] **Paginación mejorada** con selector de elementos por página
- [x] **Modal de detalle organizado** en Cards por secciones
- [x] **API endpoints** completos con rate limiting y RLS
- [x] **Tipado TypeScript** completo para todas las interfaces
- [x] **Layout inspirado en Deudores** para consistencia visual

**APIs implementadas**
- [x] `GET /api/historial` - Lista paginada con filtros
- [x] `GET /api/historial/[id]` - Detalle específico por ID
- [x] `GET /api/historial/metrics` - Métricas del rango filtrado

---

Notas
- Si luego se requiere filtrar por campos de `detalles` (p. ej., `message_status`), se podrán agregar columnas/índices opcionales más adelante; por ahora no es necesario.
- La implementación superó las expectativas del plan original, incluyendo mejoras de UX/UI y funcionalidades adicionales.
