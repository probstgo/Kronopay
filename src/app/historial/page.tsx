"use client"

import { Suspense } from 'react'

import { HeaderHistorial } from './components/HeaderHistorial'
import HistorialApp from './components/HistorialApp'

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* 1. Título */}
        <HeaderHistorial />
        
        {/* 2. Contenido principal */}
        <Suspense fallback={<div>Cargando…</div>}>
          <HistorialApp />
        </Suspense>
      </div>
    </div>
  )
}
