# 📋 Plan de Trabajo - Gestión de Deudores

## 🎯 Objetivo General
Implementar una sección completa de gestión de deudores con tabla interactiva, formularios, importación CSV, exportación y sistema de estados, utilizando shadcn/ui y Supabase.

---

## 📊 Análisis de la Situación Actual

### ✅ Lo que ya tenemos:
- **Supabase configurado** con funciones básicas para deudores
- **Componentes shadcn/ui disponibles**: table, button, card, input, form, badge, dropdown-menu
- **Estructura de base de datos** con tabla `deudores` y `historial_emails`
- **Página básica** en `/deudores` con estructura HTML

### ❌ Lo que necesitamos agregar:
- **Sistema de estados** (nueva, en_proceso, parcialmente_pagada, pagada, vencida, cancelada)
- **Componentes shadcn/ui adicionales**: Dialog, DataTable, Select, AlertDialog, Toast
- **Funcionalidades avanzadas**: búsqueda, filtros, paginación, importación CSV
- **Integración completa** con el sistema de estados

---

## 🚀 Plan de Implementación por Fases

### **FASE 1: Preparación y Componentes Base** 
*Prioridad: ALTA - Base para todo lo demás*

#### 1.1 Instalar componentes shadcn/ui faltantes
- [x] **Dialog** - Para formularios de agregar/editar deudores
- [x] **Select** - Para filtros y selección de estados
- [x] **AlertDialog** - Para confirmación de eliminación
- [x] **Toast** - Para notificaciones de éxito/error (usando Sonner)
- [x] **DataTable** - Tabla avanzada con paginación y ordenamiento
- [x] **Checkbox** - Para selección múltiple
- [x] **Textarea** - Para notas adicionales

#### 1.2 Actualizar tipos TypeScript
- [x] Agregar campo `estado` al interface `Deudor`
- [x] Agregar campos `rut`, `telefono`, `email` al interface `Deudor`
- [x] Crear interface para estados de deudas
- [x] Crear interface para filtros de búsqueda

#### 1.3 Crear constantes y utilidades
- [x] Definir constantes de estados con colores
- [x] Crear funciones de validación (RUT, email, teléfono)
- [x] Crear funciones de formateo (fechas, montos, RUT)

---

### **FASE 2: Sistema de Estados**
*Prioridad: ALTA - Core del negocio*

#### 2.1 Actualizar base de datos
- [x] Ejecutar migración para agregar campo `estado` a tabla `deudores`
- [x] Ejecutar migración para agregar campos `rut`, `telefono`, `email`
- [x] Crear funciones SQL para gestión de estados
- [x] Crear triggers para actualización automática de estados

#### 2.2 Actualizar funciones de base de datos
- [x] Modificar `createDeudor` para incluir nuevos campos
- [x] Modificar `updateDeudor` para manejar cambios de estado
- [x] Crear función `cambiarEstadoDeuda`
- [x] Crear función `getDeudoresPorEstado`
- [x] Crear función `getEstadisticasEstados`

#### 2.3 Crear componentes de estado
- [x] Componente `EstadoBadge` para mostrar estado con colores
- [x] Componente `SelectorEstado` para cambiar estado
- [x] Función para calcular estado automático según fecha

---

### **FASE 3: Tabla Principal de Deudores**
*Prioridad: ALTA - Interfaz principal*

#### 3.1 Crear componente DataTable
- [x] Configurar columnas: Nombre, RUT, Email, Teléfono, Monto, Fecha Vencimiento, Estado
- [x] Implementar búsqueda por nombre, RUT, email
- [x] Implementar filtros por estado y rango de fechas
- [x] Implementar ordenamiento por columnas
- [x] Implementar paginación (10, 30, 50 por página)

#### 3.2 Agregar acciones por fila
- [x] Botón "Editar" que abre modal con datos precargados
- [x] Botón "Eliminar" con confirmación
- [x] Botón "Enviar Recordatorio" (email)
- [x] Botón "Cambiar Estado" con dropdown

#### 3.3 Implementar indicadores visuales
- [x] Colores para estados (verde=pagada, rojo=vencida, etc.)
- [x] Indicador de días vencidos
- [x] Iconos para acciones rápidas

---

### **FASE 4: Formulario de Agregar/Editar Deudor**
*Prioridad: MEDIA - Funcionalidad core*

#### 4.1 Crear modal de formulario
- [x] Modal con `Dialog` de shadcn/ui
- [x] Formulario con validación usando `react-hook-form`
- [x] Campos: Nombre*, RUT, Email, Teléfono, Monto*, Fecha Vencimiento*, Estado
- [x] Validación en tiempo real (RUT chileno, email, teléfono)
- [x] Botones "Guardar" y "Cancelar"

#### 4.2 Implementar modo edición
- [x] Precargar datos del deudor seleccionado
- [x] Permitir modificar todos los campos
- [x] Mantener historial de cambios

#### 4.3 Manejo de errores y validaciones
- [x] Validación de RUT chileno
- [x] Validación de email
- [x] Validación de teléfono
- [x] Validación de fechas (no puede ser pasada)
- [x] Mensajes de error claros

---

### **FASE 5: Importación desde CSV**
*Prioridad: MEDIA - Funcionalidad avanzada*

#### 5.1 Crear modal de importación
- [x] Modal con selector de archivo CSV
- [x] Validación de formato de archivo
- [x] Previsualización de datos antes de importar
- [x] Manejo de errores en el archivo

#### 5.2 Procesar archivo CSV
- [x] Parser de CSV con validación de columnas
- [x] Mapeo de columnas: nombre, rut, email, telefono, monto, fecha_vencimiento
- [x] Validación de datos antes de insertar
- [x] Inserción masiva en base de datos

#### 5.3 Reporte de importación
- [x] Mostrar cantidad de registros importados
- [x] Mostrar errores encontrados
- [x] Opción de descargar log de errores

---

### **FASE 6: Exportación de Datos**
*Prioridad: BAJA - Funcionalidad adicional*

#### 6.1 Exportación a CSV
- [ ] Botón de exportar con filtros aplicados
- [ ] Generar archivo CSV con todos los datos
- [ ] Incluir fecha de exportación en nombre de archivo

#### 6.2 Exportación a PDF (opcional)
- [ ] Generar reporte PDF con tabla de deudores
- [ ] Incluir estadísticas por estado
- [ ] Formato profesional para impresión

---

### **FASE 7: Acciones Rápidas y Notificaciones**
*Prioridad: MEDIA - Experiencia de usuario*

#### 7.1 Sistema de recordatorios
- [ ] Botón "Enviar Recordatorio" por deudor
- [ ] Integración con sistema de emails existente
- [ ] Plantillas de email personalizables
- [ ] Registro en historial de emails

#### 7.2 Sistema de notificaciones
- [ ] Toast para confirmaciones de acciones
- [ ] Toast para errores y validaciones
- [ ] Notificaciones de cambios de estado
- [ ] Notificaciones de importación/exportación

#### 7.3 Acciones masivas
- [ ] Selección múltiple de deudores
- [ ] Cambio de estado masivo
- [ ] Envío de recordatorios masivos
- [ ] Eliminación masiva con confirmación

---

### **FASE 8: Optimización y Pulimiento**
*Prioridad: BAJA - Mejoras finales*

#### 8.1 Rendimiento
- [ ] Lazy loading para listas grandes
- [ ] Debounce en búsqueda
- [ ] Optimización de queries a Supabase
- [ ] Caché de datos frecuentes

#### 8.2 Responsividad
- [ ] Adaptación a móviles
- [ ] Tabla responsiva con scroll horizontal
- [ ] Formularios adaptativos
- [ ] Navegación táctil

#### 8.3 Accesibilidad
- [ ] Navegación por teclado
- [ ] Etiquetas ARIA
- [ ] Contraste de colores
- [ ] Lectores de pantalla

---

## 🛠️ Componentes shadcn/ui Necesarios

### Ya disponibles:
- ✅ `table` - Tabla básica
- ✅ `button` - Botones
- ✅ `card` - Contenedores
- ✅ `input` - Campos de texto
- ✅ `form` - Formularios
- ✅ `badge` - Estados
- ✅ `dropdown-menu` - Menús desplegables

### Necesarios instalar:
- ❌ `dialog` - Modales
- ❌ `select` - Selectores
- ❌ `alert-dialog` - Confirmaciones
- ❌ `toast` - Notificaciones
- ❌ `checkbox` - Casillas de verificación
- ❌ `textarea` - Área de texto
- ❌ `data-table` - Tabla avanzada (si existe)

---

## 📊 Estructura de Archivos Propuesta

```
src/app/deudores/
├── page.tsx                    # Página principal
├── components/
│   ├── DeudoresTable.tsx       # Tabla principal
│   ├── DeudorForm.tsx          # Formulario agregar/editar
│   ├── ImportCSVModal.tsx      # Modal de importación
│   ├── EstadoBadge.tsx         # Badge de estado
│   ├── FiltrosDeudores.tsx     # Filtros y búsqueda
│   └── AccionesRapidas.tsx     # Botones de acción
├── hooks/
│   ├── useDeudores.ts          # Hook para gestión de deudores
│   ├── useEstados.ts           # Hook para estados
│   └── useFiltros.ts           # Hook para filtros
├── utils/
│   ├── validaciones.ts         # Validaciones (RUT, email, etc.)
│   ├── formateo.ts             # Formateo de datos
│   └── csvUtils.ts             # Utilidades para CSV
└── types/
    └── deudores.ts             # Tipos TypeScript
```

---

## 🎯 Criterios de Éxito

### Funcionalidad:
- [x] Usuario puede ver lista de deudores con todos los campos
- [x] Usuario puede buscar y filtrar deudores
- [x] Usuario puede agregar nuevo deudor con validación
- [x] Usuario puede editar deudor existente
- [x] Usuario puede eliminar deudor con confirmación
- [x] Usuario puede cambiar estado de deudor
- [x] Usuario puede importar deudores desde CSV
- [ ] Usuario puede exportar datos a CSV
- [ ] Usuario puede enviar recordatorios por email

### Experiencia de Usuario:
- [x] Interfaz intuitiva y fácil de usar
- [x] Respuesta rápida a las acciones
- [x] Notificaciones claras de éxito/error
- [x] Validaciones en tiempo real
- [x] Diseño responsivo para móviles

### Técnico:
- [x] Código bien estructurado y documentado
- [x] Integración correcta con Supabase
- [x] Manejo adecuado de errores
- [x] Optimización de rendimiento
- [x] Seguridad (RLS, validaciones)

---

## 🚦 Orden de Implementación Recomendado

1. **FASE 1** - Preparación (componentes, tipos, utilidades)
2. **FASE 2** - Sistema de estados (base de datos, funciones)
3. **FASE 3** - Tabla principal (interfaz core)
4. **FASE 4** - Formulario agregar/editar (funcionalidad básica)
5. **FASE 7** - Notificaciones (experiencia de usuario)
6. **FASE 5** - Importación CSV (funcionalidad avanzada)
7. **FASE 6** - Exportación (funcionalidad adicional)
8. **FASE 8** - Optimización (mejoras finales)

---

## 📝 Notas Importantes

- **Cada fase debe ser implementada y probada antes de continuar**
- **Mantener compatibilidad con el sistema existente**
- **Seguir las mejores prácticas de React y Next.js**
- **Documentar cada componente y función**
- **Probar en diferentes dispositivos y navegadores**

---

*Este plan está diseñado para ser implementado paso a paso, con validación del usuario en cada fase antes de continuar.*
