'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ElevenLabsAgent {
  agentId?: string;
  agent_id?: string;
  id?: string;
  name?: string;
}

interface ElevenLabsPhoneNumber {
  phone_number_id?: string;
  phone_number?: string;
  label?: string;
  supports_outbound?: boolean;
  provider?: string;
  phoneNumberId?: string;
  supportsOutbound?: boolean;
}

interface AgenteFormData {
  agent_id: string;
  nombre: string;
  provider: 'twilio' | 'sip_trunk';
  agent_phone_number_id: string;
  es_predeterminado: boolean;
  prioridad: number;
  model_id: string;
  voice_id: string;
  speaking_rate: number;
  pitch: number;
  style: string;
  language: string;
  prompt_base: string;
  activo: boolean;
}

export default function AgenteForm({ agenteId }: { agenteId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [elevenLabsAgentes, setElevenLabsAgentes] = useState<ElevenLabsAgent[]>([]);
  const [agentPhoneNumbers, setAgentPhoneNumbers] = useState<ElevenLabsPhoneNumber[]>([]);
  
  const [formData, setFormData] = useState<AgenteFormData>({
    agent_id: '',
    nombre: '',
    provider: 'twilio',
    agent_phone_number_id: '',
    es_predeterminado: false,
    prioridad: 100,
    model_id: '',
    voice_id: '',
    speaking_rate: 1.0,
    pitch: 0,
    style: '',
    language: 'es',
    prompt_base: '',
    activo: true
  });

  const isEditing = !!agenteId;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isEditing && agenteId) {
      loadAgenteData();
    }
  }, [isEditing, agenteId]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      
      // Cargar agentes de ElevenLabs
      const response = await fetch('/api/elevenlabs/agents');
      if (response.ok) {
        const data = await response.json();
        const list: ElevenLabsAgent[] = (data?.agents ?? data?.items ?? data?.data ?? (Array.isArray(data) ? data : [])) as ElevenLabsAgent[];
        setElevenLabsAgentes(list);
      }
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      setError('Error cargando datos iniciales');
    } finally {
      setLoadingData(false);
    }
  };

  const loadAgenteData = async () => {
    try {
      const response = await fetch(`/api/telefono/agentes/${agenteId}`);
      if (response.ok) {
        const agente = await response.json();
        setFormData({
          agent_id: agente.agent_id,
          nombre: agente.nombre || '',
          provider: agente.provider,
          agent_phone_number_id: agente.agent_phone_number_id || '',
          es_predeterminado: agente.es_predeterminado,
          prioridad: agente.prioridad,
          model_id: agente.model_id || '',
          voice_id: agente.voice_id || '',
          speaking_rate: agente.speaking_rate || 1.0,
          pitch: agente.pitch || 0,
          style: agente.style || '',
          language: agente.language || 'es',
          prompt_base: agente.prompt_base || '',
          activo: agente.activo
        });
        
        // Cargar números del agente seleccionado
        if (agente.agent_id) {
          await loadAgentPhoneNumbers(agente.agent_id);
        }
      } else {
        setError('Error cargando datos del agente');
      }
    } catch (error) {
      console.error('Error cargando agente:', error);
      setError('Error cargando datos del agente');
    }
  };

  const loadAgentPhoneNumbers = async (agentId: string) => {
    try {
      const res = await fetch(`/api/elevenlabs/agents/${agentId}`);
      const json = await res.json();
      const source = (json?.phone_numbers ?? json?.phoneNumbers ?? []) as ElevenLabsPhoneNumber[];
      const numbers: ElevenLabsPhoneNumber[] = source.filter((n) => n.supports_outbound || n.supportsOutbound);
      setAgentPhoneNumbers(numbers);
      
      // Si no hay número seleccionado, seleccionar el primero
      if (!formData.agent_phone_number_id && numbers.length > 0) {
        setFormData(prev => ({
          ...prev,
          agent_phone_number_id: numbers[0].phone_number_id ?? numbers[0].phoneNumberId ?? ''
        }));
      }
    } catch (e) {
      console.error('Error cargando teléfonos del agente:', e);
      setAgentPhoneNumbers([]);
    }
  };

  const handleAgentChange = async (agentId: string) => {
    setFormData(prev => ({
      ...prev,
      agent_id: agentId,
      agent_phone_number_id: ''
    }));
    
    if (agentId) {
      await loadAgentPhoneNumbers(agentId);
    } else {
      setAgentPhoneNumbers([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agent_id) {
      setError('Debes seleccionar un agente de ElevenLabs');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = isEditing ? `/api/telefono/agentes/${agenteId}` : '/api/telefono/agentes';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        router.push('/telefono/agentes');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error guardando agente');
      }
    } catch (error) {
      console.error('Error guardando agente:', error);
      setError('Error guardando agente');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/telefono/agentes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Editar Agente' : 'Nuevo Agente'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Modifica la configuración del agente' : 'Configura un nuevo agente de voz'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Configuración Básica */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="agent_id">Agente de ElevenLabs *</Label>
              <Select
                value={formData.agent_id}
                onValueChange={handleAgentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un agente" />
                </SelectTrigger>
                <SelectContent>
                  {elevenLabsAgentes.map((agent, idx) => {
                    const id = agent?.agentId ?? agent?.agent_id ?? agent?.id ?? `unknown-${idx}`;
                    const name = agent?.name ?? `Agente ${idx + 1}`;
                    return (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nombre">Nombre Personalizado</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre para identificar este agente"
              />
            </div>

            <div>
              <Label htmlFor="provider">Proveedor</Label>
              <Select
                value={formData.provider}
                onValueChange={(value: 'twilio' | 'sip_trunk') => 
                  setFormData(prev => ({ ...prev, provider: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="sip_trunk">SIP Trunk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.agent_id && (
              <div>
                <Label htmlFor="agent_phone_number_id">Número Saliente</Label>
                <Select
                  value={formData.agent_phone_number_id}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, agent_phone_number_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un número" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentPhoneNumbers.length === 0 ? (
                      <SelectItem value="" disabled>
                        No hay números outbound disponibles
                      </SelectItem>
                    ) : (
                      agentPhoneNumbers.map((pn, idx) => {
                        const id = pn.phone_number_id ?? pn.phoneNumberId;
                        const label = pn.label || pn.phone_number || id || `Número ${idx+1}`;
                        const provider = pn.provider ? ` (${pn.provider})` : '';
                        return (
                          <SelectItem key={id} value={id || ''}>
                            {label}{provider}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuración Avanzada */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración Avanzada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prioridad">Prioridad</Label>
                <Input
                  id="prioridad"
                  type="number"
                  value={formData.prioridad}
                  onChange={(e) => setFormData(prev => ({ ...prev, prioridad: parseInt(e.target.value) || 100 }))}
                  placeholder="100"
                />
                <p className="text-xs text-gray-500 mt-1">Menor número = mayor prioridad</p>
              </div>

              <div>
                <Label htmlFor="language">Idioma</Label>
                <Input
                  id="language"
                  value={formData.language}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                  placeholder="es"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="speaking_rate">Velocidad de Habla</Label>
                <Input
                  id="speaking_rate"
                  type="number"
                  step="0.1"
                  value={formData.speaking_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, speaking_rate: parseFloat(e.target.value) || 1.0 }))}
                  placeholder="1.0"
                />
              </div>

              <div>
                <Label htmlFor="pitch">Tono</Label>
                <Input
                  id="pitch"
                  type="number"
                  step="0.1"
                  value={formData.pitch}
                  onChange={(e) => setFormData(prev => ({ ...prev, pitch: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="voice_id">ID de Voz</Label>
              <Input
                id="voice_id"
                value={formData.voice_id}
                onChange={(e) => setFormData(prev => ({ ...prev, voice_id: e.target.value }))}
                placeholder="ID de voz específica"
              />
            </div>

            <div>
              <Label htmlFor="style">Estilo</Label>
              <Input
                id="style"
                value={formData.style}
                onChange={(e) => setFormData(prev => ({ ...prev, style: e.target.value }))}
                placeholder="Estilo de conversación"
              />
            </div>

            <div>
              <Label htmlFor="prompt_base">Prompt Base</Label>
              <Textarea
                id="prompt_base"
                value={formData.prompt_base}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt_base: e.target.value }))}
                placeholder="Prompt base para el agente"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Opciones */}
        <Card>
          <CardHeader>
            <CardTitle>Opciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="es_predeterminado"
                checked={formData.es_predeterminado}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, es_predeterminado: !!checked }))
                }
              />
              <Label htmlFor="es_predeterminado">Marcar como agente predeterminado</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="activo"
                checked={formData.activo}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, activo: !!checked }))
                }
              />
              <Label htmlFor="activo">Agente activo</Label>
            </div>
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <Link href="/telefono/agentes">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? 'Actualizar' : 'Crear'} Agente
          </Button>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
