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
- ✅ Variables automáticas: `{{nombre}}`, `{{monto}}`, `{{fecha_vencimiento}}`
- ✅ **Sin contenido personalizado** (solo plantillas)
- ✅ Filtra deudores por estado, monto, días vencidos
- ✅ Horarios inteligentes (solo días laborables)
- ✅ Usa API Resend existente

### **2. 📞 LLAMADA**
**¿Qué hace?** Realiza llamadas usando agentes ElevenLabs
**Mejoras:**
- ✅ **Solo agentes disponibles** (dropdown obligatorio)
- ✅ **Sin configuración personalizada** (solo agentes existentes)
- ✅ Script del agente con variables dinámicas
- ✅ Filtra deudores con teléfono disponible
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
- ✅ Variables automáticas: `{{nombre}}`, `{{monto}}`, `{{fecha_vencimiento}}`
- ✅ **Sin contenido personalizado** (solo plantillas)
- ✅ Filtra deudores con teléfono disponible
- ✅ Horarios inteligentes (solo días laborables)
- ✅ Usa API Twilio existente

### **6. 🔍 FILTRO**
**¿Qué hace?** Filtra y segmenta deudores antes de continuar
**Mejoras:**
- ✅ Filtros por:
  - Estado de deuda
  - Rango de monto
  - Días vencidos
  - Tipo de contacto (email, teléfono)
  - Historial de acciones
- ✅ Ordenamiento por monto, fecha, días vencidos
- ✅ Límite de resultados
- ✅ Contador dinámico de deudores

### **7. 📅 PROGRAMACIÓN**
**¿Qué hace?** Programa ejecución en fechas/horarios específicos
**Mejoras:**
- ✅ Tipos: inmediata, programada, recurrente
- ✅ Recurrencia: diaria, semanal, mensual
- ✅ Solo días laborables
- ✅ Integra con cron job existente

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
FILTRO → CONDICIÓN → EMAIL/SMS/LLAMADA → PROGRAMACIÓN
```
- Filtra deudores vencidos > 30 días
- Si tiene email → Envía email con plantilla
- Si no tiene email pero tiene teléfono → Envía SMS con plantilla
- Si no tiene contacto → Realiza llamada con agente
- Programa próxima ejecución en 1 semana

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
await fetch('/api/send-email', {
  method: 'POST',
  body: JSON.stringify({
    to: deudor.email,
    subject: plantilla.asunto,
    message: procesarVariables(plantilla.contenido, deudor)
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

await fetch('/api/elevenlabs/call', {
  method: 'POST',
  body: JSON.stringify({
    agentId: agente.agent_id,
    toNumber: deudor.telefono
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

await fetch('/api/send-sms', {
  method: 'POST',
  body: JSON.stringify({
    to: deudor.telefono,
    message: procesarVariables(plantilla.contenido, deudor)
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
2. ✅ Implementar nodo Programación
3. ✅ Mejorar nodo Espera con opciones inteligentes

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
- [ ] **Nodo Programación** para ejecutar en fechas específicas

### **¿Quieres que implemente:**
- [ ] **Todos los nodos** según el plan
- [ ] **Solo algunos nodos** específicos
- [ ] **Modificar** algún nodo en particular
- [ ] **Agregar** algún nodo adicional

---

## ❓ **PREGUNTA CLAVE**

**¿Te parece bien esta propuesta? ¿Hay algún nodo que quieras modificar o algún aspecto específico que quieras que profundice?**

---

**✅ ESTADO:** 📋 PROPUESTA - Versión concisa para decisión  
**Próximo:** Implementación según tu aprobación  
**Fecha:** Diciembre 2024
