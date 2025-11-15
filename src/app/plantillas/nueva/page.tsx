'use client'

import { useState } from 'react'
import Protected from '@/components/Protected'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Eye, Mail, MessageSquare, Type, Code, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { EditorContenido } from '../components/EditorContenido'
import { PreviewPlantilla } from '../components/PreviewPlantilla'
import { TestEmailModal } from '../components/TestEmailModal'
import { PreviewDialog } from '../components/PreviewDialog'

const TIPOS_PLANTILLA = [
  { value: 'email', label: 'Email', icon: Mail, descripcion: 'Para envío de emails de cobranza' },
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

export default function NuevaPlantillaPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'email' as 'email' | 'sms' | 'whatsapp',
    tipo_contenido: 'texto' as 'texto' | 'html',
    asunto: '',
    contenido: ''
  })
  const [loading, setLoading] = useState(false)
  const [mostrarPreview, setMostrarPreview] = useState(false)
  const [mostrarTestEmail, setMostrarTestEmail] = useState(false)
  const SMS_TEMPLATE_LIMIT = 120
  const contenidoLength = formData.contenido.length
  const excedeLimiteSms = formData.tipo === 'sms' && contenidoLength > SMS_TEMPLATE_LIMIT

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    
    if (formData.tipo === 'email' && !formData.asunto.trim()) {
      toast.error('El asunto es requerido para emails')
      return
    }

    if (!formData.contenido.trim()) {
      toast.error('El contenido es requerido')
      return
    }

    if (excedeLimiteSms) {
      toast.error(`Las plantillas SMS no pueden exceder los ${SMS_TEMPLATE_LIMIT} caracteres`)
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('plantillas')
        .insert({
          nombre: formData.nombre.trim(),
          tipo: formData.tipo,
          tipo_contenido: formData.tipo_contenido,
          asunto: formData.tipo === 'email' ? formData.asunto.trim() : null,
          contenido: formData.contenido.trim(),
          usuario_id: user?.id
        })

      if (error) throw error

      toast.success('Plantilla creada exitosamente')
      router.push('/plantillas')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al crear plantilla: ' + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const tipoSeleccionado = TIPOS_PLANTILLA.find(t => t.value === formData.tipo)

  return (
    <Protected>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nueva Plantilla</h1>
            <p className="text-gray-600 mt-1">Crea una nueva plantilla de mensaje</p>
          </div>
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

                  {/* Tipo y Tipo de Contenido (lado a lado) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo de Plantilla</Label>
                      <Select 
                        value={formData.tipo} 
                        onValueChange={(value: 'email' | 'sms' | 'whatsapp') => setFormData(prev => ({ ...prev, tipo: value }))}
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

                    {formData.tipo === 'email' && (
                      <div>
                        <Label>Tipo de Contenido</Label>
                        <Select 
                          value={formData.tipo_contenido} 
                          onValueChange={(value: 'texto' | 'html') => setFormData(prev => ({ ...prev, tipo_contenido: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo de contenido" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="texto">
                              <div className="flex items-center gap-2">
                                <Type className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">Texto Plano</div>
                                  <div className="text-xs text-gray-500">Contenido en texto simple</div>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="html">
                              <div className="flex items-center gap-2">
                                <Code className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">HTML</div>
                                  <div className="text-xs text-gray-500">Contenido con formato HTML</div>
                                </div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Asunto - Solo para Email */}
                  {formData.tipo === 'email' && (
                    <div>
                      <Label htmlFor="asunto">Asunto</Label>
                      <Input
                        id="asunto"
                        value={formData.asunto}
                        onChange={(e) => setFormData(prev => ({ ...prev, asunto: e.target.value }))}
                        placeholder="Asunto del email..."
                      />
                    </div>
                  )}

                  {/* Contenido */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="contenido">Contenido</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMostrarPreview(true)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Preview
                      </Button>
                    </div>
                    <EditorContenido
                      value={formData.contenido}
                      onChange={(contenido) => setFormData(prev => ({ ...prev, contenido }))}
                      variables={VARIABLES_DISPONIBLES}
                      tipoContenido={formData.tipo_contenido}
                      maxLength={formData.tipo === 'sms' ? SMS_TEMPLATE_LIMIT : undefined}
                    />
                    {formData.tipo === 'sms' && (
                      <p className={`text-xs mt-2 ${excedeLimiteSms ? 'text-red-600' : 'text-gray-500'}`}>
                        {contenidoLength}/{SMS_TEMPLATE_LIMIT} caracteres
                        {excedeLimiteSms && ' — excede el límite permitido'}
                      </p>
                    )}
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3">
                    <Button type="submit" disabled={loading || excedeLimiteSms}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Guardando...' : 'Guardar Plantilla'}
                    </Button>
                    {formData.tipo === 'email' && (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setMostrarTestEmail(true)}
                        disabled={!formData.contenido.trim()}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Probar Email
                      </Button>
                    )}
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
          </div>
        </div>

        {/* Modal de Preview */}
        <PreviewDialog
          open={mostrarPreview}
          onOpenChange={setMostrarPreview}
          nombre={formData.nombre}
          asunto={formData.tipo === 'email' ? formData.asunto : undefined}
          tipo={formData.tipo}
          tipoContenido={formData.tipo_contenido}
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

        {/* Modal de Test Email */}
        <TestEmailModal
          contenido={formData.contenido}
          tipoContenido={formData.tipo_contenido}
          asunto={formData.tipo === 'email' ? formData.asunto : ''}
          open={mostrarTestEmail}
          onOpenChange={setMostrarTestEmail}
        />
      </div>
    </Protected>
  )
}
