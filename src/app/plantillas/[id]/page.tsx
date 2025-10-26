'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Protected from '@/components/Protected'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Eye, Mail, Volume2, MessageSquare, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { EditorContenido } from '../components/EditorContenido'
import { PreviewPlantilla } from '../components/PreviewPlantilla'

interface Plantilla {
  id: string
  nombre: string
  tipo: 'email' | 'voz' | 'sms' | 'whatsapp'
  contenido: string
  created_at: string
}

const TIPOS_PLANTILLA = [
  { value: 'email', label: 'Email', icon: Mail, descripcion: 'Para envío de emails de cobranza' },
  { value: 'voz', label: 'Voz', icon: Volume2, descripcion: 'Para llamadas automatizadas' },
  { value: 'sms', label: 'SMS', icon: MessageSquare, descripcion: 'Para envío de mensajes SMS' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, descripcion: 'Para envío de mensajes WhatsApp' }
]

const VARIABLES_DISPONIBLES = [
  { variable: '{{nombre}}', descripcion: 'Nombre del deudor' },
  { variable: '{{monto}}', descripcion: 'Monto de la deuda' },
  { variable: '{{fecha_vencimiento}}', descripcion: 'Fecha de vencimiento' },
  { variable: '{{empresa}}', descripcion: 'Nombre de tu empresa' },
  { variable: '{{telefono}}', descripcion: 'Teléfono de contacto' },
  { variable: '{{email}}', descripcion: 'Email de contacto' }
]

export default function EditarPlantillaPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [plantilla, setPlantilla] = useState<Plantilla | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mostrarPreview, setMostrarPreview] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'email' as 'email' | 'voz' | 'sms' | 'whatsapp',
    contenido: ''
  })

  const cargarPlantilla = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('plantillas')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      
      setPlantilla(data)
      setFormData({
        nombre: data.nombre,
        tipo: data.tipo,
        contenido: data.contenido
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al cargar plantilla: ' + errorMessage)
      router.push('/plantillas')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    if (user && params.id) {
      cargarPlantilla()
    }
  }, [user, params.id, cargarPlantilla])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    
    if (!formData.contenido.trim()) {
      toast.error('El contenido es requerido')
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('plantillas')
        .update({
          nombre: formData.nombre.trim(),
          tipo: formData.tipo,
          contenido: formData.contenido.trim(),
          usuario_id: user?.id
        })
        .eq('id', params.id)

      if (error) throw error

      toast.success('Plantilla actualizada exitosamente')
      router.push('/plantillas')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al actualizar plantilla: ' + errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const eliminarPlantilla = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('plantillas')
        .delete()
        .eq('id', params.id)

      if (error) throw error

      toast.success('Plantilla eliminada exitosamente')
      router.push('/plantillas')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al eliminar plantilla: ' + errorMessage)
    }
  }

  const tipoSeleccionado = TIPOS_PLANTILLA.find(t => t.value === formData.tipo)

  if (loading) {
    return (
      <Protected>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando plantilla...</p>
            </div>
          </div>
        </div>
      </Protected>
    )
  }

  if (!plantilla) {
    return (
      <Protected>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Plantilla no encontrada</h1>
            <p className="text-gray-600 mb-4">La plantilla que buscas no existe o no tienes permisos para verla.</p>
            <Button onClick={() => router.push('/plantillas')}>
              Volver a Plantillas
            </Button>
          </div>
        </div>
      </Protected>
    )
  }

  return (
    <Protected>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Editar Plantilla</h1>
              <p className="text-gray-600 mt-1">Modifica tu plantilla de mensaje</p>
            </div>
          </div>
          <Button 
            variant="destructive"
            onClick={eliminarPlantilla}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Información de la Plantilla</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Nombre */}
                  <div>
                    <Label htmlFor="nombre">Nombre de la Plantilla</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Ej: Recordatorio de Pago"
                      required
                    />
                  </div>

                  {/* Tipo */}
                  <div>
                    <Label>Tipo de Plantilla</Label>
                    <Select 
                      value={formData.tipo} 
                      onValueChange={(value: 'email' | 'voz' | 'sms' | 'whatsapp') => setFormData(prev => ({ ...prev, tipo: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_PLANTILLA.map(tipo => {
                          const IconComponent = tipo.icon
                          return (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">{tipo.label}</div>
                                  <div className="text-xs text-gray-500">{tipo.descripcion}</div>
                                </div>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contenido */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="contenido">Contenido</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMostrarPreview(!mostrarPreview)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {mostrarPreview ? 'Ocultar' : 'Mostrar'} Preview
                      </Button>
                    </div>
                    <EditorContenido
                      value={formData.contenido}
                      onChange={(contenido) => setFormData(prev => ({ ...prev, contenido }))}
                      variables={VARIABLES_DISPONIBLES}
                    />
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3">
                    <Button type="submit" disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            {mostrarPreview && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PreviewPlantilla
                    tipo={formData.tipo}
                    contenido={formData.contenido}
                    variables={{
                      nombre: 'Juan Pérez',
                      monto: '$150.000',
                      fecha_vencimiento: '15 de enero, 2025',
                      empresa: 'Mi Empresa',
                      telefono: '+56912345678',
                      email: 'contacto@miempresa.com'
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Variables Disponibles */}
            <Card>
              <CardHeader>
                <CardTitle>Variables Disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {VARIABLES_DISPONIBLES.map(variable => (
                    <div key={variable.variable} className="flex items-start gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                        {variable.variable}
                      </code>
                      <div>
                        <p className="text-sm font-medium">{variable.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Haz clic en cualquier variable para insertarla en el contenido
                </p>
              </CardContent>
            </Card>

            {/* Información del Tipo */}
            {tipoSeleccionado && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <tipoSeleccionado.icon className="h-5 w-5" />
                    {tipoSeleccionado.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    {tipoSeleccionado.descripcion}
                  </p>
                  
                  {formData.tipo === 'email' && (
                    <div className="text-xs text-gray-500">
                      <p className="font-medium mb-1">Recomendaciones:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Incluye saludo personalizado</li>
                        <li>Menciona el monto específico</li>
                        <li>Proporciona opciones de pago</li>
                        <li>Mantén un tono profesional</li>
                      </ul>
                    </div>
                  )}
                  
                  {formData.tipo === 'voz' && (
                    <div className="text-xs text-gray-500">
                      <p className="font-medium mb-1">Recomendaciones:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Saludo claro y profesional</li>
                        <li>Verificación de identidad</li>
                        <li>Información concisa</li>
                        <li>Opciones de contacto</li>
                      </ul>
                    </div>
                  )}
                  
                  {(formData.tipo === 'sms' || formData.tipo === 'whatsapp') && (
                    <div className="text-xs text-gray-500">
                      <p className="font-medium mb-1">Recomendaciones:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Mensaje corto y directo</li>
                        <li>Incluye monto y fecha</li>
                        <li>Enlace de pago si aplica</li>
                        <li>Máximo 160 caracteres (SMS)</li>
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Información de la Plantilla */}
            <Card>
              <CardHeader>
                <CardTitle>Información</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Creada:</span>
                    <span>{new Date(plantilla.created_at).toLocaleDateString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Caracteres:</span>
                    <span>{formData.contenido.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Variables:</span>
                    <span>{(formData.contenido.match(/\{\{[^}]+\}\}/g) || []).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Protected>
  )
}
