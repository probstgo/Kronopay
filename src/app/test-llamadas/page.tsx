'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Agent {
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
}

export default function TestLlamadasPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [agentPhoneNumbers, setAgentPhoneNumbers] = useState<AgentPhoneNumber[]>([]);
  const [selectedAgentPhoneNumberId, setSelectedAgentPhoneNumberId] = useState<string>('');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/elevenlabs/agents');
      const data = await response.json();
      // Normalizar diferentes posibles formas de respuesta del SDK/API
      const list: Agent[] = (data?.agents
        ?? data?.items
        ?? data?.data
        ?? (Array.isArray(data) ? data : [])) as Agent[];
      setAgents(list);
    } catch (error) {
      console.error('Error cargando agentes:', error);
    }
  };

  const loadAgentPhoneNumbers = async (agentId: string) => {
    try {
      const res = await fetch(`/api/elevenlabs/agents/${agentId}`);
      const json = await res.json();
      const source = (json?.phone_numbers ?? json?.phoneNumbers ?? []) as AgentPhoneNumber[];
      const numbers: AgentPhoneNumber[] = source
        .filter((n: AgentPhoneNumber) => (n as any)?.supports_outbound || (n as any)?.supportsOutbound);
      setAgentPhoneNumbers(numbers);
      setSelectedAgentPhoneNumberId((numbers?.[0] as any)?.phone_number_id ?? (numbers?.[0] as any)?.phoneNumberId ?? '');
    } catch (e) {
      console.error('Error cargando teléfonos del agente:', e);
      setAgentPhoneNumbers([]);
      setSelectedAgentPhoneNumberId('');
    }
  }

  const handleTestCall = async () => {
    if (!selectedAgent || !phoneNumber) {
      alert('Por favor selecciona un agente y ingresa un número de teléfono');
      return;
    }
    if (!selectedAgentPhoneNumberId) {
      alert('Este agente no tiene números salientes o no seleccionaste uno.');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/elevenlabs/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgent, toNumber: phoneNumber, agentPhoneNumberId: selectedAgentPhoneNumberId })
      })
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data?.error || 'Fallo iniciando llamada')
      }
      alert('Llamada iniciada. Revisa tu teléfono.');
    } catch (error) {
      console.error('Error en prueba de llamada:', error);
      alert('Error en la prueba de llamada');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Prueba de Llamadas</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Prueba</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="agent-select">Seleccionar Agente</Label>
              <select
                id="agent-select"
                value={selectedAgent}
                onChange={async (e) => {
                  const id = e.target.value
                  setSelectedAgent(id)
                  setAgentPhoneNumbers([])
                  setSelectedAgentPhoneNumberId('')
                  if (id) await loadAgentPhoneNumbers(id)
                }}
                className="w-full p-2 border rounded"
              >
                <option key="default" value="">Selecciona un agente</option>
                {agents.map((agent, idx) => {
                  const id = agent?.agentId ?? agent?.agent_id ?? agent?.id ?? `unknown-${idx}`;
                  const key = `agent-${id}-${idx}`;
                  const value = id;
                  const label = agent?.name ?? `Agente ${idx + 1}`;
                  return (
                    <option key={key} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedAgent && (
              <div>
                <Label htmlFor="agent-phone-select">Número saliente del agente</Label>
                <select
                  id="agent-phone-select"
                  value={selectedAgentPhoneNumberId}
                  onChange={(e) => setSelectedAgentPhoneNumberId(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {agentPhoneNumbers.length === 0 ? (
                    <option value="">No hay números outbound asignados</option>
                  ) : (
                    agentPhoneNumbers.map((pn, idx) => {
                      const id = (pn as any).phone_number_id ?? (pn as any).phoneNumberId;
                      const key = `pn-${id ?? idx}`
                      const label = pn.label || pn.phone_number || id || `Número ${idx+1}`
                      const provider = pn.provider ? ` (${pn.provider})` : ''
                      return (
                        <option key={key} value={id}>
                          {label}{provider}
                        </option>
                      )
                    })
                  )}
                </select>
              </div>
            )}

            <div>
              <Label htmlFor="phone">Número de Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleTestCall}
              disabled={loading || !selectedAgent || !selectedAgentPhoneNumberId || agentPhoneNumbers.length === 0 || !phoneNumber}
              className="w-full"
            >
              {loading ? 'Procesando...' : 'Iniciar Prueba de Llamada'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agentes Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <p>No hay agentes disponibles</p>
            ) : (
              <div className="space-y-2">
                {agents.map((agent, idx) => {
                  const id = agent?.agentId ?? agent?.agent_id ?? agent?.id ?? `unknown-${idx}`;
                  const key = `agent-card-${id}-${idx}`;
                  return (
                    <div key={key} className="p-2 border rounded">
                      <strong>{agent?.name ?? `Agente ${idx + 1}`}</strong>
                      <p className="text-sm text-gray-600">ID: {id}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
