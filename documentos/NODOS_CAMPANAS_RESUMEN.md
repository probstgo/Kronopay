# Nodos de Campañas - Resumen Ejecutivo

**Estado:** 📋 PROPUESTA - Versión concisa  
**Fecha:** Diciembre 2024

---

## 🎯 **PROBLEMA ACTUAL**

Los nodos actuales son básicos y no aprovechan:
- ❌ Base de datos completa (deudores, plantillas, agentes)
- ❌ APIs funcionales (emails, llamadas)
- ❌ Sistema de plantillas con variables
- ❌ Agentes de llamada configurados

---

## 🚀 **PROPUESTA: 6 NODOS MEJORADOS**

### **1. 📧 EMAIL**
**¿Qué hace?** Envía emails usando plantillas existentes
**Mejoras:**
- ✅ **Solo plantillas existentes** (dropdown obligatorio)
- ✅ **Variables automáticas desde plantilla**: Las variables `{{nombre}}`, `{{monto}}`, `{{fecha_vencimiento}}` están definidas en la plantilla y se reemplazan automáticamente
- ✅ **Sin contenido personalizado** (solo plantillas)
- ✅ **Sin configuración de variables en el nodo** (las variables se manejan desde la plantilla)
- ✅ **Preview de plantilla**: Botón "Ver Preview" para ver cómo se verá el email con variables reemplazadas antes de guardar
- ✅ **Filtrado mediante nodo FILTRO**: El filtrado de deudores se realiza mediante el nodo FILTRO dedicado (ver nodo FILTRO)
- ✅ Horarios inteligentes (solo días laborables)
- ✅ Usa API Resend existente

### **2. 📞 LLAMADA**
**¿Qué hace?** Realiza llamadas usando agentes ElevenLabs
**Mejoras:**
- ✅ **Solo agentes disponibles** (dropdown obligatorio)
- ✅ **Sin configuración personalizada** (solo agentes existentes)
- ✅ **Script del agente con variables dinámicas**: Las variables están definidas en el script del agente y se reemplazan automáticamente
- ✅ **Sin configuración de variables en el nodo** (las variables se manejan desde el script del agente)
- ✅ **Filtrado mediante nodo FILTRO**: El filtrado de deudores con teléfono se realiza mediante el nodo FILTRO dedicado (ver nodo FILTRO)
- ✅ Configura grabación y reintentos
- ✅ Usa API ElevenLabs existente

### **3. 🔀 CONDICIÓN**
**¿Qué hace?** Evalúa condiciones lógicas para dirigir el flujo
**Mejoras:**
- ✅ Condiciones reales de BD:
  - Estado de deuda (nueva, pendiente, pagado)
  - Monto de deuda (mayor que, menor que, entre)
  - Días vencidos (calculados automáticamente)
  - Historial (email enviado, llamada realizada)
- ✅ Operadores: igual, mayor, menor, entre, existe
- ✅ Lógica AND/OR para múltiples condiciones

### **4. ⏰ ESPERA**
**¿Qué hace?** Pausa la ejecución por tiempo determinado
**Mejoras:**
- ✅ Tipos: minutos, horas, días, semanas
- ✅ Opción "solo días laborables"
- ✅ Calcula automáticamente próxima ejecución
- ✅ Respeta zona horaria del usuario

### **5. 📱 SMS**
**¿Qué hace?** Envía SMS usando plantillas existentes
**Mejoras:**
- ✅ **Solo plantillas existentes** (dropdown obligatorio)
- ✅ **Variables automáticas desde plantilla**: Las variables `{{nombre}}`, `{{monto}}`, `{{fecha_vencimiento}}` están definidas en la plantilla y se reemplazan automáticamente
- ✅ **Sin contenido personalizado** (solo plantillas)
- ✅ **Sin configuración de variables en el nodo** (las variables se manejan desde la plantilla)
- ✅ **Preview de plantilla**: Botón "Ver Preview" para ver cómo se verá el SMS con variables reemplazadas antes de guardar
- ✅ **Filtrado mediante nodo FILTRO**: El filtrado de deudores con teléfono se realiza mediante el nodo FILTRO dedicado (ver nodo FILTRO)
- ✅ Horarios inteligentes (solo días laborables)
- ✅ Usa API Twilio existente

### **6. 🔍 FILTRO**
**¿Qué hace?** Filtra y segmenta deudores antes de continuar
**Mejoras:**
- ✅ **Nodo dedicado para filtrado**: Este nodo centraliza todo el filtrado de deudores para ser reutilizado en múltiples flujos
- ✅ **Implementación completa con lógica real de BD** (Diciembre 2024)
- ✅ Filtros por:
  - Estado de deuda (nueva, pendiente, vencida calculada, pagada)
  - Rango de monto (mínimo y máximo)
  - Días vencidos (mínimo y máximo)
  - Tipo de contacto (email, teléfono) - selección inteligente (preferido primero)
  - Historial de acciones (email enviado, llamada realizada, SMS enviado)
- ✅ Ordenamiento por monto, fecha, días vencidos (ascendente/descendente)
- ✅ Límite de resultados (opcional)
- ✅ **Contador dinámico de deudores**: Muestra en tiempo real cuántos deudores pasarán el filtro
- ✅ **Integración con BD**: Consulta real a la base de datos para calcular el contador y aplicar filtros
- ✅ **Optimizaciones**: Cálculo de días vencidos una sola vez, manejo de errores robusto

---

## ⚙️ **PROGRAMACIÓN AUTOMÁTICA**

**¿Cómo funciona?** La programación se maneja automáticamente con el cron job existente.

**Sistema de ejecución:**
- ✅ **Ejecución automática**: Cuando una campaña se guarda o se activa con estado "activo", se ejecuta automáticamente
- ✅ **Cron job diario** ejecuta todas las acciones programadas (configurado en `vercel.json`)
- ✅ **Cada nodo programa su acción** en la tabla `programaciones`:
  - **EMAIL/LLAMADA/SMS**: Programa envío inmediato o con horario específico
  - **ESPERA**: Calcula próxima fecha y programa siguiente acción
  - **CONDICIÓN**: Programa acciones según resultado (sí/no)
- ✅ **Cron job procesa** todas las programaciones pendientes todos los días
- ✅ **No se necesita nodo de programación** - la programación es automática
- ✅ **No hay botón "Ejecutar"** - la ejecución es automática cuando la campaña está activa

**Ejemplo de flujo:**
```
FILTRO → EMAIL → ESPERA(3 días) → LLAMADA
```
1. FILTRO selecciona deudores
2. EMAIL programa envío inmediato → se crea en `programaciones`
3. ESPERA calcula fecha + 3 días → programa siguiente acción
4. LLAMADA programa llamada para fecha calculada → se crea en `programaciones`
5. **Cron job ejecuta** todas las programaciones pendientes automáticamente

---

## 💡 **EJEMPLOS PRÁCTICOS**

### **Flujo 1: Cobranza Básica**
```
FILTRO → EMAIL → ESPERA(3 días) → LLAMADA
```
- Filtra deudores con deuda > $100
- Envía email con plantilla "Recordatorio"
- Espera 3 días laborables
- Realiza llamada con agente "Cobranza"

### **Flujo 2: Cobranza Inteligente**
```
FILTRO → CONDICIÓN → EMAIL/SMS/LLAMADA → ESPERA(1 semana) → FILTRO
```
- Filtra deudores vencidos > 30 días
- Si tiene email → Envía email con plantilla
- Si no tiene email pero tiene teléfono → Envía SMS con plantilla
- Si no tiene contacto → Realiza llamada con agente
- Espera 1 semana (programa automáticamente con cron job)
- Vuelve a filtrar para siguiente ciclo

---

## 🔧 **IMPLEMENTACIÓN TÉCNICA**

### **Integración con BD Existente**
```typescript
// Ejemplo: Nodo Email - Solo plantillas existentes
const { data: plantillas } = await supabase
  .from('plantillas')
  .select('*')
  .eq('tipo', 'email')
  .eq('usuario_id', usuarioId)

// Validar que se seleccionó plantilla
if (!configuracion.plantilla_id) {
  throw new Error('Debe seleccionar una plantilla de email')
}

const deudores = await supabase
  .from('deudores')
  .select('*, deudas(*), contactos(*)')
  .eq('usuario_id', usuarioId)
```

### **Integración con APIs Existentes**
```typescript
// Email usando Resend
// Las variables se reemplazan automáticamente desde la plantilla
await fetch('/api/send-email', {
  method: 'POST',
  body: JSON.stringify({
    to: deudor.email,
    subject: plantilla.asunto,
    message: procesarVariables(plantilla.contenido, deudor)
    // procesarVariables() reemplaza automáticamente {{nombre}}, {{monto}}, etc.
  })
})

// Llamada usando ElevenLabs - Solo agentes disponibles
const { data: agentes } = await supabase
  .from('agentes')
  .select('*')
  .eq('activo', true)
  .eq('usuario_id', usuarioId)

// Validar que se seleccionó agente
if (!configuracion.agente_id) {
  throw new Error('Debe seleccionar un agente de llamada')
}

// Las variables dinámicas se pasan al agente desde el script del agente
await fetch('/api/elevenlabs/call', {
  method: 'POST',
  body: JSON.stringify({
    agentId: agente.agent_id,
    toNumber: deudor.telefono,
    dynamicVariables: {
      nombre_deudor: deudor.nombre,
      monto: deudor.monto,
      fecha_vencimiento: deudor.fecha_vencimiento
    }
  })
})

// SMS usando Twilio - Solo plantillas existentes
const { data: plantillasSMS } = await supabase
  .from('plantillas')
  .select('*')
  .eq('tipo', 'sms')
  .eq('usuario_id', usuarioId)

// Validar que se seleccionó plantilla
if (!configuracion.plantilla_id) {
  throw new Error('Debe seleccionar una plantilla de SMS')
}

// Las variables se reemplazan automáticamente desde la plantilla
await fetch('/api/send-sms', {
  method: 'POST',
  body: JSON.stringify({
    to: deudor.telefono,
    message: procesarVariables(plantilla.contenido, deudor)
    // procesarVariables() reemplaza automáticamente {{nombre}}, {{monto}}, etc.
  })
})
```

---

## 📊 **VENTAJAS**

### **Para el Usuario**
- ✅ **Configuración visual** sin código
- ✅ **Aprovecha datos existentes** (plantillas, agentes, deudores)
- ✅ **Automatización inteligente** con filtros y condiciones
- ✅ **Integración completa** con todas las funcionalidades

### **Para el Desarrollo**
- ✅ **Reutiliza código existente** (APIs, BD, componentes)
- ✅ **Mantiene funcionalidad actual** sin pérdidas
- ✅ **Escalable** y fácil de mantener
- ✅ **Consistente** con el resto de la aplicación

---

## 🎯 **PLAN DE IMPLEMENTACIÓN**

### **Fase 1: Nodos Básicos (1 semana)**
1. ✅ Mejorar nodo Email con plantillas y filtros
2. ✅ Mejorar nodo Llamada con agentes y scripts
3. ✅ Mejorar nodo Condición con datos reales de BD

### **Fase 2: Nodos Avanzados (1 semana)**
1. ✅ Implementar nodo Filtro de Deudores
2. ✅ Mejorar nodo Espera con opciones inteligentes
3. ✅ Integrar programación automática con cron job existente

### **Fase 3: Integración Completa (1 semana)**
1. ✅ Integrar con sistema de ejecución existente
2. ✅ Testing y optimización
3. ✅ Documentación

---

## ✅ **CHECKLIST DE DECISIÓN**

### **¿Estás de acuerdo con:**
- [ ] **Nodo Email** mejorado con plantillas y filtros
- [ ] **Nodo Llamada** mejorado con agentes y scripts
- [ ] **Nodo SMS** mejorado con plantillas y filtros
- [ ] **Nodo Condición** con datos reales de BD
- [ ] **Nodo Espera** con opciones inteligentes
- [ ] **Nodo Filtro** para segmentar deudores
- [ ] **Programación automática** con cron job existente (sin nodo adicional)

### **¿Quieres que implemente:**
- [ ] **Todos los nodos** según el plan
- [ ] **Solo algunos nodos** específicos
- [ ] **Modificar** algún nodo en particular
- [ ] **Agregar** algún nodo adicional

---

## ❓ **PREGUNTA CLAVE**

**¿Te parece bien esta propuesta? ¿Hay algún nodo que quieras modificar o algún aspecto específico que quieras que profundice?**

---

**✅ ESTADO:** 🚀 TODAS LAS FASES COMPLETADAS  
**Fase 1:** ✅ Nodos básicos mejorados  
**Fase 2:** ✅ Nodo Filtro implementado  
**Fase 3:** ✅ Integración con programación automática  
**Fase 4:** ✅ Validaciones y mejoras de UX  
**Fase 4.1:** ✅ Implementación completa del nodo FILTRO con lógica real de BD (Diciembre 2024)  
**Fecha:** Diciembre 2024

---

## 📝 **NOTAS IMPORTANTES**

### **Variables Dinámicas**
- ✅ Las variables dinámicas (`{{nombre}}`, `{{monto}}`, `{{fecha_vencimiento}}`, etc.) **se definen en las plantillas**, no en los nodos
- ✅ Los nodos **solo seleccionan** la plantilla/agente y configuran opciones avanzadas (horarios, reintentos)
- ✅ Durante la ejecución, el sistema **reemplaza automáticamente** todas las variables encontradas en la plantilla con los datos del deudor
- ✅ **No se necesita configurar variables en el nodo** - esto simplifica la configuración y evita redundancia

### **Preview de Plantillas**
- ✅ Los nodos **Email** y **SMS** incluyen un botón "Ver Preview" que aparece cuando se selecciona una plantilla
- ✅ El preview muestra cómo se verá el mensaje con las variables reemplazadas usando datos de ejemplo
- ✅ Para **Email**: Muestra asunto, remitente, destinatario y contenido completo (soporta HTML y texto)
- ✅ Para **SMS**: Muestra destinatario y contenido con contador de caracteres
- ✅ Permite verificar la plantilla antes de guardar la configuración del nodo

### **Filtrado de Deudores**
- ✅ **El filtrado se realiza mediante el nodo FILTRO dedicado**, no dentro de cada nodo individual (EMAIL, LLAMADA, SMS)
- ✅ **Ventajas de este diseño:**
  - **Reutilización**: Los filtros se pueden reutilizar en múltiples nodos
  - **Flexibilidad**: Permite crear flujos complejos con filtros compartidos
  - **Separación de responsabilidades**: Los nodos de acción se enfocan en ejecutar acciones, el nodo FILTRO se enfoca en segmentar
  - **Eficiencia**: Un solo nodo FILTRO puede alimentar múltiples nodos de acción
- ✅ **Ejemplo de uso:**
  ```
  FILTRO (deudores con email) → EMAIL
  FILTRO (deudores con teléfono) → LLAMADA
  FILTRO (deudores vencidos > 30 días) → SMS → ESPERA → LLAMADA
  ```

### **Validaciones y Mejoras de UX**
- ✅ **Validaciones implementadas:**
  - Email y SMS: Validan que se seleccione una plantilla antes de guardar
  - Llamada: Valida que se seleccione un agente antes de guardar
  - Todos los formularios validan que existan opciones disponibles
- ✅ **Mensajes de error claros:**
  - Mensajes específicos y accionables
  - Diseño visual destacado (fondo rojo claro, borde)
  - Ubicación visible en el formulario
- ✅ **Feedback visual mejorado:**
  - Botones deshabilitados cuando falta información
  - Mensajes en el botón indicando qué falta
  - Estados visuales claros (habilitado/deshabilitado)
  - Transiciones suaves en cambios de estado
- ✅ **Contador dinámico de deudores:**
  - Cálculo en tiempo real con debounce (500ms)
  - Indicador de carga con spinner animado
  - Muestra número grande y claro
  - Indica si se aplicó el límite de resultados
  - Mensaje cuando no hay filtros configurados
