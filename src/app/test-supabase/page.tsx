'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type SimpleTable = { table_name: string }

export default function TestSupabase() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Probando conexión...')
  const [tables, setTables] = useState<SimpleTable[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Probar conexión básica con auth (más seguro)
        const { error } = await supabase.auth.getSession()
        
        if (error) {
          setError(`Error de conexión: ${error.message}`)
          setConnectionStatus('❌ Error de conexión')
        } else {
          setConnectionStatus('✅ Conexión exitosa')
          setTables([{ table_name: 'Supabase Auth' }])
        }
      } catch (err) {
        setError(`Error inesperado: ${err}`)
        setConnectionStatus('❌ Error inesperado')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 Prueba de Conexión Supabase
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Estado de Conexión</h2>
          <p className="text-lg">{connectionStatus}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {tables.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">
              ✅ Tablas encontradas ({tables.length})
            </h3>
            <div className="space-y-2">
              {tables.map((table, index) => (
                <div key={index} className="bg-white p-3 rounded border">
                  <code className="text-sm font-mono">{table.table_name}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            📋 Información de la conexión
          </h3>
          <ul className="text-blue-700 space-y-1">
            <li>• URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurada' : '❌ No configurada'}</li>
            <li>• API Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No configurada'}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
