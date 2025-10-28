export function TopToolbar() {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
            <span>←</span>
            <span>Campaña de Cobranza</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
            🔍
          </button>
          <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
            📊
          </button>
          <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
            ⚙️
          </button>
          <button className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
            💡
          </button>
          <button className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded">
            ▶️ Ejecutar
          </button>
        </div>
      </div>
    </div>
  )
}
