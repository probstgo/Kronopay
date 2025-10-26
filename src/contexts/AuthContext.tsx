'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Tipos para el contexto de autenticación
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  refreshUser: () => Promise<void>
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hook personalizado para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

// Props del proveedor
interface AuthProviderProps {
  children: React.ReactNode
}

// Componente proveedor
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  // Efecto para manejar cambios en la autenticación
  useEffect(() => {
    // Solo ejecutar en el cliente para evitar problemas de hidratación
    if (typeof window === 'undefined') return

    // Obtener la sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error al obtener sesión inicial:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
          console.log('AuthContext: Sesión inicial establecida (getInitialSession):', session?.user?.email);
        }
      } catch (error) {
        console.error('Error inesperado al obtener sesión inicial:', error)
      } finally {
        setInitialized(true)
        setLoading(false)
        console.log('AuthContext: loading es false (getInitialSession). User:', user?.email);
      }
    }

    getInitialSession()

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Cambio en autenticación (onAuthStateChange):', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        console.log('AuthContext: Estado de usuario después de cambio (onAuthStateChange):', session?.user?.email);
        // Sincronizar sesión con el servidor para que el middleware/SSR la vea
        try {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, session }),
          })
        } catch (syncError) {
          console.error('Error sincronizando sesión con el servidor:', syncError)
        }
        if (!initialized) setInitialized(true)
        setLoading(false)
        console.log('AuthContext: loading es false (onAuthStateChange). User:', user?.email);
      }
    )

    // Limpiar suscripción al desmontar
    return () => subscription.unsubscribe()
  }, [initialized, user?.email])

  // Función para registro
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      return { error }
    } catch (error) {
      console.error('Error en signUp:', error)
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  // Función para login
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      console.error('Error en signIn:', error)
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  // Función para logout
  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      console.error('Error en signOut:', error)
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  // Función para reset de contraseña
  const resetPassword = async (email: string) => {
    try {
      setLoading(true)
      // Usar typeof window para evitar problemas de hidratación
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset-password`,
      })
      return { error }
    } catch (error) {
      console.error('Error en resetPassword:', error)
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  // Función para refrescar datos del usuario
  const refreshUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error al refrescar usuario:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
    } catch (error) {
      console.error('Error inesperado al refrescar usuario:', error)
    }
  }

  // Valor del contexto
  const value: AuthContextType = {
    user,
    session,
    loading,
    initialized,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
