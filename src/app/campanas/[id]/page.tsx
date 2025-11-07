import { JourneyBuilder } from '../components/JourneyBuilder'

export default function EditarCampanaPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="h-screen bg-gray-50">
      <JourneyBuilder params={params} />
    </div>
  )
}

