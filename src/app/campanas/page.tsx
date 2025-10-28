import Protected from "@/components/Protected"
import JourneyBuilder from "./components/JourneyBuilder"

export default function CampanasPage() {
  return (
    <Protected>
      <JourneyBuilder />
    </Protected>
  );
}
