'use client'

import { useState, useEffect } from 'react'
import { Node } from 'reactflow'

interface FiltroConfigFormProps {
  node: Node
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (config: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConfigChange?: (config: any) => void
}

export function FiltroConfigForm({ node, onSave, onConfigChange }: FiltroConfigFormProps) {
  const [config, setConfig] = useState(node.data.configuracion || {
    filtros: {
      estado_deuda: [],
      rango_monto: { min: null, max: null },
      dias_vencidos: { min: null, max: null },
      tipo_contacto: [],
      historial_acciones: []
    },
    ordenamiento: {
      campo: 'monto' as 'monto' | 'fecha' | 'dias_vencidos',
      direccion: 'desc' as 'asc' | 'desc'
    },
    limite_resultados: null
  })
  const [contadorDeudores, setContadorDeudores] = useState<number | null>(null)
  const [loadingContador, setLoadingContador] = useState(false)

  const handleSave = () => {
    onSave(config)
  }

  // Notificar cambios cuando se modifica la configuración
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config)
    }
  }, [config, onConfigChange])

  // Calcular contador de deudores con filtros aplicados
  useEffect(() => {
    const calcularContador = async () => {
      // Verificar si hay filtros activos
      const tieneFiltros = 
        (config.filtros.estado_deuda && config.filtros.estado_deuda.length > 0) ||
        (config.filtros.rango_monto && (config.filtros.rango_monto.min !== null || config.filtros.rango_monto.max !== null)) ||
        (config.filtros.dias_vencidos && (config.filtros.dias_vencidos.min !== null || config.filtros.dias_vencidos.max !== null)) ||
        (config.filtros.tipo_contacto && config.filtros.tipo_contacto.length > 0) ||
        (config.filtros.historial_acciones && config.filtros.historial_acciones.length > 0)

      if (!tieneFiltros) {
        setContadorDeudores(null)
        return
      }

      try {
        setLoadingContador(true)
        const response = await fetch('/api/deudores/contar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filtros: {
              estado_deuda: config.filtros.estado_deuda || [],
              rango_monto: config.filtros.rango_monto || { min: null, max: null },
              dias_vencidos: config.filtros.dias_vencidos || { min: null, max: null },
              tipo_contacto: config.filtros.tipo_contacto || [],
              historial_acciones: config.filtros.historial_acciones || [],
              limite_resultados: config.limite_resultados
            }
          })
        })

        if (response.ok) {
          const data = await response.json()
          setContadorDeudores(data.total)
        } else {
          console.error('Error calculando contador')
          setContadorDeudores(null)
        }
      } catch (error) {
        console.error('Error calculando contador de deudores:', error)
        setContadorDeudores(null)
      } finally {
        setLoadingContador(false)
      }
    }

    // Debounce para evitar demasiadas llamadas
    const timeoutId = setTimeout(() => {
      calcularContador()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [config])

  const estadosDeuda = [
    { value: 'nueva', label: 'Nueva', icon: '🆕' },
    { value: 'vigente', label: 'Vigente', icon: '🟢' },
    { value: 'vencida', label: 'Vencida', icon: '⚠️' },
    { value: 'pagada', label: 'Pagada', icon: '✅' }
  ]

  const tiposContacto = [
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'telefono', label: 'Teléfono', icon: '📞' }
  ]

  const historialAcciones = [
    { value: 'email_enviado', label: 'Email Enviado', icon: '📧' },
    { value: 'llamada_realizada', label: 'Llamada Realizada', icon: '📞' },
    { value: 'sms_enviado', label: 'SMS Enviado', icon: '📱' }
  ]

  const toggleEstado = (estado: string) => {
    const estados = config.filtros.estado_deuda || []
    if (estados.includes(estado)) {
      setConfig({
        ...config,
        filtros: {
          ...config.filtros,
          estado_deuda: estados.filter((e: string) => e !== estado)
        }
      })
    } else {
      setConfig({
        ...config,
        filtros: {
          ...config.filtros,
          estado_deuda: [...estados, estado]
        }
      })
    }
  }

  const toggleTipoContacto = (tipo: string) => {
    const tipos = config.filtros.tipo_contacto || []
    if (tipos.includes(tipo)) {
      setConfig({
        ...config,
        filtros: {
          ...config.filtros,
          tipo_contacto: tipos.filter((t: string) => t !== tipo)
        }
      })
    } else {
      setConfig({
        ...config,
        filtros: {
          ...config.filtros,
          tipo_contacto: [...tipos, tipo]
        }
      })
    }
  }

  const toggleHistorial = (accion: string) => {
    const acciones = config.filtros.historial_acciones || []
    if (acciones.includes(accion)) {
      setConfig({
        ...config,
        filtros: {
          ...config.filtros,
          historial_acciones: acciones.filter((a: string) => a !== accion)
        }
      })
    } else {
      setConfig({
        ...config,
        filtros: {
          ...config.filtros,
          historial_acciones: [...acciones, accion]
        }
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Contador de deudores */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium text-indigo-800 mb-1">
              Deudores que pasarán el filtro
            </div>
            <div className="text-xs text-indigo-600">
              {loadingContador ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600"></div>
                  <span>Calculando...</span>
                </div>
              ) : contadorDeudores !== null ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-indigo-900">{contadorDeudores}</span>
                  <span className="text-sm text-indigo-700">
                    {contadorDeudores === 1 ? 'deudor' : 'deudores'}
                    {config.limite_resultados && contadorDeudores >= config.limite_resultados && (
                      <span className="text-indigo-500 ml-1">(límite aplicado)</span>
                    )}
                  </span>
                </div>
              ) : (
                <span className="text-indigo-500">Configura filtros para ver el contador</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filtros por Estado de Deuda */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Estado de Deuda
        </label>
        <div className="grid grid-cols-2 gap-2">
          {estadosDeuda.map((estado) => (
            <label
              key={estado.value}
              className={`flex items-center space-x-2 p-2 border rounded-md cursor-pointer transition-colors ${
                config.filtros.estado_deuda?.includes(estado.value)
                  ? 'bg-indigo-50 border-indigo-500'
                  : 'bg-white border-gray-300 hover:border-indigo-300'
              }`}
            >
              <input
                type="checkbox"
                checked={config.filtros.estado_deuda?.includes(estado.value) || false}
                onChange={() => toggleEstado(estado.value)}
                className="mr-2"
              />
              <span className="text-sm">{estado.icon} {estado.label}</span>
            </label>
          ))}
        </div>
        {config.filtros.estado_deuda && config.filtros.estado_deuda.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">Si no seleccionas ningún estado, se incluirán todos</p>
        )}
      </div>

      {/* Rango de Monto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rango de Monto
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Monto Mínimo</label>
            <input
              type="number"
              min="0"
              value={config.filtros.rango_monto?.min || ''}
              onChange={(e) => setConfig({
                ...config,
                filtros: {
                  ...config.filtros,
                  rango_monto: {
                    ...config.filtros.rango_monto,
                    min: e.target.value ? parseFloat(e.target.value) : null
                  }
                }
              })}
              placeholder="0"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Monto Máximo</label>
            <input
              type="number"
              min="0"
              value={config.filtros.rango_monto?.max || ''}
              onChange={(e) => setConfig({
                ...config,
                filtros: {
                  ...config.filtros,
                  rango_monto: {
                    ...config.filtros.rango_monto,
                    max: e.target.value ? parseFloat(e.target.value) : null
                  }
                }
              })}
              placeholder="Sin límite"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Días Vencidos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Días Vencidos
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Mínimo</label>
            <input
              type="number"
              min="0"
              value={config.filtros.dias_vencidos?.min || ''}
              onChange={(e) => setConfig({
                ...config,
                filtros: {
                  ...config.filtros,
                  dias_vencidos: {
                    ...config.filtros.dias_vencidos,
                    min: e.target.value ? parseInt(e.target.value) : null
                  }
                }
              })}
              placeholder="0"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Máximo</label>
            <input
              type="number"
              min="0"
              value={config.filtros.dias_vencidos?.max || ''}
              onChange={(e) => setConfig({
                ...config,
                filtros: {
                  ...config.filtros,
                  dias_vencidos: {
                    ...config.filtros.dias_vencidos,
                    max: e.target.value ? parseInt(e.target.value) : null
                  }
                }
              })}
              placeholder="Sin límite"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tipo de Contacto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Contacto
        </label>
        <div className="grid grid-cols-2 gap-2">
          {tiposContacto.map((tipo) => (
            <label
              key={tipo.value}
              className={`flex items-center space-x-2 p-2 border rounded-md cursor-pointer transition-colors ${
                config.filtros.tipo_contacto?.includes(tipo.value)
                  ? 'bg-indigo-50 border-indigo-500'
                  : 'bg-white border-gray-300 hover:border-indigo-300'
              }`}
            >
              <input
                type="checkbox"
                checked={config.filtros.tipo_contacto?.includes(tipo.value) || false}
                onChange={() => toggleTipoContacto(tipo.value)}
                className="mr-2"
              />
              <span className="text-sm">{tipo.icon} {tipo.label}</span>
            </label>
          ))}
        </div>
        {config.filtros.tipo_contacto && config.filtros.tipo_contacto.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">Si no seleccionas ningún tipo, se incluirán todos</p>
        )}
      </div>

      {/* Historial de Acciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Historial de Acciones
        </label>
        <div className="space-y-2">
          {historialAcciones.map((accion) => (
            <label
              key={accion.value}
              className={`flex items-center space-x-2 p-2 border rounded-md cursor-pointer transition-colors ${
                config.filtros.historial_acciones?.includes(accion.value)
                  ? 'bg-indigo-50 border-indigo-500'
                  : 'bg-white border-gray-300 hover:border-indigo-300'
              }`}
            >
              <input
                type="checkbox"
                checked={config.filtros.historial_acciones?.includes(accion.value) || false}
                onChange={() => toggleHistorial(accion.value)}
                className="mr-2"
              />
              <span className="text-sm">{accion.icon} {accion.label}</span>
            </label>
          ))}
        </div>
        {config.filtros.historial_acciones && config.filtros.historial_acciones.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">Si no seleccionas ninguna acción, se incluirán todos los deudores</p>
        )}
      </div>

      {/* Ordenamiento */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ordenamiento
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Campo</label>
            <select
              value={config.ordenamiento?.campo || 'monto'}
              onChange={(e) => setConfig({
                ...config,
                ordenamiento: {
                  ...config.ordenamiento,
                  campo: e.target.value as 'monto' | 'fecha' | 'dias_vencidos'
                }
              })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="monto">Monto</option>
              <option value="fecha">Fecha</option>
              <option value="dias_vencidos">Días Vencidos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Dirección</label>
            <select
              value={config.ordenamiento?.direccion || 'desc'}
              onChange={(e) => setConfig({
                ...config,
                ordenamiento: {
                  ...config.ordenamiento,
                  direccion: e.target.value as 'asc' | 'desc'
                }
              })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Límite de Resultados */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Límite de Resultados
        </label>
        <input
          type="number"
          min="1"
          value={config.limite_resultados || ''}
          onChange={(e) => setConfig({
            ...config,
            limite_resultados: e.target.value ? parseInt(e.target.value) : null
          })}
          placeholder="Sin límite (todos los deudores)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Deja vacío para incluir todos los deudores que cumplan los filtros
        </p>
      </div>

      <button 
        onClick={handleSave}
        className="w-full bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition-colors"
      >
        Guardar Configuración
      </button>
    </div>
  )
}

