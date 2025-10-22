'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Procesando autenticación...')
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('loading')
        setMessage('Verificando autenticación...')

        // Obtener la sesión actual después del callback
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error en callback:', error)
          setStatus('error')
          setMessage(`Error de autenticación: ${error.message}`)
          return
        }

        if (session) {
          console.log('Autenticación exitosa:', session.user.email)
          setStatus('success')
          setMessage('¡Autenticación exitosa! Redirigiendo...')
          
          // Redirigir al dashboard después de un breve delay
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
        } else {
          setStatus('error')
          setMessage('No se pudo obtener la sesión de autenticación')
        }
      } catch (error) {
        console.error('Error inesperado en callback:', error)
        setStatus('error')
        setMessage('Ocurrió un error inesperado durante la autenticación')
      }
    }

    handleAuthCallback()
  }, [router])

  const handleRetry = () => {
    router.push('/login')
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {status === 'loading' && 'Procesando Autenticación'}
              {status === 'success' && '¡Autenticación Exitosa!'}
              {status === 'error' && 'Error de Autenticación'}
            </CardTitle>
            <CardDescription>
              {status === 'loading' && 'Por favor espera mientras verificamos tu identidad...'}
              {status === 'success' && 'Tu sesión ha sido establecida correctamente.'}
              {status === 'error' && 'Hubo un problema al verificar tu identidad.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Loading State */}
            {status === 'loading' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">{message}</p>
              </div>
            )}

            {/* Success State */}
            {status === 'success' && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  ✅ {message}
                </AlertDescription>
              </Alert>
            )}

            {/* Error State */}
            {status === 'error' && (
              <Alert variant="destructive">
                <AlertDescription>
                  ❌ {message}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            {status === 'error' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleRetry}
                  className="flex-1"
                >
                  Intentar Nuevamente
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleGoHome}
                  className="flex-1"
                >
                  Ir al Inicio
                </Button>
              </div>
            )}

            {/* Success Redirect Info */}
            {status === 'success' && (
              <div className="text-center text-sm text-gray-600">
                <p>Serás redirigido automáticamente al dashboard...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
