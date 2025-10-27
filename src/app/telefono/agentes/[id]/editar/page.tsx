import AgenteForm from '../../../components/AgenteForm';

interface EditarAgentePageProps {
  params: {
    id: string;
  };
}

export default function EditarAgentePage({ params }: EditarAgentePageProps) {
  return <AgenteForm agenteId={params.id} />;
}
