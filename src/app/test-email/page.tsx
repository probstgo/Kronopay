"use client"

import { useState } from 'react'
import Protected from "@/components/Protected"
import SelectorDeudor from './components/SelectorDeudor'
import FormularioEmail from './components/FormularioEmail'
import { Deudor } from '@/lib/database'

export default function TestEmailPage() {
  const [deudorSeleccionado, setDeudorSeleccionado] = useState<Deudor | null>(null)

  return (
    <Protected>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Prueba de Envío de Emails</h1>
          <p className="text-gray-600">
            Prueba el envío de emails usando los datos de tus deudores
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selector de deudor */}
          <div>
            <SelectorDeudor 
              onDeudorSelect={setDeudorSeleccionado}
              selectedDeudor={deudorSeleccionado}
            />
          </div>

          {/* Formulario de email */}
          <div>
            <FormularioEmail deudorSeleccionado={deudorSeleccionado} />
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">💡 Información importante</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Esta es una funcionalidad de prueba para verificar el envío de emails</li>
            <li>• Los emails se envían desde tu dominio personalizado configurado en Resend</li>
            <li>• Asegúrate de que el deudor tenga un email válido</li>
            <li>• Los emails pueden llegar a la carpeta de spam</li>
            <li>• El dominio se configura mediante la variable de entorno <code>RESEND_FROM_EMAIL</code></li>
          </ul>
        </div>
      </div>
    </Protected>
  );
}
