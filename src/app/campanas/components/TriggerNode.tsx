'use client'

import React from 'react'
import BaseNode, { BaseNodeProps } from './BaseNode'

export interface TriggerNodeProps extends Omit<BaseNodeProps, 'tipo' | 'nombre' | 'icono' | 'color' | 'descripcion'> {
  configuracion: {
    activacion: 'manual' | 'programada' | 'evento'
    deudores_seleccionados: string[]
    filtros_adicionales?: {
      monto_minimo?: number
      dias_vencido?: number
      estado_deuda?: string[]
    }
  }
}

export default function TriggerNode(props: TriggerNodeProps) {
  const triggerProps: BaseNodeProps = {
    ...props,
    tipo: 'trigger',
    nombre: 'Inicio',
    icono: '🚀',
    color: 'bg-green-500',
    descripcion: `Inicio del flujo (${props.configuracion.activacion})`
  }

  return <BaseNode {...triggerProps} />
}
