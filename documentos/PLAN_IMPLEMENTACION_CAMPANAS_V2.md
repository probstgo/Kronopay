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
- **Nodos especializados** para cobranza (Email, Llamada, SMS, Espera, Condición, Filtro)
- **Conexiones visuales** con diferentes tipos (éxito, error, timeout)
- **Panel lateral** para configuración de nodos
- **Barra superior** con acciones principales
- **Flujo horizontal** natural de izquierda a derecha
- **Programación automática** con cron job existente (sin nodo adicional)

---

## 🎨 Diseño Visual Propuesto

### **Layout Principal (Inspirado en Make.com)**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [←] Campaña de Cobranza                    [🔍] [📊] [⚙️] [💡] [▶️ Ejecutar] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│  │  🔍     │    │  📧     │    │  ⏰     │    │  📞     │    │  📱     │    │
│  │ FILTRO │───▶│ EMAIL   │───▶│ ESPERA  │───▶│ LLAMADA │───▶│  SMS    │    │
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

### 📝 Notas flotantes (nuevo)
- Botón "Agregar nota" en la top bar (`TopToolbar.tsx`).
- Las notas son nodos libres de React Flow (sin handles), movibles y editables.
- Traen botón "X" para eliminar.
- Posicionamiento inteligente:
  - Si solo existe el nodo inicial "+" morado, la nota aparece encima de ese nodo.
  - Si existen nodos del flujo, la nota aparece encima del nodo más a la derecha con un offset vertical (no lo tapa).
  - Nunca elimina ni oculta el nodo inicial.

### ⚙️ Programación Automática
**¿Cómo funciona?** La programación se maneja automáticamente con el cron job existente.

**Sistema de ejecución:**
- ✅ **Cron job diario** ejecuta todas las acciones programadas (configurado en `vercel.json`)
- ✅ **Cada nodo programa su acción** en la tabla `programaciones`:
  - **EMAIL/LLAMADA/SMS**: Programa envío inmediato o con horario específico
  - **ESPERA**: Calcula próxima fecha y programa siguiente acción
  - **CONDICIÓN**: Programa acciones según resultado (sí/no)
  - **FILTRO**: Filtra deudores antes de continuar
- ✅ **Cron job procesa** todas las programaciones pendientes todos los días
- ✅ **No se necesita nodo de programación** - la programación es automática

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
      {node.type === 'filtro' && <FiltroConfigForm node={node} />}
    </div>
  )
}
```

#### **4. Barra Superior**

**TopToolbar.tsx** (Versión Mejorada)
```typescript
export function TopToolbar({ onAddNode, availableNodeTypes = [] }: TopToolbarProps) {
  const [nodesMenuOpen, setNodesMenuOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [executeOpen, setExecuteOpen] = useState(false)
  
  return (
    <>
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" disabled className="...">
              <ArrowLeft className="h-4 w-4" />
              <span>{campaignName}</span>
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Botón Agregar Nodos */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setNodesMenuOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Agregar nodos al canvas</TooltipContent>
            </Tooltip>
            
            {/* Botones con modales funcionales */}
            {/* Analytics, Settings, Help, Execute */}
          </div>
        </div>
      </div>
      
      {/* Modales y paneles */}
      {/* ... */}
    </>
  )
}
```

**Características implementadas:**
- ✅ Iconos de `lucide-react` en lugar de emojis
- ✅ Tooltips en todos los botones
- ✅ Modal de selección de nodos (botón de búsqueda transformado)
- ✅ Panel lateral de Analytics con métricas simuladas
- ✅ Modal de Configuración con formulario editable
- ✅ Modal de Ayuda con guía de uso
- ✅ Dialog de confirmación para ejecutar campaña
- ✅ Botón de retroceso desactivado
- ✅ Accesibilidad mejorada (aria-labels)

---

## 🔧 Tipos de Datos TypeScript

### **Tipos de Nodos**
```typescript
// Tipos base
export interface BaseNodeData {
  id: string
  tipo: 'email' | 'llamada' | 'espera' | 'sms' | 'condicion'
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

#### **Fase 3.0: Preparación Frontend para Guardado - ✅ COMPLETADA**

#### **Objetivos:**
- Preparar función `handleSave` en el frontend
- Estructurar payload según `workflows_cobranza`
- Cambiar botón "Ejecutar" por "Guardar"

#### **Tareas:**
- [x] Cambiar botón "Ejecutar" por "Guardar" en TopToolbar
- [x] Implementar función `handleSave` en JourneyBuilder
- [x] Recopilar nodos, conexiones y notas
- [x] Estructurar `canvas_data` según formato de BD
- [x] Estructurar payload completo para `workflows_cobranza`
- [x] Agregar logs para verificación
- [x] Preparar comentarios TODO para Fase 3.1

#### **Entregables:**
- ✅ Función `handleSave` implementada
- ✅ Payload estructurado correctamente
- ✅ Botón "Guardar" funcionando
- ✅ Dialog de confirmación actualizado

---

#### **Fase 3.1: Endpoints de API - ✅ COMPLETADA**

#### **Objetivos:**
- Crear endpoints para guardar/cargar workflows
- Validación con Zod
- Integración con Supabase

#### **Tareas:**
- [x] Crear endpoint `POST /api/campanas` (crear nueva campaña)
- [x] Crear endpoint `PUT /api/campanas/[id]/canvas` (actualizar campaña)
- [x] Crear endpoint `GET /api/campanas/[id]/canvas` (cargar campaña)
- [x] Implementar validación con Zod del payload
- [x] Integrar con Supabase para guardar en `workflows_cobranza`
- [x] Manejo de errores y validaciones
- [x] Reemplazar mensaje temporal por feedback visual

#### **Entregables:**
- ✅ Endpoints de API funcionando
- ✅ Validación completa con Zod
- ✅ Integración con Supabase
- ✅ Feedback visual apropiado (toast notifications con sonner)

---

#### **Fase 3.2: Cargar Workflows - ✅ COMPLETADA**

#### **Objetivos:**
- Cargar workflows desde la base de datos
- Restaurar nodos, conexiones y notas en el canvas
- Crear estructura de navegación (lista, nueva, editar)

#### **Tareas:**
- [x] Crear endpoint GET /api/campanas para listar campañas
- [x] Crear endpoint DELETE /api/campanas/[id] para eliminar campañas
- [x] Crear página de lista de campañas (/campanas/page.tsx)
- [x] Crear página de nueva campaña (/campanas/nueva/page.tsx)
- [x] Crear página de editar campaña (/campanas/[id]/page.tsx)
- [x] Implementar carga de workflow desde BD
- [x] Restaurar nodos en el canvas
- [x] Restaurar conexiones entre nodos
- [x] Restaurar notas flotantes
- [x] Restaurar nombre y descripción de la campaña
- [x] Manejar workflows inexistentes o sin permisos
- [x] Actualizar endpoint PUT para incluir nombre y descripción
- [x] Botón "Volver" funcional en toolbar

#### **Entregables:**
- ✅ Sistema de carga completo
- ✅ Restauración correcta del canvas
- ✅ Estructura de navegación completa
- ✅ Lista de campañas funcional

---

#### **Fase 3.3: Gestión de Campañas - 🔄 PENDIENTE**

#### **Objetivos:**
- Modal de gestión de campañas
- Listar campañas del usuario
- Crear/editar/eliminar campañas

#### **Tareas:**
- [ ] Modal de gestión de campañas
- [ ] Listar todas las campañas del usuario
- [ ] Crear nueva campaña
- [ ] Editar campaña existente
- [ ] Eliminar campaña
- [ ] Filtros y búsqueda

#### **Entregables:**
- Modal de gestión completo
- CRUD completo de campañas

---

#### **Fase 3.4: Metadatos y Versiones - 🔄 PENDIENTE**

#### **Objetivos:**
- Sistema de metadatos
- Sistema de versiones básico

#### **Tareas:**
- [ ] Metadatos de campañas (fecha creación, última modificación, etc.)
- [ ] Sistema de versiones básico
- [ ] Historial de cambios

#### **Entregables:**
- Sistema de metadatos completo
- Sistema de versiones funcionando

---

## ☁️ Integración Backend y BBDD (Notas y flujos enlazados a campaña/usuario)

### Modelo de datos recomendado (JSONB en `workflows_cobranza`)
- Usar `workflows_cobranza.canvas_data` (JSONB) para persistir el canvas completo: `nodes`, `edges` y `notes`.
- Cada campaña está en `workflows_cobranza` y pertenece a un `usuario_id` único (RLS ya aplicado).

Ejemplo de `canvas_data`:
```json
{
  "nodes": [
    { "id": "node_abc", "type": "email", "position": { "x": 0, "y": 0 }, "data": { "plantilla": "Nueva Plantilla", "configuracion": {} } }
  ],
  "edges": [
    { "id": "edge_node_abc_node_def", "source": "node_abc", "target": "node_def", "type": "smoothstep", "animated": true }
  ],
  "notes": [
    { "id": "note_123", "text": "Llamar a clientes VIP primero", "position": { "x": 300, "y": -120 }, "createdAt": "2025-10-30T12:00:00Z", "updatedAt": "2025-10-30T12:05:00Z" }
  ]
}
```

Ventajas:
- No requiere nuevas tablas; RLS existente limita el acceso por `usuario_id`.
- Guardado/lectura atómica del canvas.

Alternativa (si se requiere auditoría por nota):
- Crear `workflow_notes` (FK `workflow_id` → `workflows_cobranza.id`) con RLS por usuario y timestamps. Opcional.

### Endpoints/API (Next.js App Router)
- `GET /api/campanas/:id/canvas`: retorna `canvas_data` de la campaña del usuario autenticado.
- `PUT /api/campanas/:id/canvas`: actualiza `canvas_data` (validación con Zod). Verifica que `usuario_id` de la campaña coincide con `auth.uid()`.

Zod mínimo para `canvas_data`:
- `nodes[]`: `{ id, type, position{x,y}, data }`
- `edges[]`: `{ id, source, target, type? }`
- `notes[]`: `{ id, text, position{x,y}, createdAt?, updatedAt? }`

### Seguridad
- Mantener políticas RLS definidas (usuario solo ve/edita sus campañas).
- Usar Supabase SSR para obtener `auth.uid()` en los endpoints.

### Cambios Frontend para persistir
1. Al crear/editar/eliminar una nota o nodo, actualizar estado local.
2. Agregar acción "Guardar" (o autosave con debounce ~800ms):
   - Construir `canvas_data` `{ nodes, edges, notes }`.
   - `PUT /api/campanas/:id/canvas`.
3. Al cargar `campanas/[id]`:
   - `GET /api/campanas/:id/canvas` y poblar estado.
4. Todas las operaciones deben estar siempre asociadas al `campaignId` de la ruta y al usuario autenticado.

### Checklist Backend/BBDD
- [x] Implementar endpoints `GET/PUT /api/campanas/:id/canvas`.
- [x] Implementar endpoint `POST /api/campanas` para crear campañas.
- [x] Validar pertenencia de la campaña al usuario (`usuario_id` = `auth.uid()`).
- [x] Validar estructura con Zod (incluye `notes`).
- [x] Actualizar `canvas_data` en `workflows_cobranza`.
- [x] Actualizar `actualizado_at` automáticamente al modificar canvas.
- [ ] Añadir `updatedAt` en notas/nodos si se desea auditoría ligera (opcional).

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
│   │   │   └── FiltroNode.tsx          # Nodo de filtro
│   │   ├── forms/
│   │   │   ├── EmailConfigForm.tsx     # Formulario de email
│   │   │   ├── LlamadaConfigForm.tsx   # Formulario de llamada
│   │   │   ├── EsperaConfigForm.tsx     # Formulario de espera
│   │   │   ├── SMSConfigForm.tsx       # Formulario de SMS
│   │   │   ├── CondicionConfigForm.tsx  # Formulario de condición
│   │   │   └── FiltroConfigForm.tsx    # Formulario de filtro
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
  condicion: CondicionNode
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
- **Nodos implementados**: 6 tipos (Email, Llamada, SMS, Espera, Condición, Filtro)
- **Conexiones**: 4 tipos diferentes
- **Persistencia**: 100% funcional
- **Ejecución**: Sistema paso a paso con programación automática (cron job)

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
7. **✅ COMPLETADA Fase 2.1** - Mejoras UX/UI y Acciones de Nodos funcionando
8. **✅ COMPLETADA Fase 2.2** - Mejoras TopToolbar con Modales Funcionales funcionando
9. **✅ COMPLETADA Fase 3.0** - Preparación Frontend para Guardado (Diciembre 2024)
10. **✅ COMPLETADA Fase 3.1** - Endpoints de API (Diciembre 2024)
11. **✅ COMPLETADA Fase 3.2** - Sistema de Cargar Workflows (Diciembre 2024)

### **🔄 PRÓXIMO - Fase 3: Persistencia y Gestión**
1. **✅ Fase 3.0 COMPLETADA** - Preparación frontend (función handleSave implementada)
2. **✅ Fase 3.1 COMPLETADA** - Endpoints de API (POST /api/campanas, PUT/GET /api/campanas/[id]/canvas)
3. **✅ Fase 3.2 COMPLETADA** - Sistema de cargar workflows desde BD
4. **🔄 Fase 3.3** - Modal de gestión de campañas (opcional - ya existe lista)
5. **🔄 Fase 3.4** - Metadatos de campañas
6. **🔄 Fase 3.5** - Sistema de versiones básico

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

**✅ ESTADO:** V2 - Implementación desde cero con React Flow. **✅ COMPLETADAS:** Fase 1 - Setup y Estructura Base, Fase 2 - Nodos Completos y Configuración, Fase 2.1 - Mejoras UX/UI y Acciones de Nodos, Fase 2.2 - Mejoras TopToolbar con Modales Funcionales, Fase 2.3 - Notas Flotantes, Fase 3.0 - Preparación Frontend para Guardado, Fase 3.1 - Endpoints de API, Fase 3.2 - Sistema de Cargar Workflows. **Próximo:** Fase 3.3 - Modal de Gestión de Campañas (opcional) o Fase 4 - Motor de Ejecución.

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
- **✅ Fase 2.1**: Mejoras UX/UI y Acciones de Nodos (Semana 2) - COMPLETADA
- **✅ Fase 2.2**: Mejoras TopToolbar con Modales Funcionales (Diciembre 2024) - COMPLETADA
- **✅ Fase 2.3**: Notas Flotantes (30 Diciembre 2024) - COMPLETADA
- **✅ Fase 3.0**: Preparación Frontend para Guardado (Diciembre 2024) - COMPLETADA
- **✅ Fase 3.1**: Endpoints de API (Diciembre 2024) - COMPLETADA
- **✅ Fase 3.2**: Sistema de Cargar Workflows (Diciembre 2024) - COMPLETADA

### **⏳ Próximas Fases:**
- **Fase 3.3-3.5**: Persistencia y Gestión (Gestión de Campañas, Metadatos, Versiones) - Opcionales
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
- ✅ `src/app/campanas/components/forms/EmailConfigForm.tsx` - Formulario de email
- ✅ `src/app/campanas/components/forms/LlamadaConfigForm.tsx` - Formulario de llamada
- ✅ `src/app/campanas/components/forms/EsperaConfigForm.tsx` - Formulario de espera
- ✅ `src/app/campanas/components/forms/SMSConfigForm.tsx` - Formulario de SMS
- ✅ `src/app/campanas/components/forms/CondicionConfigForm.tsx` - Formulario de condición

#### **Modificaciones:**
- ✅ `src/app/campanas/components/JourneyBuilder.tsx` - Sistema Make.com implementado
- ✅ `src/app/campanas/components/NodeConfigPanel.tsx` - Panel completo con formularios
- ✅ Todos los nodos actualizados con handles "+" integrados

#### **Funcionalidades Implementadas:**
- ✅ Sistema Make.com completo (círculo "+" inicial + handles "+" en nodos)
- ✅ 5 tipos de nodos completamente funcionales
- ✅ 5 formularios de configuración específicos
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

### **✅ FASE 2.1 COMPLETADA - 28 Diciembre 2024 (Mejoras UX/UI)**

#### **Mejoras de Experiencia de Usuario:**
- ✅ **Botones de Acción en Nodos**: Cada nodo ahora tiene botones "Configurar" y "Eliminar"
- ✅ **Barra de Acciones Inferior**: Diseño elegante con iconos y hover effects
- ✅ **Contexto React**: Sistema de contexto para pasar funciones a nodos
- ✅ **Comportamiento Intuitivo**: Solo se abre panel de configuración con botón específico
- ✅ **Restauración Automática**: Al eliminar último nodo, reaparece nodo inicial "+"

#### **Mejoras Técnicas Implementadas:**
- ✅ **NodeActionsContext**: Contexto React para manejo de acciones de nodos
- ✅ **NodeWrapper**: Componente wrapper para inyectar funciones en nodos
- ✅ **useNodeActions Hook**: Hook personalizado para usar el contexto
- ✅ **handleConfigureNode**: Función para abrir panel de configuración
- ✅ **handleDeleteNode**: Función para eliminar nodos con confirmación
- ✅ **Restauración Inteligente**: Lógica para restaurar nodo inicial cuando no quedan nodos reales

#### **Arquitectura de Acciones:**
```typescript
// Contexto para pasar funciones a los nodos
const NodeActionsContext = createContext<{
  onConfigure: (nodeId: string) => void
  onDelete: (nodeId: string) => void
} | null>(null)

// Componente wrapper para pasar funciones a los nodos
function NodeWrapper({ nodeType, ...props }: any) {
  const { onConfigure, onDelete } = useNodeActions()
  // ... renderiza el nodo específico con las funciones
}
```

#### **Comportamiento de Nodos Actualizado:**
- ✅ **Clic en nodo**: No hace nada (comportamiento corregido)
- ✅ **Clic en "Configurar"**: Abre panel de configuración específico
- ✅ **Clic en "Eliminar"**: Elimina nodo con confirmación
- ✅ **Clic en handle "+"**: Abre menú de creación de nodos
- ✅ **Eliminación del último nodo**: Restaura automáticamente nodo inicial "+"

#### **Mejoras Visuales:**
- ✅ **Hover Effects**: Transiciones suaves en botones de acción
- ✅ **Iconos Descriptivos**: ⚙️ para configurar, 🗑️ para eliminar
- ✅ **Colores Temáticos**: Azul para configurar, rojo para eliminar
- ✅ **Separación Visual**: Borde superior para separar acciones del contenido
- ✅ **Responsive Design**: Botones adaptables a diferentes tamaños

---

### **✅ FASE 2.2 COMPLETADA - 29 Diciembre 2024 (Mejoras TopToolbar)**

#### **Mejoras de Barra Superior (TopToolbar):**
- ✅ **Iconos Profesionales**: Reemplazo de emojis por iconos de `lucide-react` (Plus, BarChart3, Settings, Lightbulb, Play, ArrowLeft)
- ✅ **Tooltips Informativos**: Todos los botones tienen tooltips descriptivos al hacer hover
- ✅ **Modales Funcionales**: Cada botón abre su modal/panel correspondiente con funcionalidad frontend completa
- ✅ **Selector de Nodos**: Botón de búsqueda transformado en "Agregar Nodos" que muestra todas las opciones de nodos disponibles
- ✅ **Panel de Analytics**: Panel lateral deslizable con métricas simuladas (ejecuciones, tasa de éxito, contactos, pagos)
- ✅ **Configuración de Campaña**: Modal para editar nombre y descripción de la campaña
- ✅ **Ayuda Contextual**: Modal con guía rápida de uso del editor
- ✅ **Confirmación de Ejecución**: Dialog de confirmación antes de ejecutar la campaña
- ✅ **Botón de Retroceso Desactivado**: Botón de navegación deshabilitado según requerimiento

#### **Funcionalidades Implementadas:**

**1. Botón Agregar Nodos (antes Búsqueda):**
- Modal con lista completa de tipos de nodos disponibles
- Diseño con iconos, nombres y descripciones
- Al hacer clic en un nodo, se agrega automáticamente al canvas
- Posicionamiento inteligente (centro si no hay nodos, o a la derecha del último nodo)

**2. Panel de Analytics:**
- Panel lateral deslizable desde la derecha
- Métricas simuladas: Ejecuciones, Tasa de éxito, Contactos, Pagos recibidos
- Estado informativo cuando la campaña aún no ha sido ejecutada

**3. Modal de Configuración:**
- Formulario para editar nombre de campaña
- Campo de texto para descripción
- Guardado de cambios (preparado para integración con backend)

**4. Modal de Ayuda:**
- Guía rápida sobre cómo crear campañas
- Información sobre tipos de nodos disponibles
- Instrucciones para ejecutar campañas

**5. Dialog de Ejecución:**
- Confirmación antes de ejecutar
- Muestra el nombre de la campaña en el mensaje
- Botones de cancelar y confirmar

#### **Mejoras Técnicas Implementadas:**
- ✅ **Props Interface**: `TopToolbarProps` con `onAddNode` y `availableNodeTypes`
- ✅ **Estado Local**: Manejo de estado para cada modal/panel
- ✅ **Componentes UI**: Uso de Dialog, Sheet, AlertDialog, Tooltip del sistema de diseño
- ✅ **Accesibilidad**: aria-labels en todos los botones
- ✅ **Integración con JourneyBuilder**: Función `handleAddNodeFromToolbar` que agrega nodos sin conexión automática
- ✅ **Limpieza de Código**: Eliminación de imports no utilizados (useRouter)

#### **Arquitectura de TopToolbar:**
```typescript
interface TopToolbarProps {
  onAddNode?: (nodeType: string) => void
  availableNodeTypes?: NodeType[]
}

// Función de agregar nodos desde toolbar
const handleAddNodeFromToolbar = useCallback((nodeType: string) => {
  // Calcula posición inteligente
  // Crea nodo sin conexión automática
  // Agrega al canvas
}, [nodes, setNodes])
```

#### **Componentes UI Utilizados:**
- ✅ `Dialog` - Para modales de configuración, ayuda y selector de nodos
- ✅ `Sheet` - Para panel lateral de analytics
- ✅ `AlertDialog` - Para confirmación de ejecución
- ✅ `Tooltip` - Para tooltips informativos
- ✅ `Button` - Componente consistente del sistema de diseño
- ✅ `Input`, `Label`, `Textarea` - Para formularios

#### **Mejoras de UX:**
- ✅ **Feedback Visual**: Estados hover y focus claros en todos los botones
- ✅ **Iconografía Consistente**: Iconos de lucide-react en lugar de emojis
- ✅ **Transiciones Suaves**: Animaciones en modales y paneles
- ✅ **Información Contextual**: Tooltips que explican cada acción
- ✅ **Flujo Intuitivo**: Cada botón tiene un propósito claro y funcional

---

### **✅ FASE 2.3 COMPLETADA - 30 Diciembre 2024 (Notas flotantes)**

#### Cambios UI/UX
- Botón "Agregar nota" en `TopToolbar.tsx` (icono StickyNote + tooltip).
- `NoteNode` editable con `Textarea` (sin handles) y botón "X" para eliminar.
- Arrastre libre respetando pan/zoom del canvas.
- Posicionamiento:
  - Sobre el nodo inicial "+" si es el único en el lienzo.
  - Sobre el nodo más a la derecha con offset vertical (no tapa el nodo) si ya existen nodos.

#### Cambios técnicos (frontend)
- Registro del tipo de nodo `note` en `JourneyBuilder.tsx`.
- Inyección de `onChange` y `onDelete` a cada `note` al renderizar los `nodes`.
- Lógica de `onAddNote` que calcula ancla (nodo inicial o más a la derecha) y aplica `OFFSET_Y`.

---

### **✅ FASE 3.0 COMPLETADA - Diciembre 2024 (Preparación Frontend para Guardado)**

#### Cambios UI/UX
- **Botón "Guardar" reemplaza "Ejecutar"**: Cambio de icono `Play` → `Save` en `TopToolbar.tsx`.
- **Dialog de confirmación actualizado**: Ahora pregunta "¿Guardar campaña?" en lugar de "¿Ejecutar campaña?".
- **Modal de Ayuda actualizado**: Texto actualizado para mencionar "Guardar campaña" en lugar de "Ejecutar campaña".
- **Feedback temporal**: Mensaje de alerta mostrando resumen de datos preparados (será reemplazado en Fase 3.1).

#### Cambios técnicos (frontend)

**1. TopToolbar.tsx:**
- Cambiado import: `Play` → `Save` de `lucide-react`.
- Agregada prop `onSave?: (data: { nombre: string; descripcion: string }) => void`.
- Cambiado estado: `executeOpen` → `saveOpen`.
- Cambiado función: `handleExecute` → `handleSave`.
- Función `handleSave` ahora llama a `onSave` con nombre y descripción de la campaña.
- Botón actualizado: texto "Ejecutar" → "Guardar", icono `Play` → `Save`.
- Dialog de confirmación actualizado con nuevo texto y acciones.

**2. JourneyBuilder.tsx:**
- Implementada función `handleSave` que:
  - Recopila nodos del flujo (excluye nodo inicial "+" y notas).
  - Recopila todas las conexiones (edges).
  - Recopila todas las notas con timestamps.
  - Estructura `canvas_data` con formato:
    ```typescript
    {
      nodes: [...], // Nodos del flujo sin el inicial
      edges: [...], // Todas las conexiones
      notes: [...]  // Todas las notas con createdAt/updatedAt
    }
    ```
  - Estructura payload completo según `workflows_cobranza`:
    ```typescript
    {
      nombre: string,
      descripcion: string,
      canvas_data: {...},
      configuracion: {}, // Vacío por ahora
      estado: 'borrador'
    }
    ```
  - Logs en consola para verificación del payload.
  - Mensaje temporal al usuario (será reemplazado en Fase 3.1).
  - Comentarios TODO marcando dónde se integrará la API en Fase 3.1.
- Pasada prop `onSave={handleSave}` al componente `TopToolbar`.

#### Estructura del Payload Preparado

El payload está estructurado según la tabla `workflows_cobranza`:

```typescript
{
  nombre: string,              // Nombre de la campaña
  descripcion: string,         // Descripción opcional
  canvas_data: {
    nodes: Array<{            // Nodos del flujo (sin initial-plus)
      id: string,
      type: string,
      position: { x: number, y: number },
      data: Record<string, any>
    }>,
    edges: Array<{            // Conexiones entre nodos
      id: string,
      source: string,
      target: string,
      type: string,
      animated: boolean
    }>,
    notes: Array<{            // Notas flotantes
      id: string,
      text: string,
      position: { x: number, y: number },
      createdAt: string,
      updatedAt: string
    }>
  },
  configuracion: {},          // Configuración global (vacía por ahora)
  estado: 'borrador'          // Estado inicial
}
```

---

### **✅ FASE 3.1 COMPLETADA - Diciembre 2024 (Endpoints de API)**

#### Cambios técnicos (backend)

**1. Schema de Validación (`src/lib/validations/campanaSchema.ts`):**
- Creado schema `canvasDataSchema` para validar `canvas_data` (nodes, edges, notes).
- Creado schema `saveCampanaSchema` para validar payload completo de guardado.
- Creado schema `updateCanvasSchema` para validar actualización de canvas_data.
- Tipos TypeScript inferidos de los schemas (`SaveCampanaInput`, `CanvasDataInput`, `UpdateCanvasInput`).

**2. Endpoint POST /api/campanas (`src/app/api/campanas/route.ts`):**
- Verifica autenticación con Supabase SSR.
- Valida payload con Zod usando `saveCampanaSchema`.
- Inserta nueva campaña en `workflows_cobranza`.
- Asigna `usuario_id` automáticamente desde sesión.
- Retorna ID de la campaña creada.
- Manejo completo de errores con mensajes descriptivos.

**3. Endpoint GET /api/campanas/[id]/canvas (`src/app/api/campanas/[id]/canvas/route.ts`):**
- Verifica autenticación con Supabase SSR.
- Obtiene `canvas_data` de una campaña específica.
- Verifica que la campaña pertenece al usuario (RLS).
- Retorna `canvas_data` completo (nodes, edges, notes).
- Manejo de errores para campañas inexistentes o sin permisos.

**4. Endpoint PUT /api/campanas/[id]/canvas (`src/app/api/campanas/[id]/canvas/route.ts`):**
- Verifica autenticación con Supabase SSR.
- Valida payload con Zod usando `updateCanvasSchema`.
- Verifica que la campaña existe y pertenece al usuario (RLS).
- Actualiza `canvas_data` y `actualizado_at` automáticamente.
- Retorna éxito con timestamp de actualización.
- Manejo completo de errores.

**5. JourneyBuilder.tsx (actualizado):**
- Importado `toast` de `sonner` para notificaciones.
- Función `handleSave` convertida a `async`.
- Implementada llamada a `POST /api/campanas`.
- Muestra loading con `toast.loading('Guardando campaña...')`.
- Muestra éxito con `toast.success()` incluyendo nombre de la campaña.
- Muestra errores con `toast.error()` con mensaje descriptivo.
- Manejo completo de errores con try/catch.
- Logs en consola para debugging.

#### Funcionalidades Implementadas

**Validación:**
- ✅ Validación completa con Zod del payload.
- ✅ Validación de estructura de `canvas_data` (nodes, edges, notes).
- ✅ Validación de nombre de campaña (requerido, max 255 caracteres).
- ✅ Validación de descripción (opcional).
- ✅ Validación de estado (enum: 'borrador', 'activo', 'pausado', 'archivado').

**Seguridad:**
- ✅ Autenticación con Supabase SSR en todos los endpoints.
- ✅ Verificación de sesión en cada request.
- ✅ RLS (Row Level Security) asegura que cada usuario solo ve/edita sus campañas.
- ✅ Validación de pertenencia de campaña al usuario antes de actualizar.

**Feedback Visual:**
- ✅ Notificaciones toast con `sonner`:
  - Loading durante guardado.
  - Éxito con nombre de campaña.
  - Error con mensaje descriptivo.
- ✅ Logs en consola para debugging.

**Manejo de Errores:**
- ✅ Validación de datos con mensajes descriptivos.
- ✅ Manejo de errores de autenticación (401).
- ✅ Manejo de errores de validación (400).
- ✅ Manejo de errores de base de datos (500).
- ✅ Mensajes de error descriptivos para el usuario.

#### Archivos Creados

- ✅ `src/lib/validations/campanaSchema.ts` - Schemas de validación con Zod
- ✅ `src/app/api/campanas/route.ts` - Endpoint POST para crear campañas
- ✅ `src/app/api/campanas/[id]/canvas/route.ts` - Endpoints GET y PUT para canvas

#### Archivos Modificados

- ✅ `src/app/campanas/components/JourneyBuilder.tsx` - Integración con API y feedback visual

---

### **✅ FASE 3.2 COMPLETADA - Diciembre 2024 (Sistema de Cargar Workflows)**

#### Cambios UI/UX
- **Página de Lista de Campañas**: Nueva página `/campanas` que muestra todas las campañas guardadas del usuario.
- **Cards de Campañas**: Cada campaña se muestra en un card con nombre, estado, fecha de actualización y versión.
- **Búsqueda**: Barra de búsqueda para filtrar campañas por nombre o descripción.
- **Botón "Nueva Campaña"**: Crea una nueva campaña con canvas vacío.
- **Botón "Editar"**: Abre la campaña en el editor con datos cargados.
- **Botón "Eliminar"**: Elimina campaña con confirmación.
- **Botón "Volver"**: En el toolbar, navega de vuelta a la lista de campañas.
- **Loading Overlay**: Muestra indicador de carga mientras se cargan los datos.

#### Cambios técnicos (backend y frontend)

**1. Endpoint GET /api/campanas (`src/app/api/campanas/route.ts`):**
- Lista todas las campañas del usuario autenticado.
- Retorna: id, nombre, descripcion, estado, version, creado_at, actualizado_at, ejecutado_at.
- Ordenadas por `actualizado_at` descendente (más recientes primero).
- RLS asegura que solo ve sus campañas.

**2. Endpoint DELETE /api/campanas/[id] (`src/app/api/campanas/[id]/route.ts`):**
- Elimina una campaña específica.
- Verifica que la campaña pertenece al usuario (RLS).
- Retorna éxito o error descriptivo.

**3. Endpoint GET /api/campanas/[id]/canvas (actualizado):**
- Ahora retorna también `nombre` y `descripcion` de la campaña.
- Corregido para usar `await params` (Next.js 15).

**4. Endpoint PUT /api/campanas/[id]/canvas (actualizado):**
- Ahora acepta y actualiza también `nombre` y `descripcion` opcionales.
- Actualiza `actualizado_at` automáticamente.

**5. Schema de Validación (`src/lib/validations/campanaSchema.ts`):**
- `updateCanvasSchema` actualizado para incluir `nombre` y `descripcion` opcionales.

**6. Página de Lista (`src/app/campanas/page.tsx`):**
- Lista todas las campañas del usuario.
- Cards con información completa (nombre, estado, fecha, versión).
- Búsqueda por nombre/descripción.
- Botones de acción: Editar, Eliminar.
- Estado vacío cuando no hay campañas.
- Estado de búsqueda sin resultados.

**7. Página Nueva Campaña (`src/app/campanas/nueva/page.tsx`):**
- Renderiza `JourneyBuilder` sin params.
- Canvas vacío para crear desde cero.

**8. Página Editar Campaña (`src/app/campanas/[id]/page.tsx`):**
- Renderiza `JourneyBuilder` con params (id de la campaña).
- Canvas con datos cargados desde BD.

**9. JourneyBuilder.tsx (actualizado):**
- Agregado prop `params?: Promise<{ id: string }>`.
- Estados: `campaignId`, `campaignName`, `campaignDescription`, `loading`.
- Función `cargarCampana` que:
  - Llama a `GET /api/campanas/[id]/canvas`.
  - Restaura nombre y descripción.
  - Restaura nodos del flujo (sin nodo inicial "+").
  - Restaura conexiones (edges).
  - Restaura notas flotantes.
  - Muestra loading overlay.
  - Maneja errores con redirección a lista.
- Función `handleSave` actualizada:
  - Si hay `campaignId` → `PUT` (actualiza canvas + nombre + descripción).
  - Si no hay `campaignId` → `POST` (crea nueva) y redirige a edición.
- Loading overlay mientras carga datos.
- Redirección automática a lista si hay error al cargar.

**10. TopToolbar.tsx (actualizado):**
- Agregadas props: `initialName`, `initialDescription`, `onNameChange`, `onDescriptionChange`.
- Sincronización con props iniciales usando `useEffect`.
- Botón "Volver" activado → navega a `/campanas` usando `useRouter`.
- Muestra nombre de la campaña en el botón de navegación.

#### Funcionalidades Implementadas

**Navegación:**
- ✅ Lista de campañas con cards informativos.
- ✅ Crear nueva campaña desde lista.
- ✅ Editar campaña existente desde lista.
- ✅ Eliminar campaña con confirmación.
- ✅ Botón "Volver" funcional en toolbar.
- ✅ Búsqueda de campañas por nombre/descripción.

**Carga de Datos:**
- ✅ Carga de campaña desde BD al abrir `/campanas/[id]`.
- ✅ Restauración de nodos del flujo.
- ✅ Restauración de conexiones entre nodos.
- ✅ Restauración de notas flotantes.
- ✅ Restauración de nombre y descripción.
- ✅ Loading overlay durante carga.
- ✅ Manejo de errores con redirección.

**Guardado:**
- ✅ Crear nueva campaña (POST) → redirige a edición.
- ✅ Actualizar campaña existente (PUT) → actualiza canvas + nombre + descripción.
- ✅ Actualización automática de `actualizado_at`.

#### Archivos Creados

- ✅ `src/app/campanas/page.tsx` - Página de lista de campañas
- ✅ `src/app/campanas/nueva/page.tsx` - Página de nueva campaña
- ✅ `src/app/campanas/[id]/page.tsx` - Página de editar campaña
- ✅ `src/app/api/campanas/[id]/route.ts` - Endpoint DELETE para eliminar campañas

#### Archivos Modificados

- ✅ `src/app/api/campanas/route.ts` - Agregado endpoint GET para listar campañas
- ✅ `src/app/api/campanas/[id]/canvas/route.ts` - Actualizado para retornar/actualizar nombre y descripción
- ✅ `src/lib/validations/campanaSchema.ts` - Actualizado `updateCanvasSchema`
- ✅ `src/app/campanas/components/JourneyBuilder.tsx` - Agregada carga de datos y navegación
- ✅ `src/app/campanas/components/TopToolbar.tsx` - Agregada sincronización de nombre/descripción y botón "Volver"

#### Flujo Completo Implementado

```
Sidebar "Campañas" 
  ↓
/campanas (Lista de campañas)
  ├─ Click "Nueva Campaña" → /campanas/nueva → Canvas vacío
  │     ↓
  │   Usuario crea flujo y guarda
  │     ↓
  │   POST /api/campanas → Redirige a /campanas/[id]
  │
  └─ Click "Editar" → /campanas/[id] → Canvas con datos cargados
        ↓
      GET /api/campanas/[id]/canvas → Carga nodos, edges, notes, nombre, descripción
        ↓
      Usuario edita y guarda
        ↓
      PUT /api/campanas/[id]/canvas → Actualiza canvas + nombre + descripción
        ↓
      Toast de éxito
```

#### Próximos Pasos (Fase 3.3 - Opcional)
- Modal de gestión de campañas (ya existe lista, pero se puede mejorar con más opciones).
- Duplicar campaña.
- Cambiar estado de campaña (activo/pausado/archivado).
- Filtros avanzados en lista (por estado, fecha, etc.).

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
