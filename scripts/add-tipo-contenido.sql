-- Script para agregar campo tipo_contenido a la tabla plantillas
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
