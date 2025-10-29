'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, Calendar, DollarSign, AlertCircle } from 'lucide-react'

interface Factura {
  id: string
  periodo: string
  fecha: string
  monto: number
  estado: 'generada' | 'pagada' | 'vencida'
  pdf_url: string | null
}

interface PlanActualData {
  plan: {
    precio_mensual: number
  }
  fecha_renovacion: string | null
}

export default function Facturacion() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [planData, setPlanData] = useState<PlanActualData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [facturasResponse, planResponse] = await Promise.all([
        fetch('/api/suscripciones/facturas'),
        fetch('/api/suscripciones/actual')
      ])

      if (!facturasResponse.ok || !planResponse.ok) {
        throw new Error('Error al cargar datos de facturación')
      }

      const [facturasData, planData] = await Promise.all([
        facturasResponse.json(),
        planResponse.json()
      ])

      setFacturas(facturasData)
      setPlanData(planData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pagada':
        return 'bg-green-100 text-green-800'
      case 'generada':
        return 'bg-blue-100 text-blue-800'
      case 'vencida':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'pagada':
        return 'Pagada'
      case 'generada':
        return 'Pendiente'
      case 'vencida':
        return 'Vencida'
      default:
        return estado
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPeriodo = (periodo: string) => {
    const [year, month] = periodo.split('-')
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  const getProximoCargo = () => {
    if (!planData?.fecha_renovacion || !planData?.plan) return null
    
    const proximaFecha = new Date(planData.fecha_renovacion)
    const hoy = new Date()
    
    if (proximaFecha <= hoy) return null
    
    return {
      fecha: proximaFecha,
      monto: planData.plan.precio_mensual
    }
  }

  const proximoCargo = getProximoCargo()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchData} variant="outline" className="mt-2">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facturación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Próximo Cargo */}
        {proximoCargo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Próximo Cargo</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">
                  {formatDate(proximoCargo.fecha.toISOString())}
                </p>
                <p className="text-xs text-blue-600">
                  Renovación automática
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-900">
                  ${proximoCargo.monto.toLocaleString('es-ES')}
                </p>
                <p className="text-xs text-blue-600">Cargo mensual</p>
              </div>
            </div>
          </div>
        )}

        {/* Historial de Facturas */}
        <div>
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Historial de Facturas
          </h3>
          
          {facturas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay facturas disponibles</p>
              <p className="text-sm">Las facturas aparecerán aquí una vez generadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {facturas.map((factura) => (
                <div
                  key={factura.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded">
                      <FileText className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Factura {formatPeriodo(factura.periodo)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(factura.fecha)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium">
                        ${factura.monto.toLocaleString('es-ES')}
                      </p>
                      <Badge className={getEstadoColor(factura.estado)}>
                        {getEstadoText(factura.estado)}
                      </Badge>
                    </div>
                    
                    {factura.pdf_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(factura.pdf_url!, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen de Costos */}
        {planData && planData.plan && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="font-medium">Costo Mensual del Plan</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                ${planData.plan.precio_mensual.toLocaleString('es-ES')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
