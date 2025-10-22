# Configuración de Email con Dominio Personalizado

## Resumen de Cambios

Se ha actualizado la configuración del sistema de emails para usar tu dominio personalizado en lugar de `onboarding@resend.dev`.

## Archivos Modificados

1. **`src/lib/resend.ts`** - Agregada variable de entorno `RESEND_FROM_EMAIL`
2. **`src/app/api/send-email/route.ts`** - Actualizado para usar el dominio personalizado
3. **`src/app/test-email/components/FormularioEmail.tsx`** - Removido dominio hardcodeado
4. **`src/app/test-email/page.tsx`** - Actualizada información de la página

## Configuración Requerida

### 1. Variable de Entorno

Agrega la siguiente variable de entorno a tu archivo `.env.local`:

```bash
RESEND_FROM_EMAIL=tu-email@tu-dominio.com
```

**Ejemplo:**
```bash
RESEND_FROM_EMAIL=noreply@micobranza.com
```

### 2. Configuración en Resend

1. Ve a tu dashboard de Resend
2. Asegúrate de que tu dominio esté verificado
3. Configura los registros DNS necesarios
4. Verifica que el dominio esté activo

### 3. Verificación

Para verificar que todo funciona correctamente:

1. Ve a `/test-email` en tu aplicación
2. Selecciona un deudor con email válido
3. Envía un email de prueba
4. Verifica que el email llegue desde tu dominio personalizado

## Fallback

Si no se configura `RESEND_FROM_EMAIL`, el sistema usará `onboarding@resend.dev` como fallback para evitar errores.

## Notas Importantes

- Asegúrate de que tu dominio esté completamente verificado en Resend antes de usar en producción
- Los emails pueden llegar a la carpeta de spam inicialmente
- Considera configurar SPF, DKIM y DMARC para mejorar la deliverabilidad
