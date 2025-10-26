'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [isValidSession, setIsValidSession] = useState(false)
  
  const router = useRouter()

  // Verificar si hay una sesión válida para reset de contraseña
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setIsValidSession(true)
        } else {
          setError('Enlace inválido o expirado. Por favor solicita un nuevo enlace.')
        }
      } catch (_error) {
        setError('Error al verificar la sesión')
      }
    }

    checkSession()
  }, [])

  const validateForm = () => {
    const errors: {[key: string]: string} = {}

    // Validar contraseña
    if (!formData.password) {
      errors.password = 'La contraseña es requerida'
    } else if (formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    // Validar confirmación de contraseña
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirma tu contraseña'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Limpiar error de validación específico cuando el usuario empiece a escribir
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }
    
    // Limpiar mensajes generales
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validar formulario
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Actualizar la contraseña del usuario
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      })
      
      if (error) {
        setError(error.message)
      } else {
        setSuccess('¡Contraseña actualizada exitosamente! Redirigiendo al login...')
        
        // Cerrar sesión y redirigir al login después de un delay
        setTimeout(async () => {
          await supabase.auth.signOut()
          router.push('/login')
        }, 2000)
      }
    } catch (_err) {
      setError('Ocurrió un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-red-600">
                Enlace Inválido
              </CardTitle>
              <CardDescription>
                Este enlace no es válido o ha expirado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertDescription>
                  {error || 'El enlace de recuperación no es válido o ha expirado. Por favor solicita un nuevo enlace.'}
                </AlertDescription>
              </Alert>
              
              <div className="mt-4 text-center">
                <Button 
                  onClick={() => router.push('/forgot-password')}
                  className="w-full"
                >
                  Solicitar nuevo enlace
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Nueva Contraseña
            </CardTitle>
            <CardDescription className="text-center">
              Ingresa tu nueva contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isLoading}
                  className={validationErrors.password ? 'border-red-500' : ''}
                />
                {validationErrors.password && (
                  <p className="text-red-500 text-sm">{validationErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  disabled={isLoading}
                  className={validationErrors.confirmPassword ? 'border-red-500' : ''}
                />
                {validationErrors.confirmPassword && (
                  <p className="text-red-500 text-sm">{validationErrors.confirmPassword}</p>
                )}
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
                {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
