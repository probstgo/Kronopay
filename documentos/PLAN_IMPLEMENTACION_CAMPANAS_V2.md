# Plan de Implementación V2 - Sección de Campañas (Journey Builder con React Flow)

**Estado:** 🚀 NUEVA VERSIÓN - Implementación desde cero con React Flow  
**Prioridad:** Alta  
**Fecha de Análisis:** Diciembre 2024  
**Última Actualización:** Diciembre 2024 - V2 con React Flow

---

## 📋 Resumen Ejecutivo

### 🎯 **Objetivo Principal**
Crear un sistema de campañas con **Journey Builder visual** usando **React Flow**, inspirado en Make.com pero especializado en **automatización de cobranza**. Los usuarios podrán crear flujos de trabajo arrastrando y conectando nodos para automatizar el proceso de cobranza.

### ✅ **Ventajas de React Flow**
- ✅ **Desarrollo Rápido**: Canvas, nodos y conexiones ya implementados
- ✅ **Profesional**: Interfaz moderna y pulida out-of-the-box
- ✅ **Escalable**: Manejo eficiente de workflows grandes
- ✅ **Personalizable**: Fácil customización de nodos y conexiones
- ✅ **Performance**: Optimizado para muchos nodos y conexiones
- ✅ **Mobile**: Responsive por defecto

### 🆕 **Nuevo Diseño Inspirado en Make.com**
- **Canvas infinito** con pan/zoom suave
- **Nodos especializados** para cobranza (Email, Llamada, SMS, Espera, Condición)
- **Conexiones visuales** con diferentes tipos (éxito, error, timeout)
- **Panel lateral** para configuración de nodos
- **Barra superior** con acciones principales
- **Flujo horizontal** natural de izquierda a derecha

---

## 🎨 Diseño Visual Propuesto

### **Layout Principal (Inspirado en Make.com)**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [←] Campaña de Cobranza                    [🔍] [📊] [⚙️] [💡] [▶️ Ejecutar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│  │  📧     │    │  ⏰     │    │  📞     │    │  📱     │    │  📊     │    │
│  │ EMAIL   │───▶│ ESPERA  │───▶│ LLAMADA │───▶│  SMS    │───▶│ ESTADÍS │    │
│  │         │    │         │    │         │    │         │    │         │    │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    │
│                                                                             │
│                                                                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Panel Lateral: Configuración de Nodo Seleccionado                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **Características del Diseño**
- **Canvas infinito** con grid de fondo sutil
- **Nodos circulares** con iconos y colores distintivos
- **Conexiones curvas** con diferentes colores según tipo
- **Panel lateral** que se abre al seleccionar un nodo
- **Barra superior** con acciones principales
- **Flujo horizontal** natural de izquierda a derecha

---

## 🏗️ Arquitectura Técnica con React Flow

### **Componentes Principales**

#### **1. JourneyBuilder.tsx** - Componente Principal
```typescript
import { ReactFlow, Background, Controls, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'

export default function JourneyBuilder() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  return (
    <div className="h-screen flex">
      {/* Canvas Principal */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      
      {/* Panel Lateral */}
      {selectedNode && (
        <NodeConfigPanel 
          nodeId={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}
```

#### **2. Nodos Especializados para Cobranza**

**EmailNode.tsx**
```typescript
import { Handle, Position } from 'reactflow'

export function EmailNode({ data }: { data: EmailNodeData }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-blue-200">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">📧</span>
        </div>
        <div>
          <div className="font-bold text-sm">Email</div>
          <div className="text-xs text-gray-500">{data.plantilla}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
```

**LlamadaNode.tsx**
```typescript
export function LlamadaNode({ data }: { data: LlamadaNodeData }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-green-200">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">📞</span>
        </div>
        <div>
          <div className="font-bold text-sm">Llamada</div>
          <div className="text-xs text-gray-500">{data.agente}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
```

**EsperaNode.tsx**
```typescript
export function EsperaNode({ data }: { data: EsperaNodeData }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-yellow-200">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">⏰</span>
        </div>
        <div>
          <div className="font-bold text-sm">Espera</div>
          <div className="text-xs text-gray-500">{data.duracion}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
```

**SMSNode.tsx**
```typescript
export function SMSNode({ data }: { data: SMSNodeData }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-purple-200">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">📱</span>
        </div>
        <div>
          <div className="font-bold text-sm">SMS</div>
          <div className="text-xs text-gray-500">{data.texto}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
```

**CondicionNode.tsx**
```typescript
export function CondicionNode({ data }: { data: CondicionNodeData }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-orange-200">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">🔀</span>
        </div>
        <div>
          <div className="font-bold text-sm">Condición</div>
          <div className="text-xs text-gray-500">{data.condicion}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="si" />
      <Handle type="source" position={Position.Right} id="no" />
    </div>
  )
}
```

#### **3. Panel de Configuración**

**NodeConfigPanel.tsx**
```typescript
export function NodeConfigPanel({ nodeId, onClose }: Props) {
  const node = useReactFlow().getNode(nodeId)
  
  if (!node) return null

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Configuración</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>
      
      {node.type === 'email' && <EmailConfigForm node={node} />}
      {node.type === 'llamada' && <LlamadaConfigForm node={node} />}
      {node.type === 'espera' && <EsperaConfigForm node={node} />}
      {node.type === 'sms' && <SMSConfigForm node={node} />}
      {node.type === 'condicion' && <CondicionConfigForm node={node} />}
    </div>
  )
}
```

#### **4. Barra Superior**

**TopToolbar.tsx**
```typescript
export function TopToolbar() {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
            <span>←</span>
            <span>Campaña de Cobranza</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
            🔍
          </button>
          <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
            📊
          </button>
          <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
            ⚙️
          </button>
          <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
            💡
          </button>
          <button className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded">
            ▶️ Ejecutar
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 🔧 Tipos de Datos TypeScript

### **Tipos de Nodos**
```typescript
// Tipos base
export interface BaseNodeData {
  id: string
  tipo: 'email' | 'llamada' | 'espera' | 'sms' | 'condicion' | 'estadistica'
  configuracion: Record<string, any>
}

// Nodo Email
export interface EmailNodeData extends BaseNodeData {
  tipo: 'email'
  configuracion: {
    plantilla_id: string
    asunto_personalizado?: string
    variables_dinamicas: {
      nombre: boolean
      monto: boolean
      fecha_vencimiento: boolean
    }
    configuracion_avanzada: {
      solo_dias_laborables: boolean
      horario_trabajo: { inicio: string, fin: string }
      reintentos: number
    }
  }
}

// Nodo Llamada
export interface LlamadaNodeData extends BaseNodeData {
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
      grabar_conversacion: boolean
    }
  }
}

// Nodo Espera
export interface EsperaNodeData extends BaseNodeData {
  tipo: 'espera'
  configuracion: {
    duracion: {
      tipo: 'minutos' | 'horas' | 'dias' | 'semanas'
      cantidad: number
    }
    configuracion_avanzada: {
      solo_dias_laborables: boolean
      excluir_fines_semana: boolean
      zona_horaria: string
    }
  }
}

// Nodo SMS
export interface SMSNodeData extends BaseNodeData {
  tipo: 'sms'
  configuracion: {
    texto: string
    variables_dinamicas: {
      nombre: boolean
      monto: boolean
    }
    configuracion_avanzada: {
      horario_envio: { inicio: string, fin: string }
      reintentos: number
    }
  }
}

// Nodo Condición
export interface CondicionNodeData extends BaseNodeData {
  tipo: 'condicion'
  configuracion: {
    condiciones: Array<{
      campo: 'respuesta_email' | 'contesto_llamada' | 'monto_deuda' | 'dias_vencido'
      operador: 'igual' | 'mayor' | 'menor' | 'contiene'
      valor: string | number
    }>
  }
}
```

### **Tipos de Conexiones**
```typescript
export interface ConnectionData {
  tipo: 'exito' | 'error' | 'timeout' | 'si' | 'no'
  label?: string
  color?: string
}

// Colores por tipo de conexión
export const connectionColors = {
  exito: '#10b981',    // Verde
  error: '#ef4444',    // Rojo
  timeout: '#f59e0b',  // Amarillo
  si: '#3b82f6',       // Azul
  no: '#6b7280'        // Gris
}
```

---

## 🚀 Plan de Implementación Simplificado

### **Fase 1: Setup y Estructura Base (Semana 1) - ✅ COMPLETADA**

#### **Objetivos:**
- ✅ Configurar React Flow
- ✅ Crear estructura básica de componentes
- ✅ Implementar canvas básico
- ✅ Nodos básicos funcionando

#### **Tareas:**
- [x] Instalar React Flow: `npm install reactflow --legacy-peer-deps`
- [x] Crear `JourneyBuilder.tsx` principal
- [x] Implementar `TopToolbar.tsx`
- [x] Crear nodos básicos: Email, Llamada, Espera
- [x] Sistema básico de conexiones
- [x] Panel lateral básico
- [x] Agregar entrada "Campañas" al sidebar

#### **Entregables:**
- ✅ Canvas funcional con React Flow
- ✅ 3 nodos básicos funcionando
- ✅ Conexiones básicas animadas
- ✅ Panel lateral básico
- ✅ Barra superior con acciones
- ✅ Integración completa con sidebar

---

### **Fase 2: Nodos Completos y Configuración (Semana 2) - ✅ COMPLETADA**

#### **Objetivos:**
- ✅ Completar todos los tipos de nodos
- ✅ Panel de configuración completo
- ✅ Formularios específicos por nodo
- ✅ Validaciones básicas

#### **Tareas:**
- [x] Implementar `SMSNode.tsx`
- [x] Implementar `CondicionNode.tsx`
- [x] Implementar `EstadisticaNode.tsx`
- [x] Formularios de configuración completos
- [x] Validaciones TypeScript
- [x] Guardar configuración en estado

#### **Entregables:**
- ✅ Todos los nodos implementados
- ✅ Panel de configuración completo
- ✅ Formularios específicos por nodo
- ✅ Validaciones funcionando

---

### **Fase 3: Persistencia y Gestión (Semana 3)**

#### **Objetivos:**
- Guardar/cargar workflows
- Gestión de campañas
- Integración con Supabase
- Sistema de metadatos

#### **Tareas:**
- [ ] Integrar con Supabase
- [ ] Sistema de guardar/cargar workflows
- [ ] Modal de gestión de campañas
- [ ] Metadatos de campañas
- [ ] Sistema de versiones básico

#### **Entregables:**
- Persistencia completa
- Gestión de campañas
- Integración con BD
- Sistema de metadatos

---

### **Fase 4: Motor de Ejecución (Semana 4)**

#### **Objetivos:**
- Sistema de ejecución paso a paso
- Contexto de datos entre nodos
- Logs de ejecución
- Manejo de errores

#### **Tareas:**
- [ ] Implementar `ExecutionEngine.tsx`
- [ ] Sistema de contexto de datos
- [ ] Logs de ejecución
- [ ] Manejo de errores y reintentos
- [ ] Integración con job programado

#### **Entregables:**
- Motor de ejecución funcional
- Logs de ejecución
- Manejo de errores
- Integración con sistema existente

---

## 📁 Estructura de Archivos

```
src/
├── components/
│   ├── campaigns/
│   │   ├── JourneyBuilder.tsx          # Componente principal
│   │   ├── TopToolbar.tsx              # Barra superior
│   │   ├── NodeConfigPanel.tsx         # Panel lateral
│   │   ├── nodes/
│   │   │   ├── EmailNode.tsx           # Nodo de email
│   │   │   ├── LlamadaNode.tsx         # Nodo de llamada
│   │   │   ├── EsperaNode.tsx          # Nodo de espera
│   │   │   ├── SMSNode.tsx             # Nodo de SMS
│   │   │   ├── CondicionNode.tsx       # Nodo de condición
│   │   │   └── EstadisticaNode.tsx     # Nodo de estadística
│   │   ├── forms/
│   │   │   ├── EmailConfigForm.tsx     # Formulario de email
│   │   │   ├── LlamadaConfigForm.tsx   # Formulario de llamada
│   │   │   ├── EsperaConfigForm.tsx     # Formulario de espera
│   │   │   ├── SMSConfigForm.tsx       # Formulario de SMS
│   │   │   ├── CondicionConfigForm.tsx  # Formulario de condición
│   │   │   └── EstadisticaConfigForm.tsx # Formulario de estadística
│   │   └── types/
│   │       ├── nodeTypes.ts            # Tipos de nodos
│   │       ├── connectionTypes.ts      # Tipos de conexiones
│   │       └── executionTypes.ts       # Tipos de ejecución
│   └── shared/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Select.tsx
├── hooks/
│   ├── useWorkflow.ts                  # Hook para gestión de workflows
│   ├── useNodeConfig.ts                # Hook para configuración de nodos
│   └── useExecution.ts                 # Hook para ejecución
├── services/
│   ├── workflowService.ts              # Servicio de workflows
│   ├── executionService.ts             # Servicio de ejecución
│   └── supabase.ts                     # Cliente de Supabase
└── pages/
    └── campaigns/
        └── page.tsx                    # Página principal de campañas
```

---

## 🔧 Configuración de React Flow

### **Instalación**
```bash
npm install reactflow
```

### **Configuración Básica**
```typescript
// En JourneyBuilder.tsx
import { ReactFlow, Background, Controls, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'

// Tipos de nodos personalizados
const nodeTypes = {
  email: EmailNode,
  llamada: LlamadaNode,
  espera: EsperaNode,
  sms: SMSNode,
  condicion: CondicionNode,
  estadistica: EstadisticaNode
}

// Tipos de conexiones personalizadas
const edgeTypes = {
  exito: SuccessEdge,
  error: ErrorEdge,
  timeout: TimeoutEdge
}
```

### **Configuración de Tema**
```typescript
// Colores del tema
export const theme = {
  colors: {
    primary: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1f2937'
  }
}
```

---

## 📊 Ventajas de React Flow vs Implementación Manual

### **Desarrollo**
- ✅ **Tiempo**: 70% menos tiempo de desarrollo
- ✅ **Mantenimiento**: Código más limpio y mantenible
- ✅ **Bugs**: Menos bugs relacionados con canvas
- ✅ **Performance**: Optimizado para muchos nodos

### **Funcionalidad**
- ✅ **Zoom/Pan**: Implementado y optimizado
- ✅ **Conexiones**: Sistema robusto de conexiones
- ✅ **Responsive**: Funciona en móvil y desktop
- ✅ **Accesibilidad**: Cumple estándares de accesibilidad

### **UX**
- ✅ **Profesional**: Interfaz moderna y pulida
- ✅ **Intuitivo**: Patrones familiares para usuarios
- ✅ **Fluido**: Interacciones suaves y responsivas
- ✅ **Escalable**: Funciona con workflows grandes

---

## 🎯 Métricas de Éxito

### **Desarrollo**
- **Tiempo de implementación**: < 4 semanas
- **Líneas de código**: < 2000 líneas
- **Bugs críticos**: 0
- **Performance**: < 100ms para operaciones básicas

### **Funcionalidad**
- **Nodos implementados**: 6 tipos
- **Conexiones**: 4 tipos diferentes
- **Persistencia**: 100% funcional
- **Ejecución**: Sistema paso a paso

### **UX**
- **Tiempo de carga**: < 2 segundos
- **Responsive**: Funciona en móvil y desktop
- **Intuitivo**: Usuarios pueden crear workflows sin capacitación
- **Profesional**: Interfaz similar a Make.com

---

## 🚀 Próximos Pasos

### **✅ COMPLETADO**
1. **✅ Analizado** React Flow y sus capacidades
2. **✅ Diseñado** nuevo layout inspirado en Make.com
3. **✅ Simplificado** estructura de componentes
4. **✅ Planificado** implementación en 4 fases
5. **✅ COMPLETADA Fase 1** - Setup y Estructura Base funcionando
6. **✅ COMPLETADA Fase 2** - Nodos Completos y Configuración funcionando

### **🔄 PRÓXIMO - Fase 3: Persistencia y Gestión**
1. **Integrar** con Supabase
2. **Sistema** de guardar/cargar workflows
3. **Modal** de gestión de campañas
4. **Metadatos** de campañas
5. **Sistema** de versiones básico

### **🔄 FUTURO - Fase 4**
1. **Fase 4**: Motor de ejecución

---

## 📞 Contacto y Soporte

**Desarrollador Principal:** Santiago Álvarez del Río  
**Estado:** 🚀 V2 - Implementación desde cero con React Flow  
**Fecha:** Diciembre 2024 - Nueva Arquitectura

---

## 🎯 Conclusión

### **✅ NUEVA VERSIÓN CON REACT FLOW**

Esta V2 del plan de implementación utiliza **React Flow** para acelerar significativamente el desarrollo y crear una interfaz más profesional y escalable.

### **✅ Ventajas Logradas:**
- ✅ **Desarrollo Rápido**: 70% menos tiempo de implementación
- ✅ **Profesional**: Interfaz moderna similar a Make.com
- ✅ **Escalable**: Manejo eficiente de workflows grandes
- ✅ **Mantenible**: Código más limpio y organizado
- ✅ **Performance**: Optimizado para muchos nodos

### **✅ Resultado Esperado:**
Un sistema **completamente funcional** donde los usuarios pueden:
- ✅ Crear **flujos de cobranza** arrastrando nodos al canvas
- ✅ Configurar cada nodo con formularios específicos
- ✅ Conectar nodos visualmente con diferentes tipos de conexión
- ✅ Guardar y cargar workflows desde la base de datos
- ✅ Gestionar múltiples workflows con metadatos completos

---

**✅ ESTADO:** V2 - Implementación desde cero con React Flow. **✅ COMPLETADAS:** Fase 1 - Setup y Estructura Base, Fase 2 - Nodos Completos y Configuración. **Próximo:** Fase 3 - Persistencia y Gestión.

---

## 📊 **Resumen de Implementación V2 - Diciembre 2024**

### **✅ Nueva Arquitectura:**
- **React Flow**: Canvas profesional y optimizado
- **Diseño Make.com**: Interfaz familiar y moderna
- **Estructura Simplificada**: Componentes más organizados
- **Desarrollo Acelerado**: 70% menos tiempo de implementación

### **✅ Fases Completadas:**
- **✅ Fase 1**: Setup y Estructura Base (Semana 1) - COMPLETADA
- **✅ Fase 2**: Nodos Completos y Configuración (Semana 2) - COMPLETADA

### **⏳ Próximas Fases:**
- **Fase 3**: Persistencia y Gestión (Semana 3)
- **Fase 4**: Motor de Ejecución (Semana 4)

---

## 📝 **LOG DE IMPLEMENTACIÓN - Diciembre 2024**

### **✅ FASE 1 COMPLETADA - 28 Diciembre 2024**

#### **Archivos Creados:**
- ✅ `src/app/campanas/page.tsx` - Página principal
- ✅ `src/app/campanas/components/JourneyBuilder.tsx` - Componente principal con React Flow
- ✅ `src/app/campanas/components/TopToolbar.tsx` - Barra superior
- ✅ `src/app/campanas/components/NodeConfigPanel.tsx` - Panel lateral
- ✅ `src/app/campanas/components/nodes/EmailNode.tsx` - Nodo de email
- ✅ `src/app/campanas/components/nodes/LlamadaNode.tsx` - Nodo de llamada
- ✅ `src/app/campanas/components/nodes/EsperaNode.tsx` - Nodo de espera

#### **Modificaciones:**
- ✅ `src/components/Sidebar.tsx` - Agregada entrada "Campañas"

#### **Dependencias Instaladas:**
- ✅ `reactflow@11.11.4` - Con `--legacy-peer-deps` para compatibilidad con React 19

#### **Funcionalidades Implementadas:**
- ✅ Canvas infinito con React Flow
- ✅ 3 nodos básicos funcionando (Email, Llamada, Espera)
- ✅ Conexiones animadas entre nodos
- ✅ Panel lateral que se abre al hacer clic en nodos
- ✅ Barra superior con acciones principales
- ✅ Controles de React Flow (zoom, pan, minimap)
- ✅ Integración completa con sidebar
- ✅ Sin errores de ESLint

#### **URL Funcional:**
- ✅ `http://localhost:3000/campanas` - Accesible y funcionando

---

### **✅ FASE 2 COMPLETADA - 28 Diciembre 2024**

#### **Archivos Creados:**
- ✅ `src/app/campanas/components/nodes/SMSNode.tsx` - Nodo de SMS
- ✅ `src/app/campanas/components/nodes/CondicionNode.tsx` - Nodo de condición
- ✅ `src/app/campanas/components/nodes/EstadisticaNode.tsx` - Nodo de estadística
- ✅ `src/app/campanas/components/forms/EmailConfigForm.tsx` - Formulario de email
- ✅ `src/app/campanas/components/forms/LlamadaConfigForm.tsx` - Formulario de llamada
- ✅ `src/app/campanas/components/forms/EsperaConfigForm.tsx` - Formulario de espera
- ✅ `src/app/campanas/components/forms/SMSConfigForm.tsx` - Formulario de SMS
- ✅ `src/app/campanas/components/forms/CondicionConfigForm.tsx` - Formulario de condición
- ✅ `src/app/campanas/components/forms/EstadisticaConfigForm.tsx` - Formulario de estadística

#### **Modificaciones:**
- ✅ `src/app/campanas/components/JourneyBuilder.tsx` - Sistema Make.com implementado
- ✅ `src/app/campanas/components/NodeConfigPanel.tsx` - Panel completo con formularios
- ✅ Todos los nodos actualizados con handles "+" integrados

#### **Funcionalidades Implementadas:**
- ✅ Sistema Make.com completo (círculo "+" inicial + handles "+" en nodos)
- ✅ 6 tipos de nodos completamente funcionales
- ✅ 6 formularios de configuración específicos
- ✅ Panel de configuración integrado y funcional
- ✅ Handles "+" completamente integrados en React Flow
- ✅ Menú de selección de nodos con diseño profesional
- ✅ Conexiones automáticas al crear nodos
- ✅ Guardado de configuración en estado
- ✅ Sin errores de ESLint o runtime
- ✅ Comportamiento idéntico a Make.com

#### **Mejoras Técnicas:**
- ✅ Handles personalizados con estilos CSS avanzados
- ✅ Posicionamiento relativo de elementos "+"
- ✅ Integración completa con React Flow
- ✅ Eliminación de elementos absolutos problemáticos
- ✅ Manejo correcto de contexto de React Flow
- ✅ Props en lugar de hooks para mejor separación

---

## 📋 **ESPACIO PARA SUPABASE - SQL YA EJECUTADO**


## 🏗️ IMPLEMENTACIÓN EN SUPABASE (EJECUTADO)

**⚠️ IMPORTANTE:** Copia y ejecuta TODOS los scripts SQL de esta sección en Supabase SQL Editor en el orden exacto que aparecen.

---

### PASO 1: Crear las Tablas

**Ejecutar en Supabase → Database → SQL Editor:**

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
  ejecutado_at TIMESTAMP,
  -- Validaciones
  CHECK (estado IN ('borrador', 'activo', 'pausado', 'archivado')),
  CHECK (version > 0),
  CHECK (canvas_data != '{}'::jsonb)
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
  proxima_ejecucion TIMESTAMP,
  -- Validaciones
  CHECK (estado IN ('pendiente', 'ejecutando', 'completado', 'fallido', 'pausado')),
  CHECK (paso_actual >= 0),
  CHECK (completado_at IS NULL OR completado_at >= iniciado_at)
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
  ejecutado_at TIMESTAMP DEFAULT NOW(),
  -- Validaciones
  CHECK (tipo_accion IN ('email', 'llamada', 'sms', 'espera', 'condicion', 'whatsapp')),
  CHECK (estado IN ('iniciado', 'completado', 'fallido', 'saltado')),
  CHECK (paso_numero >= 0),
  CHECK (duracion_ms IS NULL OR duracion_ms >= 0)
);

-- Tabla para programaciones de workflows
CREATE TABLE programaciones_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows_cobranza(id) ON DELETE CASCADE,
  tipo_programacion VARCHAR(50) NOT NULL, -- inmediata, programada, recurrente
  configuracion JSONB NOT NULL, -- Fecha, hora, frecuencia, etc.
  estado VARCHAR(50) DEFAULT 'activa', -- activa, pausada, completada
  proxima_ejecucion TIMESTAMP,
  creado_at TIMESTAMP DEFAULT NOW(),
  -- Validaciones
  CHECK (tipo_programacion IN ('inmediata', 'programada', 'recurrente')),
  CHECK (estado IN ('activa', 'pausada', 'completada')),
  CHECK (configuracion != '{}'::jsonb)
);

-- Tabla de auditoría para cambios en workflows
CREATE TABLE workflows_cobranza_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows_cobranza(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  operacion VARCHAR(50) NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

### PASO 2: Activar RLS (Row Level Security)

**Ejecutar en Supabase → Database → SQL Editor:**

```sql
-- Activar RLS en todas las tablas
ALTER TABLE workflows_cobranza ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejecuciones_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_ejecucion ENABLE ROW LEVEL SECURITY;
ALTER TABLE programaciones_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows_cobranza_auditoria ENABLE ROW LEVEL SECURITY;
```

---

### PASO 3: Crear Políticas de RLS

**Ejecutar en Supabase → Database → SQL Editor:**

```sql
-- POLÍTICA 1: workflows_cobranza (usuario solo ve sus workflows)
CREATE POLICY "workflows_cobranza_filtro_usuario"
ON workflows_cobranza
FOR ALL
USING (auth.uid() = usuario_id)
WITH CHECK (auth.uid() = usuario_id);

-- POLÍTICA 2: ejecuciones_workflow (usuario solo ve ejecuciones de sus workflows)
CREATE POLICY "ejecuciones_workflow_filtro_usuario"
ON ejecuciones_workflow
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workflows_cobranza w
    WHERE w.id = ejecuciones_workflow.workflow_id
    AND w.usuario_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflows_cobranza w
    WHERE w.id = ejecuciones_workflow.workflow_id
    AND w.usuario_id = auth.uid()
  )
);

-- POLÍTICA 3: logs_ejecucion (usuario solo ve logs de sus ejecuciones)
CREATE POLICY "logs_ejecucion_filtro_usuario"
ON logs_ejecucion
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM ejecuciones_workflow e
    JOIN workflows_cobranza w ON w.id = e.workflow_id
    WHERE e.id = logs_ejecucion.ejecucion_id
    AND w.usuario_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ejecuciones_workflow e
    JOIN workflows_cobranza w ON w.id = e.workflow_id
    WHERE e.id = logs_ejecucion.ejecucion_id
    AND w.usuario_id = auth.uid()
  )
);

-- POLÍTICA 4: programaciones_workflow (usuario solo ve programaciones de sus workflows)
CREATE POLICY "programaciones_workflow_filtro_usuario"
ON programaciones_workflow
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workflows_cobranza w
    WHERE w.id = programaciones_workflow.workflow_id
    AND w.usuario_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflows_cobranza w
    WHERE w.id = programaciones_workflow.workflow_id
    AND w.usuario_id = auth.uid()
  )
);

-- POLÍTICA 5: workflows_cobranza_auditoria (usuario ve auditoría de sus workflows)
CREATE POLICY "workflows_cobranza_auditoria_filtro_usuario"
ON workflows_cobranza_auditoria
FOR ALL
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());
```

---

### PASO 4: Crear Índices (Básicos y Avanzados)

**Ejecutar en Supabase → Database → SQL Editor:**

```sql
-- Índices básicos
CREATE INDEX idx_workflows_cobranza_usuario_id 
  ON workflows_cobranza(usuario_id);

CREATE INDEX idx_workflows_cobranza_estado 
  ON workflows_cobranza(usuario_id, estado);

CREATE INDEX idx_ejecuciones_workflow_workflow_id 
  ON ejecuciones_workflow(workflow_id);

CREATE INDEX idx_ejecuciones_workflow_deudor_id 
  ON ejecuciones_workflow(deudor_id);

CREATE INDEX idx_ejecuciones_workflow_estado 
  ON ejecuciones_workflow(workflow_id, estado);

CREATE INDEX idx_logs_ejecucion_ejecucion_id 
  ON logs_ejecucion(ejecucion_id);

CREATE INDEX idx_logs_ejecucion_tipo_accion 
  ON logs_ejecucion(ejecucion_id, tipo_accion);

CREATE INDEX idx_programaciones_workflow_workflow_id 
  ON programaciones_workflow(workflow_id);

-- Índices avanzados (solo indexan registros activos/relevantes)
CREATE INDEX idx_programaciones_workflow_proxima_activas 
  ON programaciones_workflow(proxima_ejecucion, estado)
  WHERE estado = 'activa';

CREATE INDEX idx_ejecuciones_workflow_pendientes 
  ON ejecuciones_workflow(workflow_id, proxima_ejecucion)
  WHERE estado IN ('pendiente', 'ejecutando');

CREATE INDEX idx_workflows_cobranza_activos 
  ON workflows_cobranza(usuario_id, estado)
  WHERE estado IN ('activo', 'pausado');

-- Índices para auditoría
CREATE INDEX idx_workflows_cobranza_auditoria_usuario_timestamp 
  ON workflows_cobranza_auditoria(usuario_id, timestamp DESC);

CREATE INDEX idx_workflows_cobranza_auditoria_workflow_timestamp 
  ON workflows_cobranza_auditoria(workflow_id, timestamp DESC);
```

---

### PASO 5: Crear Funciones y Triggers de Auditoría

**Ejecutar en Supabase → Database → SQL Editor:**

```sql
-- Función para registrar cambios en workflows_cobranza
CREATE OR REPLACE FUNCTION log_cambios_workflows_cobranza() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workflows_cobranza_auditoria (
    workflow_id,
    usuario_id,
    operacion,
    datos_anteriores,
    datos_nuevos
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.usuario_id, OLD.usuario_id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers de auditoría
DROP TRIGGER IF EXISTS trg_log_workflows_cobranza_insert ON workflows_cobranza;
CREATE TRIGGER trg_log_workflows_cobranza_insert
AFTER INSERT ON workflows_cobranza
FOR EACH ROW EXECUTE FUNCTION log_cambios_workflows_cobranza();

DROP TRIGGER IF EXISTS trg_log_workflows_cobranza_update ON workflows_cobranza;
CREATE TRIGGER trg_log_workflows_cobranza_update
AFTER UPDATE ON workflows_cobranza
FOR EACH ROW EXECUTE FUNCTION log_cambios_workflows_cobranza();

DROP TRIGGER IF EXISTS trg_log_workflows_cobranza_delete ON workflows_cobranza;
CREATE TRIGGER trg_log_workflows_cobranza_delete
AFTER DELETE ON workflows_cobranza
FOR EACH ROW EXECUTE FUNCTION log_cambios_workflows_cobranza();
```

---

### PASO 6: Prueba Rápida

**Ejecutar en Supabase → Database → SQL Editor:**

```sql
-- Verificar que las tablas fueron creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
  'workflows_cobranza', 
  'ejecuciones_workflow', 
  'logs_ejecucion', 
  'programaciones_workflow',
  'workflows_cobranza_auditoria'
);

-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN (
  'workflows_cobranza', 
  'ejecuciones_workflow', 
  'logs_ejecucion', 
  'programaciones_workflow',
  'workflows_cobranza_auditoria'
);
```

✅ **Si ves 5 filas en ambas consultas, está todo correcto.**

---

## ✅ CHECKLIST: Base de Datos

- [x] Ejecuté PASO 1: Crear las Tablas (con validaciones CHECK)
- [x] Ejecuté PASO 2: Activar RLS
- [x] Ejecuté PASO 3: Crear Políticas de RLS
- [x] Ejecuté PASO 4: Crear Índices (básicos y avanzados)
- [x] Ejecuté PASO 5: Crear Funciones y Triggers de Auditoría
- [x] Ejecuté PASO 6: Prueba Rápida (5 tablas + RLS habilitado)

**✅ COMPLETADO - Base de datos funcionando correctamente**
