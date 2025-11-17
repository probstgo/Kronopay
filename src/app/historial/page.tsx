"use client"

import { Suspense, useState } from 'react'

import { HeaderHistorial } from './components/HeaderHistorial'
import HistorialApp from './components/HistorialApp'

export default function Page() {
  const [exportModalOpen, setExportModalOpen] = useState(false)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* 1. Título */}
        <HeaderHistorial onExportClick={() => setExportModalOpen(true)} />
        
        {/* 2. Contenido principal */}
        <Suspense fallback={<div>Cargando…</div>}>
          <HistorialApp exportModalOpen={exportModalOpen} onExportModalChange={setExportModalOpen} />
        </Suspense>
      </div>
    </div>
  )
}
