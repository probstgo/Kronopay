import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Mejorar la estabilidad de hidratación
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  // Configuración para desarrollo
  ...(process.env.NODE_ENV === 'development' && {
    typescript: {
      // Ignorar errores de TypeScript en desarrollo para evitar problemas de hidratación
      ignoreBuildErrors: false,
    },
  }),
};

export default nextConfig;
