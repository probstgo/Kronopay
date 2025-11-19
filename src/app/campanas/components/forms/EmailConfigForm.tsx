'use client'

import { useState, useEffect } from 'react'
import { Node } from 'reactflow'
import { Eye } from 'lucide-react'
import { PreviewDialog } from '@/app/plantillas/components/PreviewDialog'
import { EventTimingSelector, requiereDiasRelativos, TipoEvento } from './EventTimingSelector'

interface EmailConfigFormProps {
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
  asunto?: string
  contenido: string
  tipo_contenido?: 'texto' | 'html'
}

const buildInitialConfig = (nodeConfig: Record<string, unknown> | undefined) => {
  const base = (nodeConfig || {}) as Record<string, unknown>
  return {
    plantilla_id: (base.plantilla_id as string) || '',
    tipo_evento: (base.tipo_evento as TipoEvento) || 'deuda_creada',
    dias_relativos: typeof base.dias_relativos === 'number' ? (base.dias_relativos as number) : null,
    configuracion_avanzada: base.configuracion_avanzada || {
      solo_dias_laborables: true,
      horario_trabajo: { inicio: '09:00', fin: '18:00' },
      reintentos: 3
    }
  }
}

export function EmailConfigForm({ node, onSave, onConfigChange }: EmailConfigFormProps) {
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
        const response = await fetch('/api/plantillas?tipo=email')
        
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
      setError('Debes seleccionar una plantilla de email para continuar')
      return
    }

    // Validar que existan plantillas disponibles
    if (plantillas.length === 0) {
      setError('No hay plantillas de email disponibles. Crea una en la sección de Plantillas.')
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
          Plantilla de Email <span className="text-red-500">*</span>
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
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
            No hay plantillas de email disponibles. Crea una en la sección de Plantillas.
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
            className="mt-2 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Eye className="h-4 w-4" />
            Ver Preview de la Plantilla
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Configuración Avanzada
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input 
              type="checkbox"
              checked={config.configuracion_avanzada.solo_dias_laborables}
              onChange={(e) => setConfig({
                ...config, 
                configuracion_avanzada: {...config.configuracion_avanzada, solo_dias_laborables: e.target.checked}
              })}
              className="mr-2"
            />
            <span className="text-sm">Solo días laborables</span>
          </label>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Horario inicio</label>
              <input 
                type="time"
                value={config.configuracion_avanzada.horario_trabajo.inicio}
                onChange={(e) => setConfig({
                  ...config, 
                  configuracion_avanzada: {
                    ...config.configuracion_avanzada, 
                    horario_trabajo: {...config.configuracion_avanzada.horario_trabajo, inicio: e.target.value}
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Horario fin</label>
              <input 
                type="time"
                value={config.configuracion_avanzada.horario_trabajo.fin}
                onChange={(e) => setConfig({
                  ...config, 
                  configuracion_avanzada: {
                    ...config.configuracion_avanzada, 
                    horario_trabajo: {...config.configuracion_avanzada.horario_trabajo, fin: e.target.value}
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
            : 'bg-blue-500 text-white hover:bg-blue-600'
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
          asunto={plantillaSeleccionada.asunto}
          tipo="email"
          tipoContenido={plantillaSeleccionada.tipo_contenido || 'texto'}
          contenido={plantillaSeleccionada.contenido}
        />
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

  )
}
