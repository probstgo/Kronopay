# 🔐 Sistema de Autenticación y Seguridad - Cob

## 📋 Resumen del Sistema

Este documento describe la implementación completa del sistema de autenticación y seguridad para la aplicación Cob, desarrollada con Next.js 15, Supabase y shadcn/ui.

## 🏗️ Arquitectura del Sistema

### Componentes Principales
- **AuthContext**: Contexto de React para manejo de estado de autenticación
- **Middleware**: Protección de rutas a nivel de servidor
- **Supabase Client**: Cliente configurado para autenticación
- **Páginas de Autenticación**: Login, registro, recuperación de contraseña
- **Dashboard**: Página protegida principal
- **LayoutWrapper**: Envuelve el layout principal y muestra el `Sidebar` solo cuando hay usuario
- **Protected (componente)**: Envuelve páginas privadas en el cliente para evitar accesos/flash sin sesión

## 🔧 Configuración Inicial

### 1. Dependencias Instaladas
```json
{
  "@supabase/supabase-js": "^2.58.0",
  "@supabase/ssr": "^2.x.x",
  "shadcn/ui": "Componentes UI"
}
```

### 2. Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_api_key_de_supabase
```

### 3. Configuración de Supabase Dashboard
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/auth/callback`

## 📁 Estructura de Archivos

```
src/
├── contexts/
│   └── AuthContext.tsx          # Contexto de autenticación
├── lib/
│   └── supabase.ts              # Cliente de Supabase
├── app/
│   ├── login/
│   │   └── page.tsx             # Página de login
│   ├── register/
│   │   └── page.tsx             # Página de registro
│   ├── forgot-password/
│   │   └── page.tsx             # Solicitar reset de contraseña
│   ├── dashboard/
│   │   └── page.tsx             # Dashboard protegido
│   ├── auth/
│   │   ├── callback/
│   │   │   └── page.tsx         # Callback de autenticación
│   │   └── reset-password/
│   │       └── page.tsx         # Cambiar contraseña nueva
│   └── layout.tsx               # Layout con AuthProvider
├── components/ui/               # Componentes shadcn/ui
└── middleware.ts               # Middleware de protección
```

## 🔐 Sistema de Autenticación

### AuthContext (`src/contexts/AuthContext.tsx`)

**Funcionalidades:**
- Manejo de estado de usuario y sesión
- Funciones de login, registro, logout
- Reset de contraseña
- Persistencia de sesión
- Auto-refresh de tokens

**Hooks disponibles:**
```typescript
const { 
  user,           // Usuario actual
  session,         // Sesión actual
  loading,         // Estado de carga
  signIn,          // Función de login
  signUp,          // Función de registro
  signOut,         // Función de logout
  resetPassword    // Función de reset
} = useAuth()
```

### Cliente de Supabase (`src/lib/supabase.ts`)

**Configuración:**
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,    // Renovar tokens automáticamente
    persistSession: true,      // Persistir sesión en navegador
    detectSessionInUrl: true   // Detectar sesión en URL
  }
})
```

## 🛡️ Protección de Rutas

### Middleware (`middleware.ts`)

**Rutas Protegidas** (requieren autenticación):
```typescript
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
  '/admin',
  '/mi-cuenta',
  '/configuracion',
  // Nuevas rutas de la app protegidas por middleware
  '/deudores',
  '/campanas',
  '/historial',
  '/plantillas',
  '/pagos',
  '/billing'
]
```

**Rutas de Autenticación** (solo usuarios NO autenticados):
```typescript
const authRoutes = [
  '/login',
  '/register',
  '/forgot-password'
]
```

**Rutas Públicas** (acceso libre):
```typescript
const publicRoutes = [
  // IMPORTANTE: no incluir '/'
  '/auth/callback',
  '/auth/reset-password',
  '/test-email',
  '/test-supabase'
]
```

**Lógica de Protección:**
1. **Usuario NO autenticado** → Ruta protegida → Redirige a `/login`
2. **Usuario autenticado** → Ruta de auth → Redirige a `/dashboard`
3. **Usuario autenticado** → Ruta protegida → Permite acceso
4. **Cualquier usuario** → Ruta pública → Permite acceso

> Nota: Al no incluir `'/'` en `publicRoutes`, la raíz se considera protegida por defecto y redirige a `/login` si no hay sesión.

### Middleware Matcher
Se ejecuta en todas las rutas excepto estáticos e imágenes:
```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## 🧱 Defensa en profundidad (nuevas medidas)

### 1) LayoutWrapper: ocultar `Sidebar` sin sesión
- Archivo: `src/components/LayoutWrapper.tsx`.
- Usa `useAuth()` para leer `user` y `loading`.
- Muestra loader durante verificación y renderiza `<Sidebar />` solo cuando `user` existe.
- Integrado en `src/app/layout.tsx` para envolver el contenido de toda la app.

Beneficio: evita que la navegación privada quede visible tras logout o en estados intermedios.

### 2) Componente `Protected` en páginas privadas
- Archivo: `src/components/Protected.tsx` (export default).
- Lógica: si `loading` → spinner; si no hay `user` → `router.replace('/login')`; si hay `user` → renderiza `children`.
- Uso: envolver el contenido de cada página privada, por ejemplo `src/app/deudores/page.tsx`, `src/app/campanas/page.tsx`, etc.

Ejemplo de uso:
```tsx
import Protected from "@/components/Protected"

export default function PaginaPrivada() {
  return (
    <Protected>
      {/* contenido privado */}
    </Protected>
  )
}
```

Beneficio: capa adicional en cliente que evita parpadeos y accesos por navegación directa si el middleware no ha corrido aún.

### 3) Logout seguro en servidor (limpieza de cookies HTTP-only)
- Endpoint: `src/app/api/auth/signout/route.ts`.
- Implementado con `createServerClient` y `cookies()` de Next 15 (usando store awaitable).
- Llama a `supabase.auth.signOut()` y elimina explícitamente todas las cookies `sb-*` con `maxAge: 0`.
- El cliente (por ejemplo, `Sidebar`) hace:
  1. `await signOut()` en cliente (limpia storage)
  2. `await fetch('/api/auth/signout', { method: 'POST' })` (invalida cookies HTTP-only)
  3. Redirige a `/login`

Beneficio: garantiza que el middleware deje de ver una sesión válida inmediatamente después de cerrar sesión.

## 🔎 Diagnóstico y pruebas recomendadas
1. Cerrar sesión desde el `Sidebar` y verificar que desaparezca la navegación.
2. Intentar acceder a rutas protegidas directamente (p. ej. `/deudores`, `/dashboard`): debe redirigir a `/login`.
3. Revisar logs del middleware en el terminal. Se debe ver:
```
🔵 MIDDLEWARE ejecutándose en: /deudores
🔑 Sesión encontrada: NO ❌
🔒 BLOQUEANDO ACCESO a /deudores - Usuario no autenticado - REDIRIGIENDO A LOGIN
```
4. En DevTools → Application → Cookies, confirmar que cookies `sb-*` estén eliminadas tras logout.

## 🧭 Guía para nuevas rutas
Para agregar una página privada:
1. Crear la página en `src/app/nueva-ruta/page.tsx`.
2. Envolver su contenido con `<Protected>`.
3. Agregar el prefijo a `protectedRoutes` en `middleware.ts`.

Para agregar una ruta pública:
1. Crear la página.
2. Agregar su prefijo exacto a `publicRoutes` (mantener la regla de no incluir `'/'`).

## ✅ Estado actualizado
- [x] Middleware ampliado con: `/deudores`, `/campanas`, `/historial`, `/plantillas`, `/pagos`, `/billing`.
- [x] `publicRoutes` sin `'/'` para evitar bypass.
- [x] `LayoutWrapper` integrado en `layout.tsx` para ocultar `Sidebar` sin sesión.
- [x] Páginas privadas envueltas con `Protected` (incluida `/deudores`).
- [x] Logout server-side que invalida cookies `sb-*`.

## 📄 Páginas de Autenticación

### 1. Login (`/login`)
- **Funcionalidad**: Autenticación de usuarios existentes
- **Validación**: Email y contraseña requeridos
- **Redirección**: Dashboard después del login exitoso
- **Enlaces**: Registro y recuperación de contraseña

### 2. Registro (`/register`)
- **Funcionalidad**: Creación de nuevas cuentas
- **Validación**: 
  - Email válido
  - Contraseña mínimo 6 caracteres
  - Confirmación de contraseña
- **Feedback**: Mensajes de éxito y error en tiempo real
- **Enlaces**: Login si ya tienes cuenta

### 3. Recuperación de Contraseña (`/forgot-password`)
- **Funcionalidad**: Solicitar reset de contraseña
- **Proceso**: Envía email con enlace de recuperación
- **Validación**: Email requerido
- **Opciones**: Reenviar email, usar otro email

### 4. Cambio de Contraseña (`/auth/reset-password`)
- **Funcionalidad**: Cambiar contraseña nueva
- **Validación**: 
  - Contraseña mínimo 6 caracteres
  - Confirmación de contraseña
- **Seguridad**: Verificación de sesión válida
- **Redirección**: Login después del cambio exitoso

### 5. Callback de Autenticación (`/auth/callback`)
- **Funcionalidad**: Manejar retorno después del login
- **Proceso**: Verifica sesión y redirige al dashboard
- **Estados**: Loading, éxito, error
- **Manejo**: Errores de autenticación

### 6. Dashboard (`/dashboard`)
- **Funcionalidad**: Página principal protegida
- **Contenido**: Información del usuario, sesión activa
- **Acciones**: Logout, navegación
- **Protección**: Solo usuarios autenticados

## 🎨 Componentes UI

### Componentes shadcn/ui Utilizados
- **Button**: Botones con estados de carga
- **Input**: Campos de entrada con validación
- **Label**: Etiquetas para formularios
- **Card**: Contenedores elegantes
- **Alert**: Mensajes de error y éxito
- **Avatar**: Avatar del usuario
- **Badge**: Estados y etiquetas

### Características de Diseño
- **Responsive**: Adaptable a móvil y desktop
- **Consistente**: Diseño uniforme en todas las páginas
- **Accesible**: Etiquetas y navegación por teclado
- **Profesional**: Colores y tipografía de shadcn/ui

## 🔒 Medidas de Seguridad

### 1. Autenticación
- **Tokens JWT**: Manejo seguro de sesiones
- **Auto-refresh**: Renovación automática de tokens
- **Persistencia**: Sesión mantenida entre recargas
- **Logout seguro**: Limpieza de sesión

### 2. Validación
- **Frontend**: Validación en tiempo real
- **Backend**: Verificación en Supabase
- **Sanitización**: Limpieza de inputs
- **Tipos**: TypeScript para type safety

### 3. Protección de Rutas
- **Middleware**: Verificación a nivel de servidor
- **Redirecciones**: Flujo seguro de navegación
- **Estados**: Manejo de loading y errores
- **Logs**: Registro de accesos denegados

### 4. Manejo de Errores
- **Try-catch**: Captura de errores inesperados
- **Mensajes**: Feedback claro al usuario
- **Logs**: Registro en consola para debugging
- **Fallbacks**: Comportamiento seguro en errores

## 🚀 Flujos de Usuario

### Flujo de Registro
1. Usuario → `/register`
2. Llena formulario → Validación
3. Envía datos → Supabase crea cuenta
4. Email de confirmación → Usuario confirma
5. Redirige a `/dashboard`

### Flujo de Login
1. Usuario → `/login`
2. Ingresa credenciales → Validación
3. Supabase autentica → Sesión creada
4. Redirige a `/dashboard`

### Flujo de Recuperación
1. Usuario → `/forgot-password`
2. Ingresa email → Supabase envía email
3. Usuario hace clic en enlace → `/auth/reset-password`
4. Cambia contraseña → Supabase actualiza
5. Redirige a `/login`

### Flujo de Protección
1. Usuario intenta acceder a ruta protegida
2. Middleware verifica autenticación
3. Si no autenticado → Redirige a `/login`
4. Si autenticado → Permite acceso

## 📊 Monitoreo y Logs

### Logs del Middleware
```
🔒 Acceso denegado a /dashboard - Usuario no autenticado
🔄 Redirigiendo usuario autenticado desde /login al dashboard
```

### Logs del AuthContext
```
Autenticación exitosa: usuario@email.com
Cambio en autenticación: SIGNED_IN usuario@email.com
```

## 🔧 Mantenimiento

### Agregar Nueva Ruta Protegida
1. Crear la página en `src/app/nueva-ruta/`
2. Agregar ruta al array `protectedRoutes` en `middleware.ts`
3. El middleware protegerá automáticamente la ruta

### Agregar Nueva Ruta Pública
1. Crear la página en `src/app/nueva-ruta/`
2. Agregar ruta al array `publicRoutes` en `middleware.ts`
3. La ruta será accesible sin autenticación

### Modificar Validaciones
1. Editar funciones de validación en las páginas
2. Actualizar mensajes de error
3. Probar flujos de usuario

## ✅ Estado del Sistema

### ✅ Completado
- [x] AuthContext con todas las funciones
- [x] Cliente de Supabase configurado
- [x] Páginas de login y registro
- [x] Página de dashboard protegida
- [x] Sistema de recuperación de contraseña
- [x] Callback de autenticación
- [x] Middleware de protección de rutas
- [x] Componentes UI con shadcn/ui
- [x] Validaciones frontend y backend
- [x] Manejo de errores y estados
- [x] Diseño responsive y profesional

### 🔮 Futuras Mejoras
- [ ] Autenticación con OAuth (Google, GitHub)
- [ ] Verificación de email obligatoria
- [ ] Roles y permisos de usuario
- [ ] Auditoría de accesos
- [ ] Rate limiting
- [ ] 2FA (Autenticación de dos factores)

## 📞 Soporte

Para problemas o dudas sobre el sistema de autenticación:
1. Revisar logs en consola del navegador
2. Verificar configuración de Supabase
3. Comprobar variables de entorno
4. Revisar middleware.ts para rutas protegidas

## 👥 Sistema de Perfiles y Permisos

### ¿Qué es el Control de Perfiles?

El control de perfiles permite que diferentes tipos de usuarios vean y accedan a diferentes partes de la aplicación según su rol o nivel de autorización.

### Tipos de Perfiles Comunes

#### 1. **Cliente/Usuario Final**
- **Acceso**: Solo sus propios datos
- **Páginas**: Perfil personal, pedidos propios, configuración personal
- **Restricciones**: No puede ver datos de otros usuarios

#### 2. **Empleado/Staff**
- **Acceso**: Datos de clientes + herramientas internas
- **Páginas**: Gestión de pedidos, atención al cliente, reportes básicos
- **Restricciones**: No puede acceder a configuración del sistema

#### 3. **Administrador**
- **Acceso**: Todos los datos + configuración
- **Páginas**: Gestión completa, reportes avanzados, configuración
- **Restricciones**: No puede eliminar el sistema

#### 4. **Super Administrador**
- **Acceso**: Control total del sistema
- **Páginas**: Todas las páginas + configuración avanzada
- **Restricciones**: Ninguna

### Implementación del Sistema de Perfiles

#### 1. **Estructura de Base de Datos**
```sql
-- Tabla de usuarios con perfiles
users (
  id,
  email,
  password,
  user_type,        -- 'cliente', 'empleado', 'admin', 'super_admin'
  permissions,      -- JSON con permisos específicos
  created_at,
  updated_at
)
```

#### 2. **Configuración de Permisos**
```typescript
// Definir qué puede hacer cada tipo de usuario
const userPermissions = {
  cliente: {
    canView: ['/dashboard', '/profile', '/my-orders'],
    canEdit: ['/profile'],
    canDelete: []
  },
  empleado: {
    canView: ['/dashboard', '/orders', '/customers', '/reports'],
    canEdit: ['/orders', '/customers'],
    canDelete: ['/orders']
  },
  admin: {
    canView: ['/dashboard', '/orders', '/customers', '/reports', '/settings'],
    canEdit: ['/orders', '/customers', '/settings'],
    canDelete: ['/orders', '/customers']
  },
  super_admin: {
    canView: ['*'],  // Todas las páginas
    canEdit: ['*'],
    canDelete: ['*']
  }
}
```

#### 3. **Middleware de Permisos**
```typescript
// Verificar permisos en el middleware
const checkUserPermissions = (userType, requestedPath) => {
  const permissions = userPermissions[userType]
  return permissions.canView.includes('*') || 
         permissions.canView.some(path => requestedPath.startsWith(path))
}
```

#### 4. **Componentes Condicionales**
```typescript
// Mostrar elementos según el perfil del usuario
{userType === 'admin' && (
  <Button>Configuración Avanzada</Button>
)}

{userType === 'empleado' && (
  <Button>Gestión de Pedidos</Button>
)}
```

### Flujos de Acceso por Perfil

#### **Cliente Accede a Dashboard**
1. Usuario logueado como "cliente"
2. Intenta acceder a `/dashboard`
3. Middleware verifica: ¿Cliente puede ver dashboard?
4. **Resultado**: ✅ Acceso permitido
5. **Interfaz**: Ve solo sus datos personales

#### **Cliente Intenta Acceder a Admin**
1. Usuario logueado como "cliente"
2. Intenta acceder a `/admin`
3. Middleware verifica: ¿Cliente puede ver admin?
4. **Resultado**: ❌ Acceso denegado
5. **Acción**: Redirige a dashboard o muestra error

#### **Admin Accede a Configuración**
1. Usuario logueado como "admin"
2. Intenta acceder a `/settings`
3. Middleware verifica: ¿Admin puede ver settings?
4. **Resultado**: ✅ Acceso permitido
5. **Interfaz**: Ve todas las opciones de configuración

### Personalización de Interfaz

#### **Dashboard Personalizado**
- **Cliente**: "Mis Pedidos", "Mi Perfil", "Configuración"
- **Empleado**: "Pedidos", "Clientes", "Reportes", "Inventario"
- **Admin**: "Pedidos", "Clientes", "Reportes", "Configuración", "Usuarios"
- **Super Admin**: Todo lo anterior + "Sistema", "Logs", "Backup"

#### **Menú de Navegación**
- **Cliente**: Menú simple con opciones básicas
- **Empleado**: Menú con herramientas de trabajo
- **Admin**: Menú completo con gestión
- **Super Admin**: Menú con todas las opciones

#### **Botones y Acciones**
- **Cliente**: "Ver mis pedidos", "Editar perfil"
- **Empleado**: "Ver todos los pedidos", "Gestionar clientes"
- **Admin**: "Eliminar pedido", "Configurar sistema"
- **Super Admin**: "Eliminar usuario", "Resetear sistema"

### Ventajas del Sistema de Perfiles

#### **1. Seguridad**
- Cada usuario solo ve lo que debe ver
- Prevención de acceso no autorizado
- Protección de datos sensibles

#### **2. Experiencia de Usuario**
- Interfaz personalizada para cada tipo
- Menos confusión, más eficiencia
- Navegación intuitiva

#### **3. Escalabilidad**
- Fácil agregar nuevos tipos de usuario
- Permisos granulares
- Flexibilidad en la configuración

#### **4. Mantenimiento**
- Cambios centralizados
- Fácil actualización de permisos
- Auditoría de accesos

### Implementación Práctica

#### **Paso 1: Definir Perfiles**
1. Identificar qué tipos de usuarios tendrá la aplicación
2. Definir qué puede hacer cada tipo
3. Crear la estructura en la base de datos

#### **Paso 2: Configurar Permisos**
1. Crear el sistema de permisos
2. Configurar el middleware
3. Implementar verificaciones

#### **Paso 3: Personalizar Interfaz**
1. Crear componentes condicionales
2. Personalizar dashboards
3. Adaptar menús de navegación

#### **Paso 4: Probar y Refinar**
1. Probar cada tipo de usuario
2. Verificar que los permisos funcionen
3. Ajustar según necesidades

### Ejemplos de Uso

#### **E-commerce**
- **Cliente**: Ve productos, hace pedidos, ve sus pedidos
- **Vendedor**: Ve productos + pedidos + clientes
- **Admin**: Ve todo + configuración + reportes

#### **Sistema de Gestión**
- **Usuario**: Ve sus tareas, perfil
- **Manager**: Ve su equipo + reportes
- **Director**: Ve todos los equipos + reportes generales
- **CEO**: Ve todo + configuración del sistema

#### **Plataforma Educativa**
- **Estudiante**: Ve cursos, progreso, certificados
- **Profesor**: Ve cursos + estudiantes + calificaciones
- **Admin**: Ve todo + gestión de usuarios + configuración

---

**Última actualización**: Diciembre 2024  
**Versión**: 1.0.0  
**Tecnologías**: Next.js 15, Supabase, shadcn/ui, TypeScript
