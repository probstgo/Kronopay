# Plan de implementación de la base de datos (desde cero)

Este documento explica, en pasos simples, cómo crear la nueva estructura de base de datos en Supabase. No necesitas conocimientos previos. Incluye un checklist y bloques SQL mínimos.

---

## 1. Acerca de este documento

- Audiencia: personas no técnicas que deben implementar la base de datos.
- Qué obtendrás: una base lista para operar deudores, contactos, deudas, historial, programaciones, llamadas y automatizaciones con seguridad por filas (RLS).
- Tiempo estimado: 45–90 minutos la primera vez.
- Requisitos previos: proyecto Supabase activo y variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` en tu app.

## 2. Tabla de contenidos

1. Acerca de este documento
2. Tabla de contenidos
3. Conceptos clave (no técnicos)
4. Objetivo
5. Requisitos previos
6. Diseño de usuarios enlazado a Auth
7. Pasos detallados (implementación)
   - 7.0 Abrir el SQL Editor de Supabase
   - 7.1 Activar extensión de IDs
   - 7.2 Crear funciones de normalización
   - 7.3 Crear tablas base
   - 7.4 Triggers de normalización
   - 7.5 Copia automática de RUT
   - 7.6 Onboarding y sincronización de email
   - 7.7 Activar RLS y políticas
   - 7.8 Índices recomendados
   - 7.9 Auditoría de cambios
8. Integración con agentes de llamada (ElevenLabs)
9. Pruebas rápidas
   - 9.1 Probar registro automático
   - 9.2 Prueba rápida
10. Automatizaciones (requerido)
11. Extensiones opcionales
12. Checklist de implementación
13. Solución de problemas (troubleshooting)
14. Notas útiles

## 3. Conceptos clave (no técnicos)

- Perfil de usuario: `public.usuarios` refleja 1:1 a `auth.users` (mismo ID); simplifica seguridad y limpieza de datos.
- Datos normalizados: RUT y teléfono se transforman automáticamente a formatos estándar para evitar errores y duplicados.
- Triggers: reglas automáticas que corren al insertar/actualizar (por ejemplo, normalizar RUT y teléfonos).
- RLS (Row Level Security): seguridad por filas para que cada usuario solo vea/edite lo suyo.
- Agentes de llamada: configuración para llamadas automatizadas con proveedores externos.

---

## 4. Objetivo
- Crear todas las tablas nuevas (20 en total): 13 tablas base + 6 del módulo de llamadas (obligatorio) + 1 de auditoría; todas con seguridad por filas (RLS), funciones y triggers para normalizar RUT y teléfonos.
- Dejar lista la base para usar `contactos`, `deudas`, `historial`, `programaciones`, módulo de llamadas y automatizaciones.

---

## 5. Requisitos previos
- Tener un proyecto en Supabase y acceso al Dashboard.
- (En tu app) ya tener variables `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

---

## 6. Diseño de usuarios enlazado a Auth

**Concepto clave**: Tu tabla `public.usuarios` será un "perfil" 1:1 con `auth.users`.

- `public.usuarios.id` = `auth.users.id` (mismo UUID, FK y PK).
- **Ventajas**: 
  - Un solo ID para todo el sistema.
  - RLS simple: `auth.uid() = usuario_id` en todas las tablas.
  - Separación clara: Auth maneja identidad, `public` maneja datos de negocio.
  - Limpieza automática: si se borra en Auth, se borran todos los datos (`ON DELETE CASCADE`).

---

## 7. Pasos detallados (implementación)

### 7.0 Abrir el SQL Editor de Supabase
- Dashboard > Database > SQL Editor > New query.

### 7.1 Activar la extensión para IDs automáticos
- Habilita `gen_random_uuid()` para generar IDs únicos.
  - Qué harás: activar la extensión `pgcrypto` para generar UUIDs.
  - Por qué: permite IDs únicos automáticos en todas las tablas.
  - Dónde hacerlo: Supabase > Database > SQL Editor > New query.
  - Verificación: la ejecución responde "CREATE EXTENSION" o "already exists".
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 7.2 Crear funciones necesarias (en este orden)
  - Qué harás: crear funciones para normalizar RUT y teléfonos, y la función de trigger para RUT.
  - Por qué: asegurar formatos consistentes y válidos de forma automática.
  - Dónde hacerlo: Supabase > Database > SQL Editor > New query.
  - Verificación: la ejecución finaliza sin errores.
```sql
-- Normaliza RUT al formato 19090595-0
-- Dígito verificador para RUT (módulo 11)
-- CORREGIDO: Algoritmo de validación ahora funciona correctamente
CREATE OR REPLACE FUNCTION rut_dv(num text) RETURNS text AS $$
DECLARE 
  s int := 0; 
  m int := 2; 
  i int; 
  c int;
BEGIN
  -- Recorrer el RUT de derecha a izquierda
  FOR i IN REVERSE length(num)..1 LOOP
    s := s + (substring(num, i, 1)::int * m);
    m := CASE WHEN m = 7 THEN 2 ELSE m + 1 END;
  END LOOP;
  
  -- Calcular el dígito verificador
  c := 11 - (s % 11);
  
  IF c = 11 THEN 
    RETURN '0';
  ELSIF c = 10 THEN 
    RETURN 'k';
  ELSE 
    RETURN c::text;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION normalize_rut(rut text) RETURNS text AS $$
DECLARE 
  raw text; 
  digit_part text; 
  dv text; 
  calculated_dv text;
BEGIN
  -- Validaciones básicas
  IF rut IS NULL OR length(rut) > 20 THEN
    RAISE EXCEPTION 'RUT inválido o sospechoso: %', rut;
  END IF;
  
  -- Rechazar caracteres peligrosos
  IF rut ~ '[;''"]' THEN
    RAISE EXCEPTION 'RUT contiene caracteres peligrosos: %', rut;
  END IF;
  
  -- Limpiar el RUT (quitar puntos, mantener guión y K)
  raw := regexp_replace(lower(trim(rut)), '[^0-9kK-]', '', 'g');
  
  -- Separar cuerpo y dígito verificador
  IF position('-' in raw) > 0 THEN
    digit_part := split_part(raw, '-', 1);
    dv := lower(split_part(raw, '-', 2));
  ELSE
    -- Si no tiene guión, tomar todo excepto el último carácter
    IF length(raw) >= 8 THEN
      digit_part := substring(raw, 1, length(raw) - 1);
      dv := lower(substring(raw, length(raw), 1));
    ELSE
      digit_part := raw;
      dv := NULL;
    END IF;
  END IF;
  
  -- Validar formato
  IF digit_part !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Formato de RUT inválido: %', rut;
  END IF;
  
  IF dv IS NOT NULL AND dv !~ '^[0-9k]$' THEN
    RAISE EXCEPTION 'Dígito verificador inválido en formato: %', rut;
  END IF;
  
  -- Calcular el dígito verificador correcto
  calculated_dv := rut_dv(digit_part);
  
  -- Validar si se proporcionó un DV
  IF dv IS NOT NULL AND dv != calculated_dv THEN
    RAISE EXCEPTION 'Dígito verificador inválido para RUT: % (esperado: %, recibido: %)', rut, calculated_dv, dv;
  END IF;
  
  -- Retornar RUT normalizado
  RETURN digit_part || '-' || calculated_dv;
END;
$$ LANGUAGE plpgsql;

-- Normaliza teléfono chileno al formato +569XXXXXXXX
-- CORREGIDO: Regex de validación mejorado para evitar rechazar teléfonos válidos
CREATE OR REPLACE FUNCTION normalize_phone(phone text) RETURNS text AS $$
DECLARE 
  clean_phone text;
BEGIN
  -- Validación de entrada
  IF phone IS NULL THEN
    RAISE EXCEPTION 'Teléfono no puede ser NULL';
  END IF;
  
  -- Rechazar caracteres peligrosos (inyección SQL)
  -- CORREGIDO: eliminado el regex problemático [;''"--]
  IF phone ~ '[;''"]' THEN
    RAISE EXCEPTION 'Teléfono contiene caracteres peligrosos: %', phone;
  END IF;
  
  -- Limpiar: quitar espacios y caracteres excepto números y +
  clean_phone := regexp_replace(trim(phone), '[^0-9+]', '', 'g');
  
  -- Validar longitud después de limpiar
  IF length(clean_phone) < 8 OR length(clean_phone) > 15 THEN
    RAISE EXCEPTION 'Longitud de teléfono inválida: % (limpio: %)', phone, clean_phone;
  END IF;
  
  -- Normalizar a formato chileno +569XXXXXXXX
  IF clean_phone ~ '^9[0-9]{8}$' THEN
    -- Formato: 912345678 → +56912345678
    clean_phone := '+56' || clean_phone;
  ELSIF clean_phone ~ '^569[0-9]{8}$' THEN
    -- Formato: 56912345678 → +56912345678
    clean_phone := '+' || clean_phone;
  ELSIF clean_phone ~ '^\+569[0-9]{8}$' THEN
    -- Formato: +56912345678 → ya está bien
    -- no hacer nada
  ELSE
    RAISE EXCEPTION 'Formato de teléfono inválido: % (esperado: +569XXXXXXXX)', phone;
  END IF;
  
  RETURN clean_phone;
END;
$$ LANGUAGE plpgsql;

-- Trigger function para normalizar RUT en la tabla deudores
CREATE OR REPLACE FUNCTION normalize_rut_trigger() RETURNS trigger AS $$
BEGIN
  NEW.rut := normalize_rut(NEW.rut);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 7.3 Crear las tablas
- Crea las 13 tablas en este orden (cada una con su `CREATE TABLE`):
  - `suscripciones`, `usuarios`, `deudores`, `contactos`, `deudas`, `campanas`, `programaciones`, `historial`, `plantillas`, `pagos`, `pagos_usuarios`, `usos`, `configuraciones`.

  - Qué harás: crear las tablas base del sistema en el orden indicado.
  - Por qué: establecen la estructura de datos para toda la operación.
  - Dónde hacerlo: Supabase > Database > SQL Editor > New query.
  - Resumen no técnico de cada tabla:
    - suscripciones: planes y límites de uso.
    - usuarios: perfil de cliente enlazado a Auth.
    - deudores: personas/empresas a las que se cobra.
    - contactos: emails/teléfonos del deudor.
    - deudas: montos y vencimientos.
    - plantillas: mensajes prediseñados por canal.
    - campanas: orquestaciones/journeys.
    - programaciones: agenda de ejecuciones.
    - historial: trazabilidad de acciones.
    - pagos: pagos de deudas.
    - pagos_usuarios: pagos de suscripción.
    - usos: métricas de consumo y costos.
    - configuraciones: parámetros por usuario o globales.
  - Verificación: cada `CREATE TABLE` se ejecuta sin errores.

**Tabla suscripciones (debe crearse primero):**
```sql
CREATE TABLE suscripciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    descripcion text,
    precio_mensual numeric NOT NULL,
    limite_emails integer NOT NULL,
    limite_llamadas integer NOT NULL,
    limite_sms integer NOT NULL DEFAULT 0,
    limite_whatsapp integer NOT NULL DEFAULT 0,
    limite_memoria_mb numeric NOT NULL,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);
```

**Tabla usuarios (enlazada a auth.users):**
```sql
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  nombre_empresa text NOT NULL,
  plan_suscripcion_id uuid REFERENCES public.suscripciones(id),
  created_at timestamptz DEFAULT now()
);
```

**Actualización de usuarios (campos de suscripción):**
```sql
-- Agregar campos adicionales para suscripciones
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS fecha_inicio_suscripcion timestamptz,
ADD COLUMN IF NOT EXISTS fecha_renovacion timestamptz,
ADD COLUMN IF NOT EXISTS estado_suscripcion text DEFAULT 'activo' 
  CHECK (estado_suscripcion IN ('activo', 'vencido', 'cancelado', 'suspendido'));
```

**Resto de tablas (completas):**

```sql
-- Tabla: deudores
CREATE TABLE deudores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES usuarios(id) NOT NULL,
    rut text NOT NULL,
    nombre text NOT NULL,
    created_at timestamptz DEFAULT now()
    -- NOTA: Se eliminó CONSTRAINT unique_rut_por_usuario para permitir duplicados
    -- y simplificar la experiencia del usuario al agregar deudores
);
CREATE INDEX idx_deudores_rut ON deudores(rut);
CREATE INDEX IF NOT EXISTS idx_deudores_usuario_rut ON deudores(usuario_id, rut);
```

```sql
-- Tabla: contactos
CREATE TABLE contactos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES usuarios(id) NOT NULL,
    deudor_id uuid REFERENCES deudores(id) NOT NULL,
    rut text NOT NULL,
    tipo_contacto text NOT NULL CHECK (tipo_contacto IN ('email', 'telefono', 'sms', 'whatsapp')),
    valor text NOT NULL,
    preferido boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_contactos_rut ON contactos(rut);
CREATE INDEX idx_contactos_deudor_id ON contactos(deudor_id);
```

```sql
-- Tabla: deudas
CREATE TABLE deudas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES usuarios(id) NOT NULL,
    deudor_id uuid REFERENCES deudores(id) NOT NULL,
    rut text NOT NULL,
    monto numeric NOT NULL,
    fecha_vencimiento date NOT NULL,
    estado text NOT NULL CHECK (estado IN ('nueva','pendiente','pagado')),
    created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_deudas_rut ON deudas(rut);
CREATE INDEX idx_deudas_deudor_id ON deudas(deudor_id);
```

```sql
-- Tabla: plantillas
CREATE TABLE plantillas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES usuarios(id) NOT NULL,
    nombre text NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('email', 'voz', 'sms', 'whatsapp')),
    tipo_contenido text NOT NULL DEFAULT 'texto' CHECK (tipo_contenido IN ('texto', 'html')),
    contenido text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- UP: agregar columna "asunto" a la tabla plantillas
begin;

alter table if exists public.plantillas
  add column if not exists asunto text;

comment on column public.plantillas.asunto is 'Asunto del email de la plantilla (solo aplica cuando tipo = email)';

commit;

```

```sql
-- Tabla: campanas
CREATE TABLE campanas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES usuarios(id) NOT NULL,
    nombre text NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('email', 'llamada', 'sms', 'whatsapp', 'mixto')),
    plantilla_id uuid REFERENCES plantillas(id),
    programacion jsonb NOT NULL,
    deudas_asignadas uuid[] NOT NULL,
    activa boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);
```

```sql
-- Tabla: programaciones
-- NOTA IMPORTANTE: campana_id referencia workflows_cobranza (no campanas)
-- Esta corrección se aplicó en Noviembre 2024 para alinear con la nueva implementación de workflows
CREATE TABLE programaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES usuarios(id) NOT NULL,
    deuda_id uuid REFERENCES deudas(id) NOT NULL,
    rut text NOT NULL,
    contacto_id uuid REFERENCES contactos(id),
    campana_id uuid REFERENCES workflows_cobranza(id) ON DELETE SET NULL,
    tipo_accion text NOT NULL CHECK (tipo_accion IN ('email', 'llamada', 'sms', 'whatsapp')),
    fecha_programada timestamptz NOT NULL,
    plantilla_id uuid REFERENCES plantillas(id),
    estado text NOT NULL CHECK (estado IN ('pendiente', 'ejecutando', 'ejecutado', 'cancelado')),
    created_at timestamptz DEFAULT now(),
    CONSTRAINT unique_accion_por_deuda UNIQUE (deuda_id, tipo_accion, fecha_programada)
);
CREATE INDEX idx_programaciones_rut ON programaciones(rut);
```

```sql
-- Tabla: historial
CREATE TABLE historial (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES usuarios(id) NOT NULL,
    deuda_id uuid REFERENCES deudas(id) NOT NULL,
    rut text NOT NULL,
    contacto_id uuid REFERENCES contactos(id),
    campana_id uuid REFERENCES campanas(id),
    tipo_accion text NOT NULL CHECK (tipo_accion IN ('email', 'llamada', 'sms', 'whatsapp')),
    fecha timestamptz NOT NULL,
    estado text NOT NULL,
    detalles jsonb,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_historial_rut ON historial(rut);
```

```sql
-- Tabla: pagos
CREATE TABLE pagos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES usuarios(id) NOT NULL,
    deuda_id uuid REFERENCES deudas(id) NOT NULL,
    rut text NOT NULL,
    monto_pagado numeric NOT NULL,
    fecha_pago timestamptz NOT NULL,
    metodo text NOT NULL,
    estado text NOT NULL CHECK (estado IN ('confirmado', 'pendiente')),
    referencia_externa text,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_pagos_rut ON pagos(rut);
```

```sql
-- Tabla: pagos_usuarios
CREATE TABLE pagos_usuarios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES usuarios(id) NOT NULL,
    suscripcion_id uuid REFERENCES suscripciones(id) NOT NULL,
    monto_pagado numeric NOT NULL,
    fecha_pago timestamptz NOT NULL,
    metodo text NOT NULL,
    estado text NOT NULL CHECK (estado IN ('confirmado', 'pendiente')),
    referencia_externa text,
    created_at timestamptz DEFAULT now()
);
```

```sql
-- Tabla: usos
CREATE TABLE usos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES usuarios(id) NOT NULL,
    deudor_id uuid REFERENCES deudores(id),
    rut text,
    emails_enviados integer DEFAULT 0,
    llamadas_ejecutadas integer DEFAULT 0,
    sms_enviados integer DEFAULT 0,
    whatsapp_enviados integer DEFAULT 0,
    duracion_llamadas numeric DEFAULT 0,
    memoria_db_usada numeric DEFAULT 0,
    costo_emails numeric DEFAULT 0,
    costo_llamadas numeric DEFAULT 0,
    costo_sms numeric DEFAULT 0,
    costo_whatsapp numeric DEFAULT 0,
    costo_db numeric DEFAULT 0,
    costo_total numeric DEFAULT 0,
    periodo text NOT NULL,
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_usos_rut ON usos(rut);
```

```sql
-- Tabla: facturas
CREATE TABLE facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id) NOT NULL,
  suscripcion_id uuid REFERENCES suscripciones(id),
  monto numeric NOT NULL,
  fecha timestamptz NOT NULL,
  periodo text NOT NULL, -- "2025-01" formato
  descripcion text,
  estado text NOT NULL CHECK (estado IN ('generada', 'pagada', 'vencida')),
  pdf_url text,
  detalles jsonb, -- Items desglosados
  created_at timestamptz DEFAULT now()
);
```

```sql
-- Tabla: configuraciones
-- Nota: usuario_id puede ser NULL para configuraciones globales (aplican a toda la plataforma)
--       o contener un UUID para configuraciones específicas de un usuario
CREATE TABLE configuraciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES usuarios(id),  -- NULL = global, UUID = por usuario
    clave text NOT NULL,
    valor jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);
```

### 7.4 Crear triggers de normalización
  - Qué harás: activar triggers que normalizan RUT, teléfonos y validan emails al insertar/actualizar.
  - Por qué: evita datos inválidos y mantiene consistencia.
  - Dónde hacerlo: Supabase > Database > SQL Editor > New query.
  - Verificación: al insertar un deudor/contacto, se normaliza automáticamente.
```sql
-- Trigger que normaliza RUT en deudores
CREATE TRIGGER normalize_rut_deudores
  BEFORE INSERT OR UPDATE ON deudores
  FOR EACH ROW EXECUTE FUNCTION normalize_rut_trigger();

-- Función para normalizar contactos (debe declararse antes del trigger)
CREATE OR REPLACE FUNCTION normalize_contactos_trigger() RETURNS trigger AS $$
BEGIN
  -- Validar referencia de deudor (autorización básica por existencia)
  IF NEW.deudor_id IS NULL OR NOT EXISTS (SELECT 1 FROM deudores WHERE id = NEW.deudor_id) THEN
    RAISE EXCEPTION 'Deudor inválido o inexistente';
  END IF;

  -- Normalizar RUT
  NEW.rut := normalize_rut(NEW.rut);

  -- Normalizar teléfono para 'telefono', 'sms', 'whatsapp' o validar email
  IF NEW.tipo_contacto IN ('telefono', 'sms', 'whatsapp') THEN
    NEW.valor := normalize_phone(NEW.valor);
  ELSIF NEW.tipo_contacto = 'email' THEN
    IF NEW.valor IS NULL OR length(NEW.valor) > 100
       OR NEW.valor !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Email inválido: %', NEW.valor;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que normaliza RUT y teléfonos/emails en contactos
CREATE TRIGGER normalize_contactos
  BEFORE INSERT OR UPDATE ON contactos
  FOR EACH ROW EXECUTE FUNCTION normalize_contactos_trigger();
```

### 7.5 Copiar RUT automáticamente a tablas relacionadas
- Evita rellenar `rut` a mano al crear `deudas`, `programaciones`, `historial`, `pagos` o `usos`.
  - Qué harás: crear funciones y triggers que copian el RUT desde el deudor o deuda.
  - Por qué: reduce errores manuales y garantiza consistencia de datos.
  - Dónde hacerlo: Supabase > Database > SQL Editor > New query.
  - Verificación: al crear una deuda o programación, el `rut` queda completado automáticamente.
```sql
CREATE OR REPLACE FUNCTION copy_rut_from_deudores() RETURNS trigger AS $$
DECLARE lock_key bigint;
BEGIN
  IF NEW.deudor_id IS NULL OR NOT EXISTS (SELECT 1 FROM deudores WHERE id = NEW.deudor_id) THEN
    RAISE EXCEPTION 'Deudor no existe: %', NEW.deudor_id;
  END IF;

  -- Derivar una clave bigint desde el UUID para advisory locks
  lock_key := hashtextextended(NEW.deudor_id::text, 0);
  PERFORM pg_advisory_lock(lock_key);
  BEGIN
    NEW.rut := (SELECT rut FROM deudores WHERE id = NEW.deudor_id);
    PERFORM pg_advisory_unlock(lock_key);
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(lock_key);
    RAISE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Copia RUT cuando la tabla tiene deuda_id (programaciones, historial, pagos)
CREATE OR REPLACE FUNCTION copy_rut_from_deuda() RETURNS trigger AS $$
BEGIN
  NEW.rut := (
    SELECT ddr.rut
    FROM deudas de
    JOIN deudores ddr ON ddr.id = de.deudor_id
    WHERE de.id = NEW.deuda_id
  );
  -- Validación explícita: si no se encontró RUT, probablemente deuda_id es inválido
  IF NEW.rut IS NULL THEN
    RAISE EXCEPTION 'No se pudo obtener RUT para deuda_id: %', NEW.deuda_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_rut_deudas         BEFORE INSERT ON deudas         FOR EACH ROW EXECUTE FUNCTION copy_rut_from_deudores();
CREATE TRIGGER set_rut_programaciones BEFORE INSERT ON programaciones FOR EACH ROW EXECUTE FUNCTION copy_rut_from_deuda();
CREATE TRIGGER set_rut_historial      BEFORE INSERT ON historial      FOR EACH ROW EXECUTE FUNCTION copy_rut_from_deuda();
CREATE TRIGGER set_rut_pagos          BEFORE INSERT ON pagos          FOR EACH ROW EXECUTE FUNCTION copy_rut_from_deuda();
CREATE TRIGGER set_rut_usos           BEFORE INSERT ON usos           FOR EACH ROW WHEN (NEW.deudor_id IS NOT NULL) EXECUTE FUNCTION copy_rut_from_deudores();
```

### 7.6 Crear triggers de onboarding y sincronización de email
- Automatiza la creación del perfil cuando alguien se registra en Auth.
  - Qué harás: crear triggers para crear el perfil en `public.usuarios` y sincronizar cambios de email.
  - Por qué: automatiza el alta y mantiene alineados los datos de Auth y `public`.
  - Dónde hacerlo: Supabase > Database > SQL Editor > New query.
  - Verificación: registrarte en la app crea automáticamente tu perfil en `public.usuarios`.
  - Seguridad: `SECURITY DEFINER` sin validaciones fuertes permite abusos; se incluyen validaciones de email y duplicados en las funciones para mitigar riesgos.
```sql
-- Función: crea perfil en public.usuarios cuando nace un auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
     OR length(NEW.email) > 100
     OR EXISTS (SELECT 1 FROM public.usuarios WHERE id = NEW.id)
  THEN
    RAISE EXCEPTION 'Registro inválido o duplicado';
  END IF;

  INSERT INTO public.usuarios (id, email, nombre_empresa)
  VALUES (NEW.id, NEW.email, 'Mi PyME');
  RETURN NEW;
END;
$$;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- (Opcional) Sincronizar cambios de email
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
     OR length(NEW.email) > 100
  THEN
    RAISE EXCEPTION 'Email inválido en actualización';
  END IF;

  UPDATE public.usuarios SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_email();
```

### 7.7 Activar RLS (seguridad por filas)
- Actívalo por tabla. Las políticas del tipo "Filtro por usuario" vienen en el script del esquema.

  - Qué harás: activar RLS y definir políticas para que cada usuario solo acceda a sus filas.
  - Por qué: proteger los datos por inquilino/cliente a nivel de base de datos.
  - Dónde hacerlo: Supabase > Database > SQL Editor > New query.
  - Verificación: desde tu app, verás solo datos del usuario autenticado.

**Política especial para usuarios:**
```sql
-- RLS para public.usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfil: owner acceso total"
ON public.usuarios
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

**RLS para las tablas:**
```sql
-- Activar RLS
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE deudores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE deudas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE programaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

-- Políticas para tablas con usuario_id
CREATE POLICY "Filtro por usuario en deudores" ON deudores FOR ALL USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Filtro por usuario en contactos" ON contactos FOR ALL USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Filtro por usuario en deudas" ON deudas FOR ALL USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Filtro por usuario en campanas" ON campanas FOR ALL USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Filtro por usuario en programaciones" ON programaciones FOR ALL USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Filtro por usuario en historial" ON historial FOR ALL USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Filtro por usuario en plantillas" ON plantillas FOR ALL USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Filtro por usuario en pagos" ON pagos FOR ALL USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Filtro por usuario en pagos_usuarios" ON pagos_usuarios FOR ALL USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Filtro por usuario en usos" ON usos FOR ALL USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Filtro por usuario en facturas" ON facturas FOR ALL USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

-- Políticas para configuraciones: permite leer globales (usuario_id NULL) y propias; solo modificar propias
CREATE POLICY "Leer configuraciones" ON configuraciones 
FOR SELECT 
USING (usuario_id IS NULL OR auth.uid() = usuario_id);

CREATE POLICY "Crear configuraciones propias" ON configuraciones 
FOR INSERT 
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Actualizar configuraciones propias" ON configuraciones 
FOR UPDATE 
USING (auth.uid() = usuario_id)
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Eliminar configuraciones propias" ON configuraciones 
FOR DELETE 
USING (auth.uid() = usuario_id);

-- Políticas para 'suscripciones': lectura global; edición solo admin (reemplaza TU_UUID_ADMIN_REAL)
CREATE POLICY "Lectura global suscripciones"
ON suscripciones
FOR SELECT
USING (true);

-- Reemplaza 'TU_UUID_ADMIN_REAL' por tu UUID real de auth.users
CREATE POLICY "Edición solo admin suscripciones"
ON suscripciones
FOR ALL
USING (auth.uid() = 'TU_UUID_ADMIN_REAL')
WITH CHECK (auth.uid() = 'TU_UUID_ADMIN_REAL');
```

**Nota**: Todas las tablas con `usuario_id` usan la política `USING (auth.uid() = usuario_id)`.

### 7.8 Índices recomendados (rendimiento con RLS)
  - Qué harás: crear índices por `usuario_id` y otros campos críticos.
  - Por qué: mejorar el rendimiento de consultas bajo RLS.
  - Dónde hacerlo: Supabase > Database > SQL Editor > New query.
  - Verificación: los `CREATE INDEX` finalizan sin errores.
```sql
-- Índices básicos por usuario_id
CREATE INDEX IF NOT EXISTS idx_deudores_usuario_id        ON deudores(usuario_id);
CREATE INDEX IF NOT EXISTS idx_contactos_usuario_id       ON contactos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_deudas_usuario_id          ON deudas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_campanas_usuario_id        ON campanas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_programaciones_usuario_id  ON programaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_usuario_id       ON historial(usuario_id);
CREATE INDEX IF NOT EXISTS idx_plantillas_usuario_id      ON plantillas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagos_usuario_id           ON pagos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pagos_usuarios_usuario_id  ON pagos_usuarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usos_usuario_id            ON usos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_configuraciones_usuario_id ON configuraciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_facturas_usuario_id        ON facturas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_facturas_periodo           ON facturas(periodo);
CREATE INDEX IF NOT EXISTS idx_facturas_estado            ON facturas(estado);

-- Índices compuestos opcionales
CREATE INDEX IF NOT EXISTS idx_programaciones_user_estado_fecha
ON programaciones(usuario_id, estado, fecha_programada);

CREATE INDEX IF NOT EXISTS idx_deudas_user_estado_venc
ON deudas(usuario_id, estado, fecha_vencimiento);
```

---

### 7.9 Auditoría de cambios
- Qué harás: crear una tabla de auditoría y un trigger para registrar cambios en tablas críticas.
- Por qué: sin logs es difícil detectar/analizar cambios sensibles; la auditoría agrega trazabilidad.
- Dónde hacerlo: Supabase > Database > SQL Editor > New query.
- Verificación: al insertar/actualizar/borrar en `usuarios`, se crea una fila en `auditoria`.
```sql
CREATE TABLE IF NOT EXISTS auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla text NOT NULL,
  operacion text NOT NULL,
  usuario_id uuid,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  timestamp timestamptz DEFAULT now()
);

-- Índices recomendados para consultas frecuentes en auditoría
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id_timestamp ON auditoria(usuario_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla_timestamp ON auditoria(tabla, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp ON auditoria(timestamp DESC);

CREATE OR REPLACE FUNCTION log_cambios_usuarios() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO auditoria (tabla, operacion, usuario_id, datos_anteriores, datos_nuevos)
  VALUES ('usuarios', TG_OP, auth.uid(), row_to_json(OLD), row_to_json(NEW));
  -- Usar COALESCE para soportar DELETE (donde NEW es NULL)
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_usuarios ON usuarios;
CREATE TRIGGER trg_log_usuarios
AFTER INSERT OR UPDATE OR DELETE ON usuarios
FOR EACH ROW EXECUTE FUNCTION log_cambios_usuarios();
```

Notas:
- Puedes replicar el patrón para `pagos`, `deudas`, `historial` u otras tablas sensibles creando funciones y triggers equivalentes.
- Opción 1 (solo backend con service key; recomendado si no necesitas lecturas desde el cliente):
```sql
-- Revocar permisos a roles de cliente
REVOKE ALL ON TABLE auditoria FROM anon, authenticated;
-- (Opcional) si tuvieras una secuencia dedicada
-- REVOKE ALL ON SEQUENCE auditoria_id_seq FROM anon, authenticated;
```
- La función de trigger `log_cambios_usuarios` usa `SECURITY DEFINER` para poder insertar en `auditoria` aunque los roles de cliente no tengan permisos.
- Si en algún momento necesitas lecturas con RLS, usa la Opción 2 (activar RLS y definir políticas específicas) en lugar de esta.

## 8. Integración con agentes de llamada (ElevenLabs) — SQL por pasos

Esta sección agrega el soporte para configurar y operar agentes de llamada (ElevenLabs) con:
- Agentes globales/custom con múltiples predeterminados por prioridad.
- Inventario de números en pool compartido (con límites y auditoría), y asignación híbrida (default con fallback dinámico).
- Variables por llamada usando `plantillas.tipo='voz'` + `programaciones.vars`.
- Transcripciones por conversación y turnos.

Referencias recomendadas: [Quickstart](https://elevenlabs.io/docs/quickstart), [API Reference · Introduction](https://elevenlabs.io/docs/api-reference/introduction).

- Qué es: soporte para configurar agentes, números, selección automática y transcripciones.
- Dónde hacerlo: todo el SQL en Supabase > Database > SQL Editor; la selección y operación se implementan en el backend de tu app.

### Paso 1) Tabla `llamada_agente` (multi‑agente, predeterminados con prioridad, global/custom)

```sql
-- Tabla de agentes (global: usuario_id NULL; custom: usuario_id = auth.uid())
CREATE TABLE IF NOT EXISTS llamada_agente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  agent_id text NOT NULL,                          -- id del agente en ElevenLabs
  nombre text,
  provider text NOT NULL CHECK (provider IN ('twilio','sip_trunk')),
  agent_phone_number_id text,                      -- número por defecto (opcional)
  es_predeterminado boolean NOT NULL DEFAULT false,
  prioridad integer NOT NULL DEFAULT 100,          -- menor = mayor prioridad
  -- Configuración de voz/habla
  model_id text,
  voice_id text,
  speaking_rate numeric(5,2),                      -- ej: 1.00 estándar
  pitch numeric(5,2),                              -- semitonos relativos, si aplica
  style text,
  language text,
  prompt_base text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_llamada_agente_scope UNIQUE (usuario_id, agent_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_llamada_agente_usuario_id ON llamada_agente(usuario_id);
CREATE INDEX IF NOT EXISTS idx_llamada_agente_predeterminado ON llamada_agente(usuario_id, es_predeterminado, prioridad);
-- Evitar duplicados del mismo agent_id en ámbito global (usuario_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_llamada_agente_global ON llamada_agente(agent_id) WHERE usuario_id IS NULL;

-- RLS
ALTER TABLE llamada_agente ENABLE ROW LEVEL SECURITY;

-- Ver globales (usuario_id IS NULL) o los propios (solo autenticados)
DROP POLICY IF EXISTS sel_llamada_agente ON llamada_agente;
CREATE POLICY sel_llamada_agente
ON llamada_agente
FOR SELECT TO authenticated
USING (usuario_id IS NULL OR usuario_id = auth.uid());

-- Mutaciones solo del dueño (no globales)
DROP POLICY IF EXISTS mut_llamada_agente ON llamada_agente;
CREATE POLICY mut_llamada_agente
ON llamada_agente
FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY upd_llamada_agente
ON llamada_agente
FOR UPDATE TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY del_llamada_agente
ON llamada_agente
FOR DELETE TO authenticated
USING (usuario_id = auth.uid());
```

### Paso 1.1) Configuración de agentes predeterminados en la plataforma

**Para el dueño de la plataforma (Admin):**
- Pantalla: "Gestión de Agentes Globales"
- Lista de todos los agentes globales (`usuario_id = NULL`)
- Para cada agente:
  - ✅ Checkbox "Es predeterminado" (`es_predeterminado`)
  - 🔢 Campo "Prioridad" (`prioridad`) - menor número = mayor importancia
  - 📝 Nombre del agente
  - 🎯 Tipo/Propósito (ej: "Cobranza amigable", "Cobranza firme", "Horario nocturno")

**Para usuarios (Empresas):**
- Pantalla: "Mis Agentes"
- Lista de sus agentes personalizados (`usuario_id = su_id`)
- Misma configuración: checkbox predeterminado + prioridad
- Pueden crear múltiples agentes para diferentes necesidades

**Lógica de selección automática:**
1. Usuario especifica agente → usar ese (sea propio o global)
2. Usuario no especifica →
   - Primero: sus agentes predeterminados (ordenados por prioridad)
   - Si no tiene: agentes globales predeterminados (ordenados por prioridad)

### Paso 1.2) Índice y consulta de selección automática de agentes

```sql
-- 📝 NOTA: El siguiente comando REEMPLAZA el índice anterior por uno más eficiente.
-- Es normal borrar el anterior y crear uno nuevo. Esto no indica un error.
-- El nuevo índice será más rápido porque incluye una cláusula WHERE que lo hace más selectivo.
DROP INDEX IF EXISTS idx_llamada_agente_predeterminado;

CREATE INDEX IF NOT EXISTS idx_llamada_agente_selector 
ON llamada_agente(usuario_id, es_predeterminado, prioridad, activo) 
WHERE es_predeterminado = true AND activo = true;
```

```sql
-- ⚠️ WARNING: ESTO ES SOLO UN EJEMPLO - NO EJECUTAR EN SQL EDITOR ⚠️
-- Selección automática de agente (cuando no se especifica uno)
-- Este SELECT es solo para mostrar cómo usar la tabla desde tu aplicación
-- NO lo copies al SQL Editor de Supabase
SELECT id, agent_id, nombre, prioridad
FROM llamada_agente
WHERE (usuario_id = :usuario_id OR usuario_id IS NULL)
  AND es_predeterminado = true 
  AND activo = true
ORDER BY 
  CASE WHEN usuario_id = :usuario_id THEN 0 ELSE 1 END,  -- prioriza agentes del usuario
  prioridad ASC,                                          -- luego por prioridad
  created_at ASC                                          -- desempate por antigüedad
LIMIT 1;
```

### Paso 2) Inventario `phone_numbers` (pool compartido con límites y estados)

```sql
CREATE TABLE IF NOT EXISTS phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NULL REFERENCES public.usuarios(id) ON DELETE CASCADE, -- NULL=global
  provider text NOT NULL CHECK (provider IN ('twilio','sip_trunk')),
  elevenlabs_phone_number_id text UNIQUE NOT NULL,  -- id en ElevenLabs
  e164 text NOT NULL,                               -- +56...
  supports_outbound boolean NOT NULL DEFAULT true,
  -- Propiedad/compartición
  sharing_mode text NOT NULL CHECK (sharing_mode IN ('exclusive','shared')) DEFAULT 'shared',
  owner_usuario_id uuid NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  -- Capacidad / tasa / métricas
  limite_concurrencia integer NOT NULL DEFAULT 3,
  cps_max integer NOT NULL DEFAULT 2,               -- llamadas/seg máx
  llamadas_en_curso integer NOT NULL DEFAULT 0,
  uso_ventana_1m integer NOT NULL DEFAULT 0,        -- calls último minuto
  uso_total bigint NOT NULL DEFAULT 0,
  last_assigned_at timestamptz,
  last_used_at timestamptz,
  -- Estado operativo
  estado text NOT NULL CHECK (estado IN ('disponible','asignado','retirando','retirado','suspendido')) DEFAULT 'disponible',
  estado_changed_at timestamptz DEFAULT now(),
  estado_reason text,
  retirado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_phone_numbers_usuario_id ON phone_numbers(usuario_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_owner_usuario_id ON phone_numbers(owner_usuario_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_estado ON phone_numbers(estado);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_capacidad ON phone_numbers(estado, llamadas_en_curso, uso_ventana_1m, uso_total, last_assigned_at);
-- Número E.164 único (usando índice único para simplicidad)
CREATE UNIQUE INDEX IF NOT EXISTS uq_phone_numbers_e164 ON phone_numbers(e164);

-- RLS (ver globales o los propios; solo autenticados)
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sel_phone_numbers ON phone_numbers;
CREATE POLICY sel_phone_numbers
ON phone_numbers
FOR SELECT TO authenticated
USING (
  -- visibles si globales o del dueño del número o del ámbito del usuario
  usuario_id IS NULL OR usuario_id = auth.uid() OR owner_usuario_id = auth.uid()
);

-- Mutaciones solo del dueño del registro (cuando usuario_id no es NULL)
DROP POLICY IF EXISTS mut_phone_numbers ON phone_numbers;
CREATE POLICY mut_phone_numbers
ON phone_numbers
FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY upd_phone_numbers
ON phone_numbers
FOR UPDATE TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY del_phone_numbers
ON phone_numbers
FOR DELETE TO authenticated
USING (usuario_id = auth.uid());
```

### Paso 3) Accesos por usuario a números compartidos `phone_numbers_usuarios`

```sql
CREATE TABLE IF NOT EXISTS phone_numbers_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id uuid NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  prioridad integer NOT NULL DEFAULT 100,
  limite_concurrencia_usuario integer,
  estado_asignacion text NOT NULL CHECK (estado_asignacion IN ('activo','suspendido')) DEFAULT 'activo',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_phone_numbers_usuarios UNIQUE (phone_number_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_pnu_usuario ON phone_numbers_usuarios(usuario_id, is_default, prioridad);

ALTER TABLE phone_numbers_usuarios ENABLE ROW LEVEL SECURITY;

-- El usuario solo ve y gestiona sus asignaciones
DROP POLICY IF EXISTS sel_pnu ON phone_numbers_usuarios;
CREATE POLICY sel_pnu
ON phone_numbers_usuarios
FOR SELECT
USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS mut_pnu ON phone_numbers_usuarios;
CREATE POLICY mut_pnu
ON phone_numbers_usuarios
FOR ALL TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());
```

### Paso 4) Auditoría de cambios de estado `phone_number_eventos`

```sql
CREATE TABLE IF NOT EXISTS phone_number_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id uuid NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
  from_estado text,
  to_estado text NOT NULL,
  reason text,
  actor_usuario_id uuid NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  external_ref text, -- id de Twilio/ElevenLabs si aplica
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pne_phone_number_id ON phone_number_eventos(phone_number_id, created_at DESC);

ALTER TABLE phone_number_eventos ENABLE ROW LEVEL SECURITY;

-- Lectura: dueño del número o global; escritura normalmente vía service role
DROP POLICY IF EXISTS sel_pne ON phone_number_eventos;
CREATE POLICY sel_pne
ON phone_number_eventos
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM phone_numbers pn
    WHERE pn.id = phone_number_eventos.phone_number_id
      AND (pn.usuario_id IS NULL OR pn.usuario_id = auth.uid() OR pn.owner_usuario_id = auth.uid())
  )
);
```

Opcional (trigger de auditoría al cambiar `estado` en `phone_numbers`):

```sql
CREATE OR REPLACE FUNCTION log_phone_number_state_change() RETURNS trigger AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    NEW.estado_changed_at := now();
    INSERT INTO phone_number_eventos (phone_number_id, from_estado, to_estado, reason, actor_usuario_id)
    VALUES (NEW.id, OLD.estado, NEW.estado, COALESCE(NEW.estado_reason, 'state change'), auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_phone_number_state_change ON phone_numbers;
CREATE TRIGGER trg_log_phone_number_state_change
BEFORE UPDATE ON phone_numbers
FOR EACH ROW EXECUTE FUNCTION log_phone_number_state_change();
```

### Paso 5) Enlaces en `campanas`, `programaciones` y `historial`

```sql
-- Agente por campaña (opcional)
ALTER TABLE campanas
ADD COLUMN IF NOT EXISTS agente_id uuid REFERENCES llamada_agente(id);

-- En programaciones (llamadas)
ALTER TABLE programaciones
ADD COLUMN IF NOT EXISTS agente_id uuid REFERENCES llamada_agente(id),
ADD COLUMN IF NOT EXISTS vars jsonb,        -- variables para resolver plantilla (nombre, monto, etc.)
ADD COLUMN IF NOT EXISTS voz_config jsonb;  -- overrides de voz puntuales (opcional)

-- En historial (trazabilidad)
ALTER TABLE historial
ADD COLUMN IF NOT EXISTS agente_id uuid REFERENCES llamada_agente(id);
-- Nota: 'detalles' ya existe; ahí guardarás external_call_id, prompt_resuelto, estados, métricas.
```

### Paso 6) Conversaciones y turnos (transcripciones/memoria)

```sql
CREATE TABLE IF NOT EXISTS agente_conversaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  agente_id uuid REFERENCES llamada_agente(id) ON DELETE SET NULL,
  historial_id uuid REFERENCES historial(id) ON DELETE SET NULL,
  external_conversation_id text,         -- id de ElevenLabs/conversación
  resumen text,
  metrics jsonb,                         -- duración, costo, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ag_conv_usuario ON agente_conversaciones(usuario_id, agente_id, created_at DESC);

ALTER TABLE agente_conversaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY all_ag_conv
ON agente_conversaciones
FOR ALL TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

CREATE TABLE IF NOT EXISTS agente_conversacion_turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id uuid NOT NULL REFERENCES agente_conversaciones(id) ON DELETE CASCADE,
  turno integer NOT NULL,
  who text NOT NULL CHECK (who IN ('agente','deudor')),
  text text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CONSTRAINT uq_turno_por_conversacion UNIQUE (conversacion_id, turno)
);

CREATE INDEX IF NOT EXISTS idx_ag_turnos_conv ON agente_conversacion_turnos(conversacion_id, turno);

ALTER TABLE agente_conversacion_turnos ENABLE ROW LEVEL SECURITY;
CREATE POLICY sel_ag_turnos
ON agente_conversacion_turnos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM agente_conversaciones c
    WHERE c.id = agente_conversacion_turnos.conversacion_id
      AND c.usuario_id = auth.uid()
  )
);
CREATE POLICY mut_ag_turnos
ON agente_conversacion_turnos
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM agente_conversaciones c
    WHERE c.id = agente_conversacion_turnos.conversacion_id
      AND c.usuario_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM agente_conversaciones c
    WHERE c.id = agente_conversacion_turnos.conversacion_id
      AND c.usuario_id = auth.uid()
  )
);
```

### Paso 7) Selector (híbrido: default con fallback dinámico) (ejecutar después de implementado este documento)

Implementa la selección en backend (transacción) siguiendo:
- Intentar `llamada_agente.agent_phone_number_id` si `estado='disponible'` y con cupo: `llamadas_en_curso < limite_concurrencia` y cumpliendo `cps_max`.
- Si no hay capacidad, elegir candidato del pool (global o del usuario/puente) ordenando por:
  - `llamadas_en_curso ASC`, `uso_ventana_1m ASC`, `uso_total ASC`, `last_assigned_at ASC`.
- Usar bloqueo "skip locked" para evitar colisiones en concurrencia.
- Incrementar `llamadas_en_curso` al iniciar y decrementar al terminar (webhooks).

Ejemplo conceptual (ajústalo a tu lógica y filtros):

```sql
-- Dentro de una transacción
-- SELECT id FROM phone_numbers
-- WHERE estado = 'disponible'
--   AND llamadas_en_curso < limite_concurrencia
--   AND provider = :provider
-- ORDER BY llamadas_en_curso ASC, uso_ventana_1m ASC, uso_total ASC, COALESCE(last_assigned_at,'epoch'::timestamptz) ASC
-- FOR UPDATE SKIP LOCKED
-- LIMIT 1;
```

### Paso 8) Notas operativas (ejecutar después de implementado este documento)

- Compra/alta/baja de números: tú lo haces en Twilio; sincronizas con ElevenLabs (donde asocias números a agentes) y un job actualiza `phone_numbers` (alta como `disponible`, bajas `retirando → retirado` con re‑asignación).
- Variables por llamada: usa `plantillas.tipo='voz'` + `programaciones.vars` (JSONB) y guarda en `historial.detalles` `prompt_resuelto`, `vars` y `external_call_id`.
- API key: mantén el secreto en variables de entorno (ya configurado). SDK Node: ver [Quickstart](https://elevenlabs.io/docs/quickstart) y [API Reference · Introduction](https://elevenlabs.io/docs/api-reference/introduction).

---

## 9. Pruebas rápidas

### 9.1 Probar registro automático
- Regístrate con un email real en tu app (Auth > Sign up).
- Verifica que se creó automáticamente el perfil en `public.usuarios`.
- Si el trigger falla, como plan B puedes insertar manualmente:
  - Qué harás: validar que el onboarding automático funciona.
  - Dónde hacerlo: en tu app (registro) y Supabase (ver tabla `public.usuarios`).
  - Verificación: aparece una fila en `public.usuarios` con tu `id` y `email`.
```sql
INSERT INTO usuarios (id, email, nombre_empresa)
VALUES ('TU-UUID-DE-AUTH', 'tuemail@dominio.com', 'Mi PyME');
```

### 9.2 Prueba rápida
  - Qué harás: insertar datos de ejemplo para comprobar normalización y triggers.
  - Dónde hacerlo: Supabase > Database > SQL Editor > New query.
  - Verificación: RUT y teléfonos quedan normalizados; `rut` se copia automáticamente.
```sql
-- Crear deudor con RUT con formato variado → se normaliza
INSERT INTO deudores (usuario_id, rut, nombre)
VALUES ('TU-UUID-DE-AUTH', '19.090.595-0', 'Juan Pérez');

-- Agregar contacto teléfono local → se normaliza a +56...
INSERT INTO contactos (usuario_id, deudor_id, rut, tipo_contacto, valor, preferido)
SELECT d.usuario_id, d.id, d.rut, 'telefono', '951365725', true FROM deudores d LIMIT 1;

-- Crear deuda → copia RUT automáticamente
INSERT INTO deudas (usuario_id, deudor_id, rut, monto, fecha_vencimiento, estado)
SELECT d.usuario_id, d.id, d.rut, 10000, CURRENT_DATE + 7, 'nueva' FROM deudores d LIMIT 1;

-- Verificar
SELECT * FROM deudores;
SELECT * FROM contactos;
SELECT * FROM deudas;
```

### 9.3 Pruebas rápidas recomendadas
- Funciones: intenta emails/teléfonos inválidos → debe lanzar excepción (ej.: `SELECT normalize_phone('abc');`, `SELECT normalize_rut('123');`).
- RLS suscripciones: usuario normal no puede editar; admin sí (reemplaza el UUID en la política antes de probar).
- Ofuscación: `ofuscarTelefono('+56912345725')` → `+56*****5725`.
- Rate limiting: simula >100 requests/hora desde la misma IP → responde 429.
- Locks: realiza inserts concurrentes con el mismo `deudor_id` → sin errores de carrera y con `rut` consistente.

## 10. Automatizaciones (requerido)
- Objetivo: ejecutar automáticamente las acciones programadas y registrar resultados.

- Qué es: jobs programados que lanzan acciones y webhooks que registran estados y métricas.
- Dónde hacerlo: Edge/Scheduled Functions (con service role) y endpoints/backend de tu app. El SQL se utiliza para consultas base y escritura de resultados.

A) Ejecutor programado (cada 1–5 minutos)
- Tarea: buscar programaciones vencidas y pendientes; lanzar la acción; registrar inicio en `historial`; marcar la programación.

**📝 NOTA: NO hay código SQL para ejecutar en Supabase aquí.**
**🔧 ACCIÓN: Implementar en Vercel/backend después de completar todo el documento.**

- Consulta base:
```sql
SELECT p.id, p.usuario_id, p.deuda_id, p.contacto_id, p.tipo_accion, p.plantilla_id
FROM programaciones p
WHERE p.fecha_programada <= now()
  AND p.estado = 'pendiente';
```
- Flujo recomendado (Edge/Scheduled Function con service role):
  1) Abrir transacción; tomar un lock por `p.id` para evitar doble ejecución.
  2) Para cada fila:
     - Obtener datos del `contacto_id` (email/teléfono) y `plantilla_id`.
     - Llamar al proveedor según `tipo_accion` (Resend/SMTP para email; SMS/WhatsApp; ElevenLabs para llamadas).
     - Insertar en `historial` con `estado='iniciado'` y `detalles` con el identificador externo (ej.: `{"call_id":"..."}`).
     - Marcar `programaciones.estado='ejecutado'` si se lanzó correcto; si falla, registrar error y dejar `pendiente` para reintento.
  3) Confirmar transacción.

B) Webhooks de proveedores (estado final y métricas)
- Tarea: recibir actualizaciones (entregada, contestada, fallida, duración, costo) y actualizar la misma fila de `historial` usando el identificador externo (por ejemplo `call_id`).

**📝 NOTA: NO hay código SQL para ejecutar en Supabase aquí.**
**🔧 ACCIÓN: Implementar endpoints en Vercel/backend después de completar todo el documento.**

- Acciones:
  - Actualizar `historial.estado` y `historial.detalles` (duración, códigos, mensajes).
  - Sumar en `usos` (emails_enviados, llamadas_ejecutadas, sms_enviados, whatsapp_enviados, duracion_llamadas, costos, etc.).
  - Verificar firmas/secretos del proveedor antes de aceptar el webhook.

C) Reglas técnicas clave

**📝 NOTA: NO hay código SQL para ejecutar en Supabase aquí.**
**🔧 ACCIÓN: Implementar estas reglas en el código de Vercel/backend después de completar todo el documento.**

- Idempotencia: usar un lock por `programaciones.id` o marca de "procesando" para no duplicar.
- Seguridad: ejecutar con service key (bypass RLS) en el job; validar firma en webhooks.
- Reintentos: política de reintentos con backoff; tras N fallos marcar como `cancelado` y registrar motivo en `historial`.
- Trazabilidad: siempre crear registro en `historial` al iniciar y actualizar al finalizar.

D) Plantilla de inserción en historial (ejemplo)

**📝 NOTA: Este es solo un EJEMPLO de SQL que usarás en el código de Vercel/backend.**
**🔧 ACCIÓN: Usar esta plantilla en el código de automatizaciones después de completar todo el documento.**

```sql
INSERT INTO historial (
  usuario_id, deuda_id, rut, contacto_id, campana_id, tipo_accion,
  fecha, estado, detalles
) VALUES (
  :usuario_id, :deuda_id, :rut, :contacto_id, :campana_id, :tipo_accion,
  now(), 'iniciado', :detalles_json
);
```

A1) Configuración de reintentos y backoff (por usuario) (no implementado)
- Define cuántos reintentos y con qué espera entre intentos por canal.

**📝 NOTA: SÍ hay código SQL para ejecutar en Supabase aquí.**
**🔧 ACCIÓN: Ejecutar en Supabase → Database → SQL Editor → New query (reemplaza 'TU-UUID' con tu UUID real).**

```sql
-- Email / SMS / WhatsApp: 3 reintentos (1m → 5m → 30m)
INSERT INTO configuraciones (usuario_id, clave, valor) VALUES
('TU-UUID', 'max_intentos_email',     '3'::jsonb),
('TU-UUID', 'backoff_email',          '["1m","5m","30m"]'::jsonb),
('TU-UUID', 'max_intentos_sms',       '3'::jsonb),
('TU-UUID', 'backoff_sms',            '["1m","5m","30m"]'::jsonb),
('TU-UUID', 'max_intentos_whatsapp',  '3'::jsonb),
('TU-UUID', 'backoff_whatsapp',       '["1m","5m","30m"]'::jsonb);

-- Llamadas: 2 reintentos (5m → 30m)
INSERT INTO configuraciones (usuario_id, clave, valor) VALUES
('TU-UUID', 'max_intentos_llamada', '2'::jsonb),
('TU-UUID', 'backoff_llamada',      '["5m","30m"]'::jsonb);
```
- Si falta una clave, el job usa valores por defecto.

A2) Journeys (plantillas de pasos)
- Usa `campanas.programacion` (JSON) como plantilla de "journey". El expansor genera filas en `programaciones` con fechas calculadas.

**📝 NOTA: Este es solo un EJEMPLO de JSON que usarás en el código de Vercel/backend.**
**🔧 ACCIÓN: Usar este formato JSON en el código de automatizaciones después de completar todo el documento.**

```json
{
  "anchor": "invoice_date",
  "steps": [
    { "offset_days": 0,  "accion": "email",    "plantilla_id": "..." },
    { "offset_days": 15, "accion": "whatsapp", "plantilla_id": "..." },
    { "offset_days": 30, "accion": "sms",      "plantilla_id": "..." }
  ],
  "past_due_repeat": { "every_days": 7, "max_times": 8, "end_after_days": 90 },
  "retry": {
    "email":    { "max": 3, "backoff": ["1m","5m","30m"] },
    "sms":      { "max": 3, "backoff": ["1m","5m","30m"] },
    "whatsapp": { "max": 3, "backoff": ["1m","5m","30m"] },
    "llamada":  { "max": 2, "backoff": ["5m","30m"] }
  },
  "on_fail": { "delay_days": 1, "attempts": 3 }
}
```
- El expansor se ejecuta al aplicar la campaña o al crear la deuda, y graba `programaciones` con `fecha_programada` relativa a `anchor`.

C1) Guardrails del dueño (reglas globales) (no implementado)
- Define límites y horarios a nivel plataforma (se aplican siempre). Usa `usuario_id = NULL`.
- **Nota importante**: Las configuraciones globales (`usuario_id = NULL`) solo pueden ser creadas desde el backend con **service_role key**, no desde el cliente. Los usuarios pueden leerlas (para aplicar las reglas) pero no modificarlas.

**📝 NOTA: SÍ hay código SQL para ejecutar en Supabase aquí.**
**🔧 ACCIÓN: Ejecutar en Supabase → Database → SQL Editor → New query (usar service_role key o ejecutar como admin).**

```sql
-- Estas inserciones se ejecutan desde el backend con service_role key
INSERT INTO configuraciones (usuario_id, clave, valor) VALUES
(NULL, 'max_msgs_deudor_dia',    '5'::jsonb),
(NULL, 'max_msgs_deudor_semana', '15'::jsonb),
(NULL, 'max_tipos_por_deudor_semana', '3'::jsonb),
(NULL, 'quiet_hours_start', '"21:00"'::jsonb),
(NULL, 'quiet_hours_end',   '"08:00"'::jsonb),
(NULL, 'bloquear_domingos', 'true'::jsonb),
(NULL, 'blocked_dates',     '["2025-01-01","2025-05-01"]'::jsonb);
```
- El job debe leer primero estas reglas globales y luego las del usuario; aplica siempre el límite más estricto.
- Gracias a las políticas RLS de `configuraciones`, los usuarios pueden VER estas reglas globales pero solo pueden crear/modificar sus propias configuraciones (con su `usuario_id`).

---

E) Rate limiting para webhooks/automatizaciones (operación sin fricción)
- Riesgo: abuso puede provocar DoS o costos innecesarios.
- Acción: limitar automáticamente por IP/usuario. In-memory para empezar; Redis (Upstash) si escalas.
- Dónde hacerlo: en tus rutas de API (webhooks) del backend.

**📝 NOTA: Este es solo un EJEMPLO de código JavaScript que usarás en Vercel/backend.**
**🔧 ACCIÓN: Implementar este código en Vercel/backend después de completar todo el documento.**

```javascript
import { RateLimiterMemory } from 'rate-limiter-flexible';

const limiter = new RateLimiterMemory({ points: 100, duration: 3600 });

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  try {
    await limiter.consume(ip);
    // ...procesar webhook...
    return new Response('OK', { status: 200 });
  } catch {
    return new Response('Límite excedido', { status: 429 });
  }
}
```

Notas:
- En Vercel, sube el código; Vercel instalará dependencias. Para alto tráfico, usa Redis (Upstash) y `RateLimiterRedis` con `REDIS_URL`/`REDIS_TOKEN` en Variables de Entorno.
- Ajusta `points`/`duration` según tu tráfico y criticidad.

## 11. Extensiones opcionales (aplicar después del core)

- Qué es: mejoras no críticas que puedes aplicar tras completar el núcleo.

### 4.x) Tipo de persona automático (natural/jurídica) según RUT

**⚠️ IMPORTANTE: Ejecuta estos scripts en el orden exacto que se muestra** para evitar errores:

#### Paso 1: Crear la columna y el índice primero
```sql
-- PASO 1: Agregar la columna e índice (EJECUTAR PRIMERO)
ALTER TABLE deudores
ADD COLUMN IF NOT EXISTS tipo_persona text NOT NULL DEFAULT 'natural'
CHECK (tipo_persona IN ('natural','juridica'));

CREATE INDEX IF NOT EXISTS idx_deudores_usuario_tipo_persona
ON deudores(usuario_id, tipo_persona);
```

#### Paso 2: Crear función auxiliar para inferir tipo de persona
```sql
-- PASO 2: Función para inferir tipo_persona desde el RUT (umbral 50.000.000)
CREATE OR REPLACE FUNCTION infer_tipo_persona(rut text) RETURNS text AS $$
DECLARE num bigint;
BEGIN
  num := split_part(rut, '-', 1)::bigint;
  IF num >= 50000000 THEN RETURN 'juridica'; ELSE RETURN 'natural'; END IF;
END;
$$ LANGUAGE plpgsql;
```

#### Paso 3: Actualizar el trigger de normalización para usar la nueva columna
```sql
-- PASO 3: Extender trigger de normalización (EJECUTAR DESPUÉS DE CREAR LA COLUMNA)
CREATE OR REPLACE FUNCTION normalize_rut_trigger() RETURNS trigger AS $$
BEGIN
  NEW.rut := normalize_rut(NEW.rut);
  IF TG_OP = 'INSERT' THEN
    NEW.tipo_persona := infer_tipo_persona(NEW.rut);
  ELSIF TG_OP = 'UPDATE' AND NEW.rut IS DISTINCT FROM OLD.rut AND NEW.tipo_persona = OLD.tipo_persona THEN
    NEW.tipo_persona := infer_tipo_persona(NEW.rut);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### Paso 4: Actualizar datos existentes
```sql
-- PASO 4: Backfill de datos existentes
UPDATE deudores SET tipo_persona = infer_tipo_persona(rut);
```

### 4.y) Categoría de intención (cobranza/comercial/soporte/informativo)
```sql
-- Agregar categoría (si falta) y defaults
ALTER TABLE plantillas      ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'cobranza'
CHECK (categoria IN ('cobranza','comercial','soporte','informativo'));
ALTER TABLE campanas        ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'cobranza'
CHECK (categoria IN ('cobranza','comercial','soporte','informativo'));
ALTER TABLE programaciones  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'cobranza'
CHECK (categoria IN ('cobranza','comercial','soporte','informativo'));
ALTER TABLE historial       ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'cobranza'
CHECK (categoria IN ('cobranza','comercial','soporte','informativo'));

-- Índices
CREATE INDEX IF NOT EXISTS idx_programaciones_user_categoria ON programaciones(usuario_id, categoria);
CREATE INDEX IF NOT EXISTS idx_historial_user_categoria_fecha ON historial(usuario_id, categoria, fecha);
```

**📝 NOTA: Los siguientes son EJEMPLOS de cómo usar las columnas en tu código de aplicación.**
**🔧 ACCIÓN: Usar estos ejemplos en el código de Vercel/backend después de completar todo el documento.**

Propagación desde la app (sin triggers)
```sql
-- Al crear programaciones desde una campaña
INSERT INTO programaciones (..., categoria)
VALUES (..., (SELECT categoria FROM campanas WHERE id = :campana_id));

-- Al insertar en historial al ejecutar
INSERT INTO historial (..., categoria)
SELECT ..., p.categoria FROM programaciones p WHERE p.id = :programacion_id;
```

### 4.z) Convenciones monetarias (CLP, Chile)
- Postgres usa punto como separador decimal; la coma se maneja en la app.
- Recomendación: guardar CLP de negocio sin decimales (enteros). Costos de proveedores con decimales.
```sql
-- CLP en enteros
ALTER TABLE deudas         ALTER COLUMN monto          TYPE numeric(18,0) USING round(monto);
ALTER TABLE pagos          ALTER COLUMN monto_pagado   TYPE numeric(18,0) USING round(monto_pagado);
ALTER TABLE suscripciones  ALTER COLUMN precio_mensual TYPE numeric(18,0) USING round(precio_mensual);

-- Costos con decimales
ALTER TABLE usos ALTER COLUMN costo_emails    TYPE numeric(18,4);
ALTER TABLE usos ALTER COLUMN costo_llamadas  TYPE numeric(18,4);
ALTER TABLE usos ALTER COLUMN costo_sms       TYPE numeric(18,4);
ALTER TABLE usos ALTER COLUMN costo_whatsapp  TYPE numeric(18,4);
ALTER TABLE usos ALTER COLUMN costo_db        TYPE numeric(18,4);
ALTER TABLE usos ALTER COLUMN costo_total     TYPE numeric(18,4);

-- Reglas de sanidad
ALTER TABLE deudas ADD CONSTRAINT deudas_monto_nn CHECK (monto >= 0);
ALTER TABLE pagos  ADD CONSTRAINT pagos_monto_nn  CHECK (monto_pagado >= 0);
```

**📝 NOTA: Las siguientes son SUGERENCIAS para implementar en el frontend/backend después de completar todo el documento.**
**🔧 ACCIÓN: Implementar estas conversiones de formato en el código de la aplicación.**

Sugerencias en frontend/backend (no SQL):
- Parsear entradas con coma: reemplazar puntos de miles y convertir coma a punto antes de guardar.
- Formateo de salida: `Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })`.

---

### 4.w) Ofuscación de números (visual) (⚠️ NOTA: Protección limitada - solo oculta números en pantalla, pero no en llamadas reales ni logs del sistema. Se recomienda implementar como capa adicional de privacidad junto con otras medidas de seguridad)
- Qué es: ofuscar visualmente números telefónicos para reducir exposición de PII, manteniendo usabilidad.
- Por qué: mostrar números completos expone PII; encriptar complica búsquedas/operación. La ofuscación solo afecta la vista.
- Dónde: en la app (frontend/backend al formatear salida), no en la base de datos.

```typescript
export function ofuscarTelefono(tel: string): string {
  if (!tel || tel.length < 7) return tel;
  const prefijo = tel.startsWith('+56') ? '+56' : tel.slice(0, 3);
  const ultimosCuatro = tel.slice(-4);
  return `${prefijo}*****${ultimosCuatro}`; // ej: +56*****5725
}
```

Notas:
- Úsalo al renderizar `e164` en componentes/UI.
- No modifica almacenamiento en BD; es presentación. Mantén `e164` completo en BD para búsquedas/operaciones.

## 12. Checklist de implementación
- [ ] Abrí Database > SQL Editor y creé una "New query".
- [ ] Ejecuté `CREATE EXTENSION IF NOT EXISTS pgcrypto;`.
- [ ] Creé funciones: `normalize_rut`, `normalize_phone`, `normalize_rut_trigger`.
- [ ] Creé todas las tablas nuevas e índices (20 tablas): 13 base + 6 del módulo de llamadas (obligatorio) + 1 de auditoría, incluyendo `suscripciones` y `public.usuarios` enlazada a `auth.users`.
- [ ] Configuré el índice de selección automática de agentes (`idx_llamada_agente_selector`) para mejor rendimiento.
- [ ] Creé triggers de normalización: `normalize_rut_deudores` y `normalize_contactos`.
- [ ] Creé `copy_rut_from_deudores()` (para tablas con `deudor_id`) y `copy_rut_from_deuda()` (para tablas con `deuda_id`), y sus triggers en `deudas`, `programaciones`, `historial`, `pagos`, `usos`.
- [ ] Creé triggers de onboarding (`handle_new_user`) y sincronización de email (`sync_user_email`).
- [ ] Activé RLS en todas las tablas y creé todas las políticas (especial para `usuarios` y "Filtro por usuario" para el resto).
- [ ] Probé registro real y verifiqué que se creó automáticamente el perfil en `public.usuarios`.
- [ ] Hice la prueba rápida (inserts y SELECT) y vi datos normalizados.
- [ ] Automatizaciones implementadas (requerido): job programado (1–5 min), webhooks verificados, idempotencia, reintentos, actualización de historial y usos.
- [ ] Configuré reintentos/backoff en `configuraciones` (por usuario) y definidos defaults.
- [ ] Definí journeys en `campanas.programacion` (JSON) y expansor a `programaciones`.
- [ ] Apliqué guardrails globales (usuario_id NULL) y precedencia estricta en el job.
- [ ] Tipo de persona automático por RUT aplicado y backfill ejecutado.
- [ ] Categoría de intención agregada (plantillas/campanas/programaciones/historial) e integrada en inserts.
- [ ] Guardrails globales y por usuario configurados en `configuraciones` (precedencia estricta).
- [ ] Columnas monetarias ajustadas a CLP (entero) y costos en `usos` con decimales.
- [ ] Formateo es-CL manejado en la app (parse/format).

---

## 13. Solución de problemas (troubleshooting)

- No veo datos con RLS: verifica que el usuario autenticado existe en `public.usuarios` y que `auth.uid()` coincide con `usuario_id` en tus filas.
- Error “Formato de RUT/teléfono inválido”: revisa la entrada; los triggers validan y normalizan. Corrige el dato y reintenta.
- Onboarding no crea `public.usuarios`: revisa trigger `on_auth_user_created` y función `handle_new_user` (que la política y el schema sean correctos).
- Políticas RLS bloquean insert/update: asegúrate de enviar `usuario_id = auth.uid()` en los inserts/updates desde tu app.
- Fallo creando índices: si ya existen, usa variantes `IF NOT EXISTS` (este documento ya las incluye en la mayoría de los casos).

---

## 14. Notas útiles
- Si una función/trigger ya existe, usa `CREATE OR REPLACE` o `DROP ... IF EXISTS` antes.
- Si RLS está activa y no ves datos desde tu app, asegúrate de que el `auth.uid()` exista en `public.usuarios`.
- Siempre busca y guarda RUT en formato normalizado (ej.: `19090595-0`) y teléfono como `+56...`.
- El trigger `handle_new_user` crea automáticamente el perfil al registrarse; no necesitas INSERT manual.
- Todas las tablas de negocio usan `usuario_id` que referencia `public.usuarios.id` (mismo que `auth.users.id`).
- **Orden importante**: Crea `suscripciones` antes que `usuarios` (por la FK).
- **Triggers automáticos**: `normalize_contactos` normaliza RUT y teléfonos/emails al insertar contactos.
- **Políticas RLS**: `suscripciones` tiene RLS con lectura global y edición solo admin.
- **Configuraciones globales y por usuario**: La tabla `configuraciones` soporta ambos tipos: `usuario_id = NULL` para reglas globales (creadas solo desde backend con service_role) y `usuario_id = UUID` para configuraciones específicas por usuario. Los usuarios pueden leer las globales pero solo modificar las suyas.
- **⚠️ IMPORTANTE - Foreign Key de programaciones.campana_id**: La tabla `programaciones` tiene `campana_id` que referencia `workflows_cobranza(id)`, NO `campanas(id)`. Esta corrección se aplicó en Noviembre 2024 para alinear con la nueva implementación de workflows. Si estás creando la base de datos desde cero, usa `REFERENCES workflows_cobranza(id)`. Si ya existe la tabla con la referencia antigua, ejecuta: `ALTER TABLE programaciones DROP CONSTRAINT programaciones_campana_id_fkey; ALTER TABLE programaciones ADD CONSTRAINT programaciones_campana_id_fkey FOREIGN KEY (campana_id) REFERENCES workflows_cobranza(id) ON DELETE SET NULL;`

## 15. Cambio de Enfoque: Permisión de Duplicados de RUT

**Fecha de implementación**: Diciembre 2024

### **Motivación del cambio:**
Para simplificar la experiencia del usuario y eliminar fricciones al agregar deudores, se decidió permitir duplicados de RUT en la tabla `deudores`.

### **Cambios realizados:**

#### **1. Base de datos:**
```sql
-- Eliminar restricción de unicidad
ALTER TABLE deudores
DROP CONSTRAINT IF EXISTS unique_rut_por_usuario;

-- Crear índice compuesto para mantener rendimiento
CREATE INDEX IF NOT EXISTS idx_deudores_usuario_rut
ON deudores(usuario_id, rut);
```

#### **2. Impacto en la aplicación:**
- **Formulario manual**: Eliminada búsqueda de deudores existentes y diálogos de confirmación
- **Importación CSV**: Procesamiento directo fila por fila sin agrupación por RUT
- **Experiencia de usuario**: Sin fricciones, sin confirmaciones innecesarias

#### **3. Beneficios:**
- ✅ **Simplicidad**: Los usuarios pueden agregar deudores sin verificaciones complejas
- ✅ **Velocidad**: Proceso más rápido al eliminar pasos intermedios
- ✅ **Flexibilidad**: Permite múltiples deudores con el mismo RUT según necesidades del negocio
- ✅ **Escalabilidad**: Mantiene rendimiento con índices optimizados

#### **4. Consideraciones futuras:**
- Si en el futuro se requiere eliminar duplicados, se puede implementar una herramienta de limpieza de datos
- La restricción de unicidad se puede restaurar ejecutando:
  ```sql
  ALTER TABLE deudores
  ADD CONSTRAINT unique_rut_por_usuario UNIQUE (usuario_id, rut);
  ```
  (después de limpiar duplicados existentes)

---

## 16. Actualización de Plantillas - Soporte HTML (Diciembre 2024)

### **Motivación del cambio:**
Para permitir plantillas de email más personalizadas y profesionales, se agregó soporte para contenido HTML en las plantillas de email.

### **Cambios realizados:**

#### **1. Actualización de la tabla plantillas:**
```sql
-- Agregar campo tipo_contenido a la tabla plantillas
-- Ejecutar en Supabase SQL Editor

-- Agregar columna tipo_contenido
ALTER TABLE plantillas 
ADD COLUMN tipo_contenido TEXT DEFAULT 'texto' CHECK (tipo_contenido IN ('texto', 'html'));

-- Actualizar plantillas existentes para que sean de tipo 'texto'
UPDATE plantillas 
SET tipo_contenido = 'texto' 
WHERE tipo_contenido IS NULL;

-- Hacer la columna NOT NULL después de actualizar los datos existentes
ALTER TABLE plantillas 
ALTER COLUMN tipo_contenido SET NOT NULL;

-- Comentario para documentar el cambio
COMMENT ON COLUMN plantillas.tipo_contenido IS 'Tipo de contenido: texto (texto plano) o html (HTML)';
```

#### **2. Impacto en la aplicación:**
- **Formularios**: Agregado selector de tipo de contenido para plantillas de email
- **Editor**: Soporte para HTML con validación de seguridad
- **Preview**: Renderizado visual de contenido HTML
- **Variables**: Funcionan correctamente en contenido HTML
- **Seguridad**: Validación contra tags peligrosos (script, iframe, etc.)

#### **3. Beneficios:**
- ✅ **Personalización**: Emails con formato HTML profesional
- ✅ **Flexibilidad**: Opción entre texto plano y HTML
- ✅ **Seguridad**: Validación automática de HTML
- ✅ **Compatibilidad**: Plantillas existentes siguen funcionando
- ✅ **UX**: Preview rápido sin entrar a editar

#### **4. Funcionalidades agregadas:**
- **Selector de tipo de contenido**: Solo aparece para plantillas de email
- **Editor HTML**: Con syntax highlighting y validación
- **Preview HTML**: Renderizado visual en tiempo real
- **Botón de preview rápido**: En página principal de plantillas
- **Validación de seguridad**: Bloqueo de tags peligrosos
- **Variables dinámicas**: Funcionan en contenido HTML

#### **5. Archivos modificados:**
- `scripts/add-tipo-contenido.sql` - Script de actualización de BD
- `src/app/plantillas/nueva/page.tsx` - Formulario con selector HTML
- `src/app/plantillas/[id]/page.tsx` - Edición con soporte HTML
- `src/app/plantillas/page.tsx` - Preview rápido en modal
- `src/app/plantillas/components/EditorContenido.tsx` - Editor HTML
- `src/app/plantillas/components/PreviewPlantilla.tsx` - Renderizado HTML

---

## 17. Implementación de Workflows de Cobranza (Diciembre 2024)

### **Motivación del cambio:**
Para permitir la creación de workflows visuales de cobranza con canvas interactivo, se agregaron nuevas tablas para manejar workflows, ejecuciones, logs y programaciones.

### **Cambios realizados:**

#### **1. Nuevas tablas agregadas:**

**Tabla principal para workflows de cobranza:**
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
```

**Tabla para ejecuciones individuales de workflow:**
```sql
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
```

**Tabla para logs detallados de ejecución:**
```sql
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
```

**Tabla para programaciones de workflows:**
```sql
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
```

**Tabla de auditoría para cambios en workflows:**
```sql
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

#### **2. RLS (Row Level Security) activado:**

```sql
-- Activar RLS en todas las tablas
ALTER TABLE workflows_cobranza ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejecuciones_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_ejecucion ENABLE ROW LEVEL SECURITY;
ALTER TABLE programaciones_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows_cobranza_auditoria ENABLE ROW LEVEL SECURITY;
```

#### **3. Políticas de RLS creadas:**

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

#### **4. Índices creados:**

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

#### **5. Funciones y triggers de auditoría:**

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
BEFORE DELETE ON workflows_cobranza
FOR EACH ROW EXECUTE FUNCTION log_cambios_workflows_cobranza();
```

#### **6. Prueba rápida:**

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

#### **7. Beneficios:**

- ✅ **Workflows visuales**: Canvas interactivo para crear flujos de cobranza
- ✅ **Ejecución automática**: Sistema de ejecución con logs detallados
- ✅ **Programación flexible**: Ejecución inmediata, programada o recurrente
- ✅ **Auditoría completa**: Trazabilidad de todos los cambios
- ✅ **Validaciones robustas**: CHECK constraints para integridad de datos
- ✅ **Índices optimizados**: Rendimiento mejorado con índices avanzados
- ✅ **Seguridad RLS**: Cada usuario solo ve sus workflows

#### **8. Funcionalidades agregadas:**

- **Canvas visual**: Editor drag-and-drop para crear workflows
- **Nodos de acción**: Email, llamada, SMS, WhatsApp, espera, condición
- **Ejecución inteligente**: Manejo de estados y contexto de datos
- **Logs detallados**: Trazabilidad completa de cada paso
- **Programación avanzada**: Múltiples tipos de programación
- **Auditoría automática**: Registro de todos los cambios

---

Fin del documento.


