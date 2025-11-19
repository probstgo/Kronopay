'use client'

import { useState, useEffect } from 'react'
import { Node } from 'reactflow'
import { Eye } from 'lucide-react'
import { PreviewDialog } from '@/app/plantillas/components/PreviewDialog'
import { EventTimingSelector, requiereDiasRelativos, TipoEvento } from './EventTimingSelector'

interface WhatsAppConfigFormProps {
  node: Node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (config: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConfigChange?: (config: any) => void
}

interface Plantilla {
  id: string
  nombre: string
  tipo: string
  contenido: string
  tipo_contenido?: 'texto' | 'html'
}

interface WhatsAppConfig {
  plantilla_id: string
  tipo_evento: TipoEvento
  dias_relativos: number | null
  configuracion_avanzada: {
    horario_envio: { inicio: string; fin: string }
    reintentos: number
  }
}

const defaultWhatsAppConfiguracion: WhatsAppConfig = {
  plantilla_id: '',
  tipo_evento: 'deuda_creada',
  dias_relativos: null,
  configuracion_avanzada: {
    horario_envio: { inicio: '09:00', fin: '18:00' },
    reintentos: 3
  }
}

const buildInitialConfig = (nodeConfig: Record<string, unknown> | undefined): WhatsAppConfig => {
  const base = (nodeConfig || {}) as Record<string, unknown>
  const advConfig = (base.configuracion_avanzada as Record<string, unknown>) || {}
  const horarioEnvio = (advConfig.horario_envio as Record<string, unknown>) || {}
  
  return {
    plantilla_id: (base.plantilla_id as string) || defaultWhatsAppConfiguracion.plantilla_id,
    tipo_evento: (base.tipo_evento as TipoEvento) || defaultWhatsAppConfiguracion.tipo_evento,
    dias_relativos: typeof base.dias_relativos === 'number' ? (base.dias_relativos as number) : defaultWhatsAppConfiguracion.dias_relativos,
    configuracion_avanzada: {
      horario_envio: {
        inicio: (horarioEnvio.inicio as string) || defaultWhatsAppConfiguracion.configuracion_avanzada.horario_envio.inicio,
        fin: (horarioEnvio.fin as string) || defaultWhatsAppConfiguracion.configuracion_avanzada.horario_envio.fin
      },
      reintentos: typeof advConfig.reintentos === 'number' ? (advConfig.reintentos as number) : defaultWhatsAppConfiguracion.configuracion_avanzada.reintentos
    }
  }
}

export function WhatsAppConfigForm({ node, onSave, onConfigChange }: WhatsAppConfigFormProps) {
  const [config, setConfig] = useState(buildInitialConfig(node.data.configuracion))
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<Plantilla | null>(null)

  // Cargar plantillas desde la BD
  useEffect(() => {
    const cargarPlantillas = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/plantillas?tipo=whatsapp')
        
        if (!response.ok) {
          throw new Error('Error al cargar plantillas')
        }
        
        const data = await response.json()
        setPlantillas(data)
        // Si hay una plantilla seleccionada, actualizar plantillaSeleccionada
        if (config.plantilla_id) {
          const plantilla = data.find((p: Plantilla) => p.id === config.plantilla_id)
          setPlantillaSeleccionada(plantilla || null)
        }
      } catch (err) {
        console.error('Error cargando plantillas:', err)
        setError('Error al cargar plantillas. Por favor, recarga la página.')
      } finally {
        setLoading(false)
      }
    }

    cargarPlantillas()
  }, [])

  const handleSave = () => {
    if (requiereDiasRelativos(config.tipo_evento) && (config.dias_relativos === null || config.dias_relativos === undefined)) {
      setError('Debes especificar cuántos días antes o después del vencimiento')
      return
    }

    // Validar que se haya seleccionado una plantilla
    if (!config.plantilla_id) {
      setError('Debes seleccionar una plantilla de WhatsApp para continuar')
      return
    }

    // Validar que existan plantillas disponibles
    if (plantillas.length === 0) {
      setError('No hay plantillas de WhatsApp disponibles. Crea una en la sección de Plantillas.')
      return
    }

    setError(null)
    onSave(config)
  }

  // Notificar cambios cuando se modifica la configuración
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config)
    }
  }, [config, onConfigChange])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Plantilla de WhatsApp <span className="text-red-500">*</span>
        </label>
        {loading ? (
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
            Cargando plantillas...
          </div>
        ) : (
          <select 
            value={config.plantilla_id}
            onChange={(e) => {
              const plantillaId = e.target.value
              setConfig({...config, plantilla_id: plantillaId})
              setError(null)
              // Actualizar plantilla seleccionada para el preview
              const plantilla = plantillas.find(p => p.id === plantillaId)
              setPlantillaSeleccionada(plantilla || null)
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
              error && !config.plantilla_id ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Seleccionar plantilla</option>
            {plantillas.map((plantilla) => (
              <option key={plantilla.id} value={plantilla.id}>
                {plantilla.nombre}
              </option>
            ))}
          </select>
        )}
        {plantillas.length === 0 && !loading && (
          <p className="text-xs text-gray-500 mt-1">
            No hay plantillas de WhatsApp disponibles. Crea una en la sección de Plantillas.
          </p>
        )}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-600 font-medium">{error}</p>
          </div>
        )}
        {config.plantilla_id && plantillaSeleccionada && (
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="mt-2 flex items-center gap-2 text-sm text-green-600 hover:text-green-800 transition-colors"
          >
            <Eye className="h-4 w-4" />
            Ver Preview de la Plantilla
          </button>
        )}
      </div>

      <div>
        <EventTimingSelector
          value={{ tipo_evento: config.tipo_evento, dias_relativos: config.dias_relativos }}
          onChange={(eventConfig) => {
            setConfig({ ...config, ...eventConfig })
            if (error) setError(null)
          }}
          error={error && requiereDiasRelativos(config.tipo_evento) ? error : null}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Configuración Avanzada
        </label>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Horario inicio</label>
              <input 
                type="time"
                value={config.configuracion_avanzada.horario_envio.inicio}
                onChange={(e) => setConfig({
                  ...config, 
                  configuracion_avanzada: {
                    ...config.configuracion_avanzada, 
                    horario_envio: {...config.configuracion_avanzada.horario_envio, inicio: e.target.value}
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Horario fin</label>
              <input 
                type="time"
                value={config.configuracion_avanzada.horario_envio.fin}
                onChange={(e) => setConfig({
                  ...config, 
                  configuracion_avanzada: {
                    ...config.configuracion_avanzada, 
                    horario_envio: {...config.configuracion_avanzada.horario_envio, fin: e.target.value}
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Número de reintentos</label>
            <input 
              type="number"
              min="0"
              max="5"
              value={config.configuracion_avanzada.reintentos}
              onChange={(e) => setConfig({
                ...config, 
                configuracion_avanzada: {...config.configuracion_avanzada, reintentos: parseInt(e.target.value)}
              })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={!config.plantilla_id || plantillas.length === 0}
        className={`w-full py-2 px-4 rounded-md transition-colors ${
          !config.plantilla_id || plantillas.length === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
      >
        {!config.plantilla_id ? 'Selecciona una plantilla para guardar' : 'Guardar Configuración'}
      </button>

      {/* Preview Dialog */}
      {plantillaSeleccionada && (
        <PreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          nombre={plantillaSeleccionada.nombre}
          tipo="whatsapp"
          tipoContenido={plantillaSeleccionada.tipo_contenido || 'texto'}
          contenido={plantillaSeleccionada.contenido}
        />
      )}
    </div>
  )
}

