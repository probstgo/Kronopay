# Plan de Implementación - Sección de Campañas (Journey Builder)

**Estado:** Plan de Implementación - Listo para Desarrollo  
**Prioridad:** Alta  
**Fecha de Análisis:** Diciembre 2024  
**Última Actualización:** Diciembre 2024

---

## 📋 Resumen Ejecutivo

### 🎯 **Objetivo Principal**
Crear un sistema de campañas con **Journey Builder visual** similar a N8N, pero especializado en **automatización de cobranza**. Los usuarios podrán crear flujos de trabajo arrastrando y conectando nodos para automatizar el proceso de cobranza.

### ✅ **Estado Actual**
- **Base de datos**: Tablas de campañas ya implementadas
- **Módulos base**: Deudores, Plantillas y Teléfono/Agentes completos
- **Backend**: Job programado y webhooks funcionando
- **Página campañas**: Solo placeholder básico

### 🚀 **Funcionalidades a Implementar**
- ✅ **Journey Builder Visual**: Editor drag & drop tipo N8N
- ✅ **Nodos Especializados**: Email, Llamada, SMS, WhatsApp, Espera, Condición
- ✅ **Programación Avanzada**: Inmediata, programada, recurrente
- ✅ **Integración Completa**: Con plantillas, deudores y agentes existentes
- ✅ **Motor de Ejecución**: Sistema robusto paso a paso
- ✅ **Estadísticas en Tiempo Real**: Métricas de rendimiento por campaña

---

## 🔍 Análisis de N8N para Contexto de Cobranza

### **Conceptos Clave de N8N que Adaptamos**

#### **1. Workflow Canvas**
- **Canvas infinito**: Espacio libre para crear flujos complejos
- **Zoom y pan**: Navegación fluida en flujos grandes
- **Grid snap**: Alineación automática de nodos
- **Minimap**: Vista general del flujo completo

#### **2. Node System**
- **Paleta de nodos**: Categorías organizadas por funcionalidad
- **Drag & Drop**: Arrastrar nodos al canvas
- **Conexiones**: Líneas que conectan nodos (trigger → action)
- **Configuración**: Panel lateral para configurar cada nodo

#### **3. Execution Engine**
- **Paso a paso**: Ejecuta nodo por nodo
- **Contexto de datos**: Variables disponibles en cada paso
- **Manejo de errores**: Retry, fallback, timeout
- **Logs detallados**: Seguimiento completo de ejecución

---

## 🏗️ Arquitectura del Sistema

### **Base de Datos (Extensiones Necesarias)**

```sql
-- Tabla principal para workflows de cobranza
CREATE TABLE workflows_cobranza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  canvas_data JSONB NOT NULL, -- Datos del canvas (nodos, conexiones, posición)
  configuracion JSONB NOT NULL, -- Configuración global del workflow
  estado VARCHAR(50) DEFAULT 'borrador', -- borrador, activo, pausado, archivado
  version INTEGER DEFAULT 1,
  creado_at TIMESTAMP DEFAULT NOW(),
  actualizado_at TIMESTAMP DEFAULT NOW(),
  ejecutado_at TIMESTAMP
);

-- Tabla para ejecuciones individuales de workflow
CREATE TABLE ejecuciones_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows_cobranza(id) ON DELETE CASCADE,
  deudor_id UUID REFERENCES deudores(id) ON DELETE CASCADE,
  estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, ejecutando, completado, fallido, pausado
  paso_actual INTEGER DEFAULT 0,
  contexto_datos JSONB DEFAULT '{}', -- Variables y datos del contexto
  resultado_final JSONB, -- Resultado final de la ejecución
  iniciado_at TIMESTAMP DEFAULT NOW(),
  completado_at TIMESTAMP,
  proxima_ejecucion TIMESTAMP -- Para workflows programados
);

-- Tabla para logs detallados de ejecución
CREATE TABLE logs_ejecucion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ejecucion_id UUID REFERENCES ejecuciones_workflow(id) ON DELETE CASCADE,
  nodo_id VARCHAR(100) NOT NULL,
  paso_numero INTEGER NOT NULL,
  tipo_accion VARCHAR(50) NOT NULL, -- email, llamada, sms, espera, condicion
  estado VARCHAR(50) NOT NULL, -- iniciado, completado, fallido, saltado
  datos_entrada JSONB,
  datos_salida JSONB,
  error_message TEXT,
  duracion_ms INTEGER,
  ejecutado_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para programaciones de workflows
CREATE TABLE programaciones_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows_cobranza(id) ON DELETE CASCADE,
  tipo_programacion VARCHAR(50) NOT NULL, -- inmediata, programada, recurrente
  configuracion JSONB NOT NULL, -- Fecha, hora, frecuencia, etc.
  estado VARCHAR(50) DEFAULT 'activa', -- activa, pausada, completada
  proxima_ejecucion TIMESTAMP,
  creado_at TIMESTAMP DEFAULT NOW()
);
```

### **Estructura de Archivos**

```
src/app/campanas/
├── page.tsx                           # Dashboard principal de campañas
├── nueva/
│   └── page.tsx                      # Journey Builder (editor principal)
├── [id]/
│   ├── page.tsx                      # Editar workflow existente
│   ├── ejecutar/
│   │   └── page.tsx                  # Ejecutar workflow manualmente
│   ├── estadisticas/
│   │   └── page.tsx                  # Estadísticas y métricas
│   └── logs/
│       └── page.tsx                  # Logs detallados de ejecución
└── components/
    ├── JourneyBuilder.tsx            # Componente principal del editor
    ├── Canvas.tsx                    # Canvas infinito con zoom/pan
    ├── NodePalette.tsx               # Paleta de nodos disponibles
    ├── NodeConfigPanel.tsx           # Panel de configuración de nodos
    ├── Minimap.tsx                   # Vista minimizada del workflow
    ├── ExecutionPanel.tsx            # Panel de ejecución y logs
    ├── nodes/
    │   ├── BaseNode.tsx              # Componente base para todos los nodos
    │   ├── TriggerNode.tsx           # Nodo de inicio (trigger)
    │   ├── EmailNode.tsx             # Nodo de envío de email
    │   ├── LlamadaNode.tsx           # Nodo de llamada telefónica
    │   ├── SMSNode.tsx               # Nodo de envío SMS
    │   ├── WhatsAppNode.tsx          # Nodo de envío WhatsApp
    │   ├── EsperaNode.tsx            # Nodo de espera/pausa
    │   ├── CondicionNode.tsx         # Nodo de condición lógica
    │   ├── EstadisticaNode.tsx       # Nodo de estadísticas
    │   └── FinalNode.tsx             # Nodo de finalización
    ├── connections/
    │   ├── Connection.tsx             # Línea de conexión entre nodos
    │   └── ConnectionHandle.tsx       # Puntos de conexión en nodos
    ├── execution/
    │   ├── ExecutionEngine.tsx       # Motor de ejecución
    │   ├── ExecutionContext.tsx      # Contexto de datos durante ejecución
    │   └── RetryLogic.tsx             # Lógica de reintentos
    └── scheduling/
        ├── ProgramacionPanel.tsx      # Configuración de programación
        ├── HorariosTrabajo.tsx       # Configuración de horarios
        └── RecurrenciaConfig.tsx     # Configuración de recurrencia
```

---

## 🎨 Interfaz del Journey Builder

### **Layout Principal (Similar a N8N)**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [💾 Guardar] [▶️ Ejecutar] [⏰ Programar] [📊 Estadísticas] [❓ Ayuda]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   📧 EMAIL      │    │   📞 LLAMADA    │    │   📱 SMS        │         │
│  │                 │    │                 │    │                 │         │
│  │ Plantilla: A    │───▶│ Agente: Global  │───▶│ Texto: Corto   │         │
│  │ Asunto: Record. │    │ Script: Default │    │ Plantilla: B    │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│           │                       │                       │                │
│           ▼                       ▼                       ▼                │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   ⏰ ESPERA     │    │   🔀 CONDICIÓN  │    │   📊 ESTADÍSTICA│         │
│  │                 │    │                 │    │                 │         │
│  │ Duración: 2d    │    │ Si: No responde│    │ Contar: Emails  │         │
│  │ Solo laborables │    │ Entonces: Llamar│    │ Agrupar: Por día│         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Deudores: [Seleccionar 15] | Programación: [Inmediata ▼] | Estado: [Activo]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### **Panel de Configuración de Nodos**

```
┌─────────────────────────────────────┐
│ 📧 Configuración de Email          │
├─────────────────────────────────────┤
│ Plantilla: [Plantilla Recordatorio ▼]│
│ Asunto: [Personalizado]             │
│ Variables: {{nombre}}, {{monto}}   │
│                                     │
│ ⚙️ Configuración Avanzada          │
│ ☑️ Solo días laborables            │
│ ☑️ Respetar horario de trabajo      │
│ ☑️ Reintentos: [3] veces           │
│                                     │
│ 🔗 Conexiones:                     │
│ ├─ Si éxito: [Llamada]             │
│ ├─ Si falla: [SMS]                │
│ └─ Si timeout: [Espera]           │
└─────────────────────────────────────┘
```

---

## 🔧 Tipos de Nodos Especializados

### **1. Nodo Trigger (Inicio)**
```typescript
interface TriggerNode {
  tipo: 'trigger'
  configuracion: {
    nombre: string
    descripcion: string
    activacion: 'manual' | 'programada' | 'evento'
    deudores_seleccionados: string[] // IDs de deudores
    filtros_adicionales?: {
      monto_minimo?: number
      dias_vencido?: number
      estado_deuda?: string[]
    }
  }
}
```

### **2. Nodo Email**
```typescript
interface EmailNode {
  tipo: 'email'
  configuracion: {
    plantilla_id: string
    asunto_personalizado?: string
    variables_dinamicas: {
      nombre: boolean
      monto: boolean
      fecha_vencimiento: boolean
      empresa: boolean
    }
    configuracion_avanzada: {
      solo_dias_laborables: boolean
      horario_trabajo: { inicio: string, fin: string }
      reintentos: number
      timeout_minutos: number
    }
    conexiones: {
      si_exito: string // ID del siguiente nodo
      si_falla: string
      si_timeout: string
    }
  }
}
```

### **3. Nodo Llamada**
```typescript
interface LlamadaNode {
  tipo: 'llamada'
  configuracion: {
    agente_id: string
    script_personalizado?: string
    variables_dinamicas: {
      nombre: boolean
      monto: boolean
      fecha_vencimiento: boolean
    }
    configuracion_avanzada: {
      horario_llamadas: { inicio: string, fin: string }
      reintentos: number
      tiempo_entre_reintentos: number // minutos
      grabar_conversacion: boolean
    }
    conexiones: {
      si_contesta: string
      si_no_contesta: string
      si_ocupado: string
      si_falla: string
    }
  }
}
```

### **4. Nodo Espera**
```typescript
interface EsperaNode {
  tipo: 'espera'
  configuracion: {
    duracion: {
      tipo: 'minutos' | 'horas' | 'dias' | 'semanas'
      cantidad: number
    }
    configuracion_avanzada: {
      solo_dias_laborables: boolean
      excluir_fines_semana: boolean
      excluir_feriados: boolean
      zona_horaria: string
    }
    conexiones: {
      siguiente_paso: string
    }
  }
}
```

### **5. Nodo Condición**
```typescript
interface CondicionNode {
  tipo: 'condicion'
  configuracion: {
    condiciones: Array<{
      campo: 'respuesta_email' | 'contesto_llamada' | 'monto_deuda' | 'dias_vencido'
      operador: 'igual' | 'mayor' | 'menor' | 'contiene' | 'no_contiene'
      valor: string | number
      logica: 'AND' | 'OR'
    }>
    conexiones: {
      si_verdadero: string
      si_falso: string
    }
  }
}
```

### **6. Nodo Estadística**
```typescript
interface EstadisticaNode {
  tipo: 'estadistica'
  configuracion: {
    tipo_estadistica: 'contar' | 'sumar' | 'promedio' | 'agrupar'
    campo: 'emails_enviados' | 'llamadas_realizadas' | 'respuestas_recibidas'
    agrupacion?: 'por_dia' | 'por_semana' | 'por_mes' | 'por_deudor'
    guardar_resultado: boolean
    conexiones: {
      siguiente_paso: string
    }
  }
}
```

---

## ⚙️ Motor de Ejecución

### **Flujo de Ejecución Paso a Paso**

```typescript
class ExecutionEngine {
  async ejecutarWorkflow(workflowId: string, deudorIds: string[]) {
    // 1. Cargar configuración del workflow
    const workflow = await this.cargarWorkflow(workflowId)
    
    // 2. Crear ejecuciones individuales para cada deudor
    for (const deudorId of deudorIds) {
      await this.crearEjecucion(workflowId, deudorId)
    }
    
    // 3. Procesar ejecuciones según programación
    await this.procesarEjecuciones(workflowId)
  }
  
  async procesarEjecucion(ejecucionId: string) {
    const ejecucion = await this.cargarEjecucion(ejecucionId)
    const workflow = await this.cargarWorkflow(ejecucion.workflow_id)
    
    // Obtener nodo actual
    const nodoActual = this.obtenerNodoActual(workflow.canvas_data, ejecucion.paso_actual)
    
    // Ejecutar nodo según su tipo
    const resultado = await this.ejecutarNodo(nodoActual, ejecucion.contexto_datos)
    
    // Actualizar contexto y avanzar al siguiente paso
    await this.actualizarEjecucion(ejecucionId, resultado)
    
    // Programar siguiente ejecución si es necesario
    if (resultado.siguiente_nodo) {
      await this.programarSiguienteEjecucion(ejecucionId, resultado.siguiente_nodo)
    }
  }
}
```

### **Sistema de Contexto de Datos**

```typescript
interface ExecutionContext {
  deudor: {
    id: string
    nombre: string
    rut: string
    email?: string
    telefono?: string
  }
  deudas: Array<{
    id: string
    monto: number
    fecha_vencimiento: string
    estado: string
  }>
  historial_acciones: Array<{
    tipo: string
    fecha: string
    resultado: string
    detalles: any
  }>
  variables_workflow: Record<string, any> // Variables personalizadas
  estadisticas: {
    emails_enviados: number
    llamadas_realizadas: number
    respuestas_recibidas: number
    pagos_realizados: number
  }
}
```

---

## 📊 Sistema de Programación Avanzada

### **Tipos de Programación**

#### **1. Ejecución Inmediata**
```typescript
interface ProgramacionInmediata {
  tipo: 'inmediata'
  configuracion: {
    ejecutar_ahora: true
    max_concurrente: number // Máximo de ejecuciones simultáneas
  }
}
```

#### **2. Programación Específica**
```typescript
interface ProgramacionEspecifica {
  tipo: 'programada'
  configuracion: {
    fecha: string // YYYY-MM-DD
    hora: string // HH:MM
    zona_horaria: string
    solo_dias_laborables: boolean
  }
}
```

#### **3. Programación Recurrente**
```typescript
interface ProgramacionRecurrente {
  tipo: 'recurrente'
  configuracion: {
    frecuencia: 'diaria' | 'semanal' | 'mensual'
    intervalo: number // Cada X días/semanas/meses
    dias_semana?: number[] // [1,2,3,4,5] para lunes a viernes
    dia_mes?: number // Para frecuencia mensual
    hora_ejecucion: string
    zona_horaria: string
    fecha_fin?: string // Opcional
  }
}
```

### **Sistema de Horarios de Trabajo**

```typescript
interface HorariosTrabajo {
  dias_laborables: {
    lunes: { inicio: string, fin: string, activo: boolean }
    martes: { inicio: string, fin: string, activo: boolean }
    miercoles: { inicio: string, fin: string, activo: boolean }
    jueves: { inicio: string, fin: string, activo: boolean }
    viernes: { inicio: string, fin: string, activo: boolean }
    sabado: { inicio: string, fin: string, activo: boolean }
    domingo: { inicio: string, fin: string, activo: boolean }
  }
  feriados: string[] // Fechas en formato YYYY-MM-DD
  zona_horaria: string
  respetar_horarios: boolean
}
```

---

## 📈 Sistema de Estadísticas y Métricas

### **Métricas por Workflow**

```typescript
interface MetricasWorkflow {
  ejecuciones: {
    total: number
    completadas: number
    fallidas: number
    en_progreso: number
    pausadas: number
  }
  nodos: {
    [nodoId: string]: {
      ejecutado: number
      exitoso: number
      fallido: number
      tiempo_promedio_ms: number
    }
  }
  deudores: {
    total_procesados: number
    con_respuesta: number
    con_pago: number
    tasa_conversion: number
  }
  tiempo: {
    tiempo_promedio_ejecucion: number // minutos
    tiempo_total_ejecucion: number // minutos
    fecha_primera_ejecucion: string
    fecha_ultima_ejecucion: string
  }
}
```

### **Dashboard de Estadísticas**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 Estadísticas del Workflow: "Cobranza Inteligente"                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📈 Resumen General                    📊 Rendimiento por Nodo             │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐   │
│  │ Ejecuciones: 1,247              │   │ 📧 Email: 98.5% éxito          │   │
│  │ Completadas: 1,198 (96.1%)      │   │ 📞 Llamada: 87.2% éxito        │   │
│  │ Fallidas: 49 (3.9%)             │   │ 📱 SMS: 94.8% éxito            │   │
│  │ Tiempo promedio: 2.3 días       │   │ ⏰ Espera: 100% éxito          │   │
│  └─────────────────────────────────┘   └─────────────────────────────────┘   │
│                                                                             │
│  💰 Resultados de Cobranza              ⏱️ Tiempo de Respuesta             │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐   │
│  │ Deudores procesados: 1,247      │   │ Email: 2.3 horas promedio      │   │
│  │ Con respuesta: 892 (71.5%)       │   │ Llamada: 15 minutos promedio   │   │
│  │ Con pago: 234 (18.8%)           │   │ SMS: 45 minutos promedio       │   │
│  │ Monto recuperado: $45,678,900    │   │ WhatsApp: 1.2 horas promedio  │   │
│  └─────────────────────────────────┘   └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Plan de Implementación por Fases

### **Fase 1: Base del Journey Builder (Semana 1)**

#### **Objetivos:**
- Crear estructura de base de datos
- Implementar canvas básico con drag & drop
- Nodos básicos: Trigger, Email, Espera
- Sistema de guardar/cargar workflows

#### **Tareas:**
- [ ] Crear tablas de BD para workflows
- [ ] Implementar JourneyBuilder.tsx principal
- [ ] Crear Canvas.tsx con zoom/pan básico
- [ ] Implementar NodePalette.tsx
- [ ] Crear BaseNode.tsx y nodos básicos
- [ ] Sistema de conexiones entre nodos
- [ ] Panel de configuración de nodos
- [ ] Guardar/cargar workflows en BD

#### **Entregables:**
- Canvas funcional con drag & drop
- 3 nodos básicos funcionando
- Sistema de persistencia
- Interfaz básica de configuración

---

### **Fase 2: Motor de Ejecución (Semana 2)**

#### **Objetivos:**
- Sistema de ejecución paso a paso
- Integración con job programado existente
- Manejo de contexto de datos
- Logs básicos de ejecución

#### **Tareas:**
- [ ] Implementar ExecutionEngine.tsx
- [ ] Crear ExecutionContext.tsx
- [ ] Integrar con job programado existente
- [ ] Sistema de logs básicos
- [ ] Manejo de errores y reintentos
- [ ] Programación inmediata
- [ ] Testing de ejecución básica

#### **Entregables:**
- Motor de ejecución funcional
- Integración con sistema existente
- Logs de ejecución
- Manejo básico de errores

---

### **Fase 3: Nodos Avanzados (Semana 3)**

#### **Objetivos:**
- Completar todos los tipos de nodos
- Programación avanzada
- Condiciones complejas
- Estadísticas básicas

#### **Tareas:**
- [ ] Implementar LlamadaNode.tsx
- [ ] Implementar SMSNode.tsx
- [ ] Implementar WhatsAppNode.tsx
- [ ] Implementar CondicionNode.tsx
- [ ] Implementar EstadisticaNode.tsx
- [ ] Sistema de programación avanzada
- [ ] Horarios de trabajo
- [ ] Recurrencia

#### **Entregables:**
- Todos los nodos implementados
- Programación avanzada funcional
- Sistema de condiciones
- Estadísticas básicas

---

### **Fase 4: Optimización y UX (Semana 4)**

#### **Objetivos:**
- Mejorar interfaz de usuario
- Optimizar rendimiento
- Testing completo
- Documentación

#### **Tareas:**
- [ ] Minimap.tsx
- [ ] Mejoras de UX en canvas
- [ ] Optimización de rendimiento
- [ ] Testing exhaustivo
- [ ] Documentación de uso
- [ ] Validaciones avanzadas
- [ ] Sistema de ayuda

#### **Entregables:**
- Interfaz pulida y profesional
- Rendimiento optimizado
- Testing completo
- Documentación de usuario

---

## 🔧 Integración con Módulos Existentes

### **Con Plantillas**
```typescript
// En EmailNode.tsx
const plantillasDisponibles = await supabase
  .from('plantillas')
  .select('*')
  .eq('usuario_id', userId)
  .eq('tipo', 'email')
  .eq('activo', true)
```

### **Con Deudores**
```typescript
// En TriggerNode.tsx
const deudoresDisponibles = await supabase
  .from('deudores')
  .select(`
    *,
    contactos(*),
    deudas(*)
  `)
  .eq('usuario_id', userId)
```

### **Con Agentes de Llamada**
```typescript
// En LlamadaNode.tsx
const agentesDisponibles = await supabase
  .from('llamada_agente')
  .select('*')
  .or(`usuario_id.eq.${userId},usuario_id.is.null`) // Agentes globales y del usuario
```

### **Con Historial Existente**
```typescript
// En ExecutionEngine.tsx
const historialExistente = await supabase
  .from('historial_acciones')
  .select('*')
  .eq('deudor_id', deudorId)
  .order('fecha_accion', { ascending: false })
```

---

## 📋 Checklist de Implementación

### **Fase 1: Base del Journey Builder**
- [ ] Crear tablas de BD para workflows
- [ ] Implementar JourneyBuilder.tsx
- [ ] Crear Canvas.tsx con zoom/pan
- [ ] Implementar NodePalette.tsx
- [ ] Crear BaseNode.tsx
- [ ] Sistema de conexiones
- [ ] Panel de configuración
- [ ] Guardar/cargar workflows

### **Fase 2: Motor de Ejecución**
- [ ] ExecutionEngine.tsx
- [ ] ExecutionContext.tsx
- [ ] Integración con job programado
- [ ] Sistema de logs
- [ ] Manejo de errores
- [ ] Programación inmediata
- [ ] Testing básico

### **Fase 3: Nodos Avanzados**
- [ ] LlamadaNode.tsx
- [ ] SMSNode.tsx
- [ ] WhatsAppNode.tsx
- [ ] CondicionNode.tsx
- [ ] EstadisticaNode.tsx
- [ ] Programación avanzada
- [ ] Horarios de trabajo
- [ ] Recurrencia

### **Fase 4: Optimización**
- [ ] Minimap.tsx
- [ ] Mejoras de UX
- [ ] Optimización rendimiento
- [ ] Testing exhaustivo
- [ ] Documentación
- [ ] Validaciones
- [ ] Sistema de ayuda

---

## 🎯 Métricas de Éxito

### **Funcionalidad**
- **Canvas Responsivo**: Funciona en móvil y desktop
- **Drag & Drop Fluido**: Sin lag en interacciones
- **Persistencia Confiable**: Guardar/cargar sin pérdida de datos
- **Ejecución Robusta**: Manejo de errores y reintentos

### **Rendimiento**
- **Tiempo de Carga**: < 2 segundos para workflows complejos
- **Ejecución**: < 1 segundo por nodo
- **Memoria**: Uso eficiente con workflows grandes
- **Escalabilidad**: Funciona con 1000+ deudores

### **UX**
- **Intuitivo**: Usuarios pueden crear workflows sin capacitación
- **Consistente**: Sigue patrones de N8N conocidos
- **Accesible**: Cumple estándares básicos
- **Profesional**: Interfaz pulida y moderna

---

## 🚀 Próximos Pasos

### **Inmediato**
1. **Revisar** este plan con el equipo
2. **Aprobar** las fases de implementación
3. **Asignar** responsabilidades
4. **Configurar** entorno de desarrollo

### **Esta Semana**
1. **Empezar** Fase 1 (Base del Journey Builder)
2. **Crear** estructura de base de datos
3. **Implementar** canvas básico
4. **Testing** de funcionalidades básicas

### **Próxima Semana**
1. **Completar** Fase 2 (Motor de Ejecución)
2. **Implementar** nodos avanzados
3. **Testing** de ejecución
4. **Documentación** inicial

---

## 📞 Contacto y Soporte

**Desarrollador Principal:** Santiago Álvarez del Río  
**Estado:** Listo para Implementación  
**Fecha:** Diciembre 2024

---

## 🎯 Conclusión

Este plan implementa un **sistema de campañas completo** con **Journey Builder visual** similar a N8N, pero especializado en **automatización de cobranza**. 

### **Ventajas del Enfoque:**
- ✅ **Familiar**: Interfaz similar a N8N conocida por usuarios
- ✅ **Especializado**: Nodos específicos para cobranza
- ✅ **Integrado**: Aprovecha todos los módulos existentes
- ✅ **Escalable**: Fácil agregar nuevos tipos de nodos
- ✅ **Robusto**: Manejo de errores y programación avanzada

### **Resultado Final:**
Un sistema donde los usuarios pueden crear **flujos de cobranza complejos** arrastrando nodos, programar ejecuciones avanzadas, y obtener **estadísticas detalladas** de rendimiento, todo integrado perfectamente con los módulos de deudores, plantillas y teléfono ya implementados.

---

**Nota:** Este plan está diseñado para aprovechar al máximo la infraestructura existente y proporcionar una experiencia de usuario familiar y potente para la automatización de cobranza.
