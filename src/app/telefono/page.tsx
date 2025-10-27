'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Search, 
  Phone,
  Play,
  X
} from 'lucide-react';

interface Agente {
  id: string;
  usuario_id: string | null;
  agent_id: string;
  nombre: string | null;
  provider: 'twilio' | 'sip_trunk';
  agent_phone_number_id: string | null;
  es_predeterminado: boolean;
  prioridad: number;
  model_id: string | null;
  voice_id: string | null;
  speaking_rate: number | null;
  pitch: number | null;
  style: string | null;
  language: string | null;
  prompt_base: string | null;
  activo: boolean;
  created_at: string;
}

interface ElevenLabsAgent {
  agentId?: string;
  agent_id?: string;
  id?: string;
  name?: string;
}

interface AgentPhoneNumber {
  phone_number_id?: string;
  phone_number?: string;
  label?: string;
  supports_outbound?: boolean;
  provider?: string;
  phoneNumberId?: string;
  supportsOutbound?: boolean;
}

export default function TelefonoPage() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [elevenLabsAgentes, setElevenLabsAgentes] = useState<ElevenLabsAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el modal de prueba
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agente | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [agentPhoneNumbers, setAgentPhoneNumbers] = useState<AgentPhoneNumber[]>([]);
  const [selectedAgentPhoneNumberId, setSelectedAgentPhoneNumberId] = useState<string>('');
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    loadAgentes();
    loadElevenLabsAgentes();
  }, []);

  const loadAgentes = async () => {
    try {
      setLoading(true);
      
      // TEMPORAL: Llamada simple sin autenticación para debug
      const response = await fetch('/api/telefono/agentes');
      
      if (response.ok) {
        const data = await response.json();
        console.log('Datos recibidos:', data);
        setAgentes(data);
      } else {
        const errorData = await response.json();
        console.error('Error de API:', errorData);
        setError('Error cargando agentes');
      }
    } catch (error) {
      console.error('Error cargando agentes:', error);
      setError('Error cargando agentes');
    } finally {
      setLoading(false);
    }
  };

  const loadElevenLabsAgentes = async () => {
    try {
      const response = await fetch('/api/elevenlabs/agents');
      if (response.ok) {
        const data = await response.json();
        const list: ElevenLabsAgent[] = (data?.agents ?? data?.items ?? data?.data ?? (Array.isArray(data) ? data : [])) as ElevenLabsAgent[];
        setElevenLabsAgentes(list);
      }
    } catch (error) {
      console.error('Error cargando agentes de ElevenLabs:', error);
    }
  };

  const getAgenteDescription = (agente: Agente) => {
    if (agente.nombre?.toLowerCase().includes('cobrador')) {
      return 'Agente especializado en cobranza profesional con personalidad empática y persistente.';
    }
    if (agente.nombre?.toLowerCase().includes('ventas')) {
      return 'Agente enfocado en ventas y prospección de clientes potenciales.';
    }
    return 'Agente de voz configurado para comunicación automatizada.';
  };


  const getElevenLabsAgentName = (agentId: string) => {
    const agent = elevenLabsAgentes.find(a => 
      (a.agentId ?? a.agent_id ?? a.id) === agentId
    );
    return agent?.name || 'Agente desconocido';
  };

  const handleTestAgent = async (agente: Agente) => {
    setSelectedAgent(agente);
    setShowTestModal(true);
    setPhoneNumber('');
    setAgentPhoneNumbers([]);
    setSelectedAgentPhoneNumberId('');
    
    // Cargar números de teléfono del agente automáticamente
    try {
      const response = await fetch(`/api/elevenlabs/agents/${agente.agent_id}`);
      if (response.ok) {
        const data = await response.json();
        const numbers: AgentPhoneNumber[] = (data?.phone_numbers ?? data?.phoneNumbers ?? [])
          .filter((n: AgentPhoneNumber) => n.supports_outbound || n.supportsOutbound);
        setAgentPhoneNumbers(numbers);
        // Seleccionar automáticamente el primer número disponible
        const firstNumberId = numbers?.[0]?.phone_number_id ?? numbers?.[0]?.phoneNumberId ?? '';
        setSelectedAgentPhoneNumberId(firstNumberId);
      }
    } catch (error) {
      console.error('Error cargando números del agente:', error);
    }
  };

  const handleTestCall = async () => {
    if (!selectedAgent || !phoneNumber) {
      alert('Por favor ingresa un número de teléfono');
      return;
    }

    if (!selectedAgentPhoneNumberId) {
      alert('El agente no tiene números salientes configurados');
      return;
    }

    setTestLoading(true);
    try {
      const response = await fetch('/api/elevenlabs/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentId: selectedAgent.agent_id, 
          toNumber: phoneNumber, 
          agentPhoneNumberId: selectedAgentPhoneNumberId 
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Error iniciando llamada');
      }
      
      alert('Llamada iniciada exitosamente. Revisa tu teléfono.');
      setShowTestModal(false);
    } catch (error) {
      console.error('Error en prueba de llamada:', error);
      alert('Error en la prueba de llamada');
    } finally {
      setTestLoading(false);
    }
  };

  const closeTestModal = () => {
    setShowTestModal(false);
    setSelectedAgent(null);
    setPhoneNumber('');
    setAgentPhoneNumbers([]);
    setSelectedAgentPhoneNumberId('');
  };

  const filteredAgentes = agentes.filter(agente =>
    agente.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agente.agent_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getElevenLabsAgentName(agente.agent_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agentes de Voz</h1>
          <p className="text-gray-600 mt-1">
            Visualiza y prueba tus agentes de voz configurados
          </p>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Buscar Agentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nombre o ID de agente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Agentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Agentes Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAgentes.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay agentes</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No se encontraron agentes con ese criterio de búsqueda.' : 'No hay agentes configurados en el sistema.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-6">
              {filteredAgentes.map((agente) => (
                <div key={agente.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {agente.nombre || getElevenLabsAgentName(agente.agent_id)}
                        </h3>
                        {agente.es_predeterminado && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Predeterminado
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">
                        {getAgenteDescription(agente)}
                      </p>
                      
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTestAgent(agente)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Probar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Prueba */}
      {showTestModal && selectedAgent && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Probar Agente: {selectedAgent.nombre || getElevenLabsAgentName(selectedAgent.agent_id)}</CardTitle>
              <Button variant="ghost" size="sm" onClick={closeTestModal}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone">Número de Teléfono de Destino</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Ingresa el número que recibirá la llamada de prueba
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleTestCall}
                  disabled={testLoading || !phoneNumber}
                  className="flex-1"
                >
                  {testLoading ? 'Procesando...' : 'Iniciar Llamada'}
                </Button>
                <Button variant="outline" onClick={closeTestModal}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}