'use client'

import React from 'react'
import BaseNode, { BaseNodeProps } from './BaseNode'

export interface EmailNodeProps extends Omit<BaseNodeProps, 'tipo' | 'nombre' | 'icono' | 'color' | 'descripcion'> {
  configuracion: {
    plantilla_id: string
    asunto_personalizado?: string
    variables_dinamicas: {
      nombre: boolean
      monto: boolean
      fecha_vencimiento: boolean
      empresa: boolean
    }
    configuracion_avanzada: {
      solo_dias_laborables: boolean
      horario_trabajo: { inicio: string; fin: string }
      reintentos: number
      timeout_minutos: number
    }
    conexiones: {
      si_exito: string
      si_falla: string
      si_timeout: string
    }
  }
}

export default function EmailNode(props: EmailNodeProps) {
  const emailProps: BaseNodeProps = {
    ...props,
    tipo: 'email',
    nombre: 'Email',
    icono: '📧',
    color: 'bg-blue-500',
    descripcion: props.configuracion.plantilla_id 
      ? `Plantilla: ${props.configuracion.plantilla_id}` 
      : 'Enviar email'
  }

  return <BaseNode {...emailProps} />
}
