'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save, User, Mail, Phone, Calendar, Loader2, Clock } from 'lucide-react'

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth()
  const router = useRouter()
  
  // Estados para el formulario
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [validationErrors, setValidationErrors] = useState<{ fullName?: string, phone?: string }>({})

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Cargar datos del usuario
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '')
      setEmail(user.email || '')
      setPhone(user.user_metadata?.phone || '')
    }
  }, [user])

  // Función para validar el formulario
  const validateForm = () => {
    const errors: { fullName?: string, phone?: string } = {}
    
    // Validar nombre completo
    if (!fullName.trim()) {
      errors.fullName = 'El nombre es requerido'
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'El nombre debe tener al menos 2 caracteres'
    }
    
    // Validar teléfono (opcional, pero si se llena debe ser válido)
    if (phone.trim() && phone.trim().length < 8) {
      errors.phone = 'El teléfono debe tener al menos 8 dígitos'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Función para verificar si el formulario es válido
  const isFormValid = () => {
    return fullName.trim().length >= 2 && (!phone.trim() || phone.trim().length >= 8)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    
    // Validar formulario antes de enviar
    if (!validateForm()) {
      setIsSaving(false)
      return
    }
    
    try {
      // Actualizar datos del usuario en Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone: phone
        }
      })

      if (error) {
        throw error
      }
      
      // Refrescar datos del usuario en el contexto
      await refreshUser()
      
      setMessage({ type: 'success', text: 'Perfil actualizado exitosamente' })
      setIsEditing(false)
    } catch (error: unknown) {
      console.error('Error al actualizar perfil:', error)

      // Determinar el tipo de error y mostrar mensaje específico
      let errorMessage = 'Error al actualizar el perfil'

      if (error instanceof Error && error.message) {
        // Errores de Supabase
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica tu internet e intenta nuevamente'
        } else if (error.message.includes('auth') || error.message.includes('session')) {
          errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente'
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          errorMessage = 'Error de validación. Verifica que los datos sean correctos'
        } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
          errorMessage = 'Demasiadas solicitudes. Espera un momento e intenta nuevamente'
        } else {
          errorMessage = `Error del servidor: ${error.message}`
        }
      } else if (typeof error === 'object' && error && 'code' in error) {
        const code = (error as { code?: string }).code
        // Errores con código específico
        switch (code) {
          case 'NETWORK_ERROR':
            errorMessage = 'Error de conexión. Verifica tu internet'
            break
          case 'AUTH_ERROR':
            errorMessage = 'Error de autenticación. Inicia sesión nuevamente'
            break
          default:
            errorMessage = `Error del sistema: ${code}`
        }
      }

      setMessage({ 
        type: 'error', 
        text: errorMessage
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Restaurar valores originales
    if (user) {
      setFullName(user.user_metadata?.full_name || '')
      setEmail(user.email || '')
      setPhone(user.user_metadata?.phone || '')
    }
    setIsEditing(false)
    setMessage(null)
  }

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario, no mostrar nada (ya se redirigió)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver al Dashboard</span>
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Mi Perfil
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Información Personal</span>
              </CardTitle>
              <CardDescription>
                Gestiona tu información personal y de contacto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nombre Completo */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    // Limpiar error cuando el usuario empiece a escribir
                    if (validationErrors.fullName) {
                      setValidationErrors(prev => ({ ...prev, fullName: undefined }))
                    }
                  }}
                  disabled={!isEditing}
                  placeholder="Ingresa tu nombre completo"
                  className={validationErrors.fullName ? 'border-red-500' : ''}
                />
                {validationErrors.fullName && (
                  <p className="text-sm text-red-600">{validationErrors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    value={email}
                    disabled={true}
                    placeholder="tu@email.com"
                    className="flex-1 bg-gray-50"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  El email no se puede modificar por seguridad
                </p>
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (Opcional)</Label>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      // Limpiar error cuando el usuario empiece a escribir
                      if (validationErrors.phone) {
                        setValidationErrors(prev => ({ ...prev, phone: undefined }))
                      }
                    }}
                    disabled={!isEditing}
                    placeholder="+56 9 1234 5678"
                    className={`flex-1 ${validationErrors.phone ? 'border-red-500' : ''}`}
                  />
                </div>
                {validationErrors.phone && (
                  <p className="text-sm text-red-600">{validationErrors.phone}</p>
                )}
              </div>

              {/* Fecha de Registro */}
              <div className="space-y-2">
                <Label>Fecha de Registro</Label>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {user.created_at ? 
                      new Date(user.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 
                      'No disponible'
                    }
                  </span>
                </div>
              </div>

              {/* Última Actualización */}
              <div className="space-y-2">
                <Label>Última Actualización</Label>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {user.updated_at ? 
                      new Date(user.updated_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 
                      'No disponible'
                    }
                  </span>
                </div>
              </div>

              {/* Mensajes */}
              {message && (
                <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              {/* Botones de Acción */}
              <div className="flex justify-end space-x-3 pt-4">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    Editar Perfil
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSave}
                      disabled={isSaving || !isFormValid()}
                      className="flex items-center space-x-2"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
