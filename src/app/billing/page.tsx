import Protected from "@/components/Protected"
import PlanActual from "./components/PlanActual"
import UsoActual from "./components/UsoActual"
import Facturacion from "./components/Facturacion"

export default function BillingPage() {
  return (
    <Protected>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Suscripciones</h1>
        
        {/* Primera fila: Plan y Uso */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <PlanActual />
          <UsoActual />
        </div>
        
        {/* Segunda fila: Facturación */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <Facturacion />
        </div>
      </div>
    </Protected>
  );
}
