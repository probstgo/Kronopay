'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Save } from 'lucide-react'
import { WorkflowNode } from './JourneyBuilder'

interface NodeConfigPanelProps {
  node: WorkflowNode | null
  onClose: () => void
  onSave: (nodeId: string, config: Record<string, unknown>) => void
}

export default function NodeConfigPanel({ node, onClose, onSave }: NodeConfigPanelProps) {
  const [config, setConfig] = React.useState<Record<string, unknown>>({})

  React.useEffect(() => {
    if (node) {
      setConfig(node.configuracion)
    }
  }, [node])

  if (!node) return null

  const handleSave = () => {
    onSave(node.id, config)
    onClose()
  }

  const renderTriggerConfig = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="activacion">Tipo de Activación</Label>
        <Select
          value={(config.activacion as string) || 'manual'}
          onValueChange={(value) => setConfig(prev => ({ ...prev, activacion: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar activación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="programada">Programada</SelectItem>
            <SelectItem value="evento">Por Evento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filtros">Filtros Adicionales</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="monto_minimo"
              checked={!!(config.filtros_adicionales as { monto_minimo?: number })?.monto_minimo}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                filtros_adicionales: {
                  ...(prev.filtros_adicionales as Record<string, unknown> || {}),
                  monto_minimo: checked ? 100000 : undefined
                }
              }))}
            />
            <Label htmlFor="monto_minimo">Monto mínimo</Label>
          </div>
          {(config.filtros_adicionales as { monto_minimo?: number })?.monto_minimo && (
            <Input
              type="number"
              value={(config.filtros_adicionales as { monto_minimo?: number }).monto_minimo || ''}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                filtros_adicionales: {
                  ...(prev.filtros_adicionales as Record<string, unknown> || {}),
                  monto_minimo: parseInt(e.target.value) || 0
                }
              }))}
              placeholder="Monto mínimo"
            />
          )}
        </div>
      </div>
    </div>
  )

  const renderEmailConfig = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="plantilla">Plantilla de Email</Label>
        <Select
          value={(config.plantilla_id as string) || ''}
          onValueChange={(value) => setConfig(prev => ({ ...prev, plantilla_id: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar plantilla" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recordatorio">Recordatorio de Pago</SelectItem>
            <SelectItem value="urgente">Cobranza Urgente</SelectItem>
            <SelectItem value="negociacion">Negociación</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="asunto">Asunto Personalizado</Label>
        <Input
          value={(config.asunto_personalizado as string) || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, asunto_personalizado: e.target.value }))}
          placeholder="Asunto del email"
        />
      </div>

      <div>
        <Label>Variables Dinámicas</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="nombre"
              checked={(config.variables_dinamicas as { nombre?: boolean })?.nombre || false}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                  variables_dinamicas: { ...(prev.variables_dinamicas as Record<string, unknown> || {}), nombre: checked }
              }))}
            />
            <Label htmlFor="nombre">Nombre del deudor</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="monto"
              checked={(config.variables_dinamicas as { monto?: boolean })?.monto || false}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                  variables_dinamicas: { ...(prev.variables_dinamicas as Record<string, unknown> || {}), monto: checked }
              }))}
            />
            <Label htmlFor="monto">Monto de la deuda</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="fecha_vencimiento"
              checked={(config.variables_dinamicas as { fecha_vencimiento?: boolean })?.fecha_vencimiento || false}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                  variables_dinamicas: { ...(prev.variables_dinamicas as Record<string, unknown> || {}), fecha_vencimiento: checked }
              }))}
            />
            <Label htmlFor="fecha_vencimiento">Fecha de vencimiento</Label>
          </div>
        </div>
      </div>

      <div>
        <Label>Configuración Avanzada</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="solo_laborables"
              checked={(config.configuracion_avanzada as { solo_dias_laborables?: boolean })?.solo_dias_laborables || false}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                configuracion_avanzada: { ...(prev.configuracion_avanzada as Record<string, unknown> || {}), solo_dias_laborables: checked }
              }))}
            />
            <Label htmlFor="solo_laborables">Solo días laborables</Label>
          </div>
          <div>
            <Label htmlFor="reintentos">Reintentos</Label>
            <Input
              type="number"
              value={(config.configuracion_avanzada as { reintentos?: number })?.reintentos || 3}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                configuracion_avanzada: { ...(prev.configuracion_avanzada as Record<string, unknown> || {}), reintentos: parseInt(e.target.value) || 3 }
              }))}
              min="1"
              max="10"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderEsperaConfig = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="duracion_tipo">Tipo de Duración</Label>
        <Select
          value={(config.duracion as { tipo?: string })?.tipo || 'horas'}
          onValueChange={(value) => setConfig(prev => ({
            ...prev,
            duracion: { ...(prev.duracion as Record<string, unknown> || {}), tipo: value }
          }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutos">Minutos</SelectItem>
            <SelectItem value="horas">Horas</SelectItem>
            <SelectItem value="dias">Días</SelectItem>
            <SelectItem value="semanas">Semanas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="duracion_cantidad">Cantidad</Label>
        <Input
          type="number"
          value={(config.duracion as { cantidad?: number })?.cantidad || 24}
          onChange={(e) => setConfig(prev => ({
            ...prev,
            duracion: { ...(prev.duracion as Record<string, unknown> || {}), cantidad: parseInt(e.target.value) || 1 }
          }))}
          min="1"
        />
      </div>

      <div>
        <Label>Configuración Avanzada</Label>
        <div className="space-y-2 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="solo_laborables_espera"
              checked={(config.configuracion_avanzada as { solo_dias_laborables?: boolean })?.solo_dias_laborables || false}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                configuracion_avanzada: { ...(prev.configuracion_avanzada as Record<string, unknown> || {}), solo_dias_laborables: checked }
              }))}
            />
            <Label htmlFor="solo_laborables_espera">Solo días laborables</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="excluir_fines_semana"
              checked={(config.configuracion_avanzada as { excluir_fines_semana?: boolean })?.excluir_fines_semana || false}
              onCheckedChange={(checked) => setConfig(prev => ({
                ...prev,
                configuracion_avanzada: { ...(prev.configuracion_avanzada as Record<string, unknown> || {}), excluir_fines_semana: checked }
              }))}
            />
            <Label htmlFor="excluir_fines_semana">Excluir fines de semana</Label>
          </div>
        </div>
      </div>
    </div>
  )

  const renderGenericConfig = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          value={(config.descripcion as string) || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, descripcion: e.target.value }))}
          placeholder="Descripción del nodo"
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor="estado">Estado</Label>
        <Select
          value={(config.estado as string) || 'listo'}
          onValueChange={(value) => setConfig(prev => ({ ...prev, estado: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="listo">Listo</SelectItem>
            <SelectItem value="configurando">Configurando</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const getConfigContent = () => {
    switch (node.tipo) {
      case 'trigger': return renderTriggerConfig()
      case 'email': return renderEmailConfig()
      case 'espera': return renderEsperaConfig()
      default: return renderGenericConfig()
    }
  }

  return (
    <div className="w-80 bg-white border-l p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Configuración</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">
            {node.tipo === 'trigger' && '🚀'}
            {node.tipo === 'email' && '📧'}
            {node.tipo === 'llamada' && '📞'}
            {node.tipo === 'sms' && '📱'}
            {node.tipo === 'espera' && '⏰'}
            {node.tipo === 'condicion' && '🔀'}
            {node.tipo === 'estadistica' && '📊'}
          </span>
          <span className="font-medium">
            {node.tipo === 'trigger' && 'Nodo Inicio'}
            {node.tipo === 'email' && 'Nodo Email'}
            {node.tipo === 'llamada' && 'Nodo Llamada'}
            {node.tipo === 'sms' && 'Nodo SMS'}
            {node.tipo === 'espera' && 'Nodo Espera'}
            {node.tipo === 'condicion' && 'Nodo Condición'}
            {node.tipo === 'estadistica' && 'Nodo Estadística'}
          </span>
        </div>
        <p className="text-sm text-gray-500">ID: {node.id}</p>
      </div>

      <Card className="p-4 mb-4">
        {getConfigContent()}
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          Guardar
        </Button>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
