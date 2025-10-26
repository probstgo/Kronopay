'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const { error } = await resetPassword(email)
      
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Se ha enviado un email con las instrucciones para restablecer tu contraseña.')
        setEmailSent(true)
        setEmail('')
      }
    } catch (_err) {
      setError('Ocurrió un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!email) {
      setError('Por favor ingresa tu email primero')
      return
    }
    
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const { error } = await resetPassword(email)
      
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Se ha reenviado el email con las instrucciones.')
      }
    } catch (_err) {
      setError('Ocurrió un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              ¿Olvidaste tu contraseña?
            </CardTitle>
            <CardDescription className="text-center">
              {emailSent 
                ? 'Revisa tu email para continuar'
                : 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">
                    ✅ Email enviado exitosamente
                  </AlertDescription>
                </Alert>

                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-600">
                    Hemos enviado un enlace de recuperación a tu email.
                  </p>
                  <p className="text-sm text-gray-600">
                    Revisa tu bandeja de entrada y sigue las instrucciones.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="outline"
                      onClick={handleResendEmail}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? 'Reenviando...' : 'Reenviar email'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setEmailSent(false)
                        setSuccess('')
                        setError('')
                      }}
                      className="flex-1"
                    >
                      Usar otro email
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                ¿Recordaste tu contraseña?{' '}
                <Link 
                  href="/login" 
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
