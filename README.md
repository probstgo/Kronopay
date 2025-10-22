# Kronopay

Sistema de gestión de cobranza con Next.js, Supabase y ElevenLabs. Incluye gestión de deudores, campañas automatizadas, llamadas por IA y notificaciones por email.

## Características

- **Gestión de Deudores**: CRUD completo de deudores con estados y filtros
- **Campañas Automatizadas**: Sistema de campañas con llamadas por IA
- **Integración ElevenLabs**: Llamadas automatizadas con voces de IA
- **Notificaciones Email**: Sistema de envío de emails con Resend
- **Autenticación**: Sistema de login/registro con Supabase Auth
- **Dashboard**: Panel de control con métricas y estadísticas

## Tecnologías

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API Routes, Supabase
- **Base de Datos**: Supabase PostgreSQL
- **Autenticación**: Supabase Auth
- **IA**: ElevenLabs para llamadas automatizadas
- **Email**: Resend para notificaciones
- **UI**: Tailwind CSS, Radix UI, Lucide React

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_anon_key_de_supabase
ELEVENLABS_API_KEY=tu_api_key_de_elevenlabs
RESEND_API_KEY=tu_api_key_de_resend
NEXTAUTH_SECRET=tu_secret_para_auth
NEXTAUTH_URL=http://localhost:3000
```

## Base de Datos

Ejecuta los scripts de configuración:

```bash
npm run db:setup
npm run db:verify
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
