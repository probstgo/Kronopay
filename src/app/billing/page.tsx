import Protected from "@/components/Protected"

export default function BillingPage() {
  return (
    <Protected>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Billing</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">Contenido por agregar...</p>
        </div>
      </div>
    </Protected>
  );
}
