import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas que requieren autenticación
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
  '/admin',
  '/mi-cuenta',
  '/configuracion',
  '/deudores',
  '/campanas',
  '/historial',
  '/plantillas',
  '/pagos',
  '/billing'
]

// Rutas que solo usuarios NO autenticados pueden acceder
const authRoutes = [
  '/login',
  '/register',
  '/forgot-password'
]

// Rutas públicas (no requieren autenticación)
const publicRoutes = [
  '/',
  '/auth/callback',
  '/auth/reset-password',
  '/test-email',
  '/test-supabase'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log(`\n🔵 MIDDLEWARE ejecutándose en: ${pathname}`)
  
  // Crear cliente de Supabase para el middleware
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )
  
  // Obtener la sesión actual
  const { data: { session } } = await supabase.auth.getSession()
  console.log(`🔑 Sesión encontrada: ${session ? 'SÍ ✅' : 'NO ❌'}`)
  
  // Verificar si la ruta actual es protegida
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  console.log(`🔐 ¿Es ruta protegida?: ${isProtectedRoute}`)
  
  // Verificar si la ruta actual es de autenticación
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  )
  console.log(`🔓 ¿Es ruta de auth?: ${isAuthRoute}`)
  
  // Verificar si la ruta actual es pública
  const isPublicRoute = publicRoutes.some(route => {
    return pathname === route || pathname.startsWith(route)
  })
  console.log(`🌍 ¿Es ruta pública?: ${isPublicRoute}`)
  
  // Si es una ruta protegida y no hay sesión
  if (isProtectedRoute && !session) {
    console.log(`🔒 BLOQUEANDO ACCESO a ${pathname} - Usuario no autenticado - REDIRIGIENDO A LOGIN\n`)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Si es una ruta de auth y ya hay sesión
  if (isAuthRoute && session) {
    console.log(`🔄 Redirigiendo usuario autenticado desde ${pathname} al dashboard\n`)
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // Si es una ruta pública, permitir acceso
  if (isPublicRoute) {
    console.log(`✅ Permitiendo acceso a ruta pública: ${pathname}\n`)
    return response
  }
  
  // Para cualquier otra ruta, verificar si está autenticado
  if (!session) {
    console.log(`🔒 BLOQUEANDO ACCESO a ${pathname} - Ruta no configurada - REDIRIGIENDO A LOGIN\n`)
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  console.log(`✅ Permitiendo acceso autenticado a: ${pathname}\n`)
  return response
}

// Configurar en qué rutas se ejecuta el middleware
export const config = {
  matcher: [
    /*
     * Ejecutar middleware en todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - archivos públicos (public/)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
