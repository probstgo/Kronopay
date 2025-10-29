"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Sidebar } from "@/components/Sidebar"
import { usePathname } from "next/navigation"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  // Rutas públicas que NO deben mostrar el sidebar
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/auth/callback',
    '/auth/reset-password',
    '/test-supabase'
  ]

  const isPublicRoute = publicRoutes.includes(pathname)

  // Si es una ruta pública, mostrar solo el contenido sin sidebar
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {user && <Sidebar />}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
