'use client'

import React from 'react'
import BaseNode, { BaseNodeProps } from './BaseNode'

export interface EsperaNodeProps extends Omit<BaseNodeProps, 'tipo' | 'nombre' | 'icono' | 'color' | 'descripcion'> {
  configuracion: {
    duracion: {
      tipo: 'minutos' | 'horas' | 'dias' | 'semanas'
      cantidad: number
    }
    configuracion_avanzada: {
      solo_dias_laborables: boolean
      excluir_fines_semana: boolean
      excluir_feriados: boolean
      zona_horaria: string
    }
    conexiones: {
      siguiente_paso: string
    }
  }
}

export default function EsperaNode(props: EsperaNodeProps) {
  const { duracion } = props.configuracion
  
  const esperaProps: BaseNodeProps = {
    ...props,
    tipo: 'espera',
    nombre: 'Espera',
    icono: '⏰',
    color: 'bg-yellow-500',
    descripcion: `${duracion.cantidad} ${duracion.tipo}`
  }

  return <BaseNode {...esperaProps} />
}
