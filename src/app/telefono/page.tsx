'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  StarOff,
  Phone,
  Settings,
  Filter,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';

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

export default function TelefonoPage() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [elevenLabsAgentes, setElevenLabsAgentes] = useState<ElevenLabsAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const handleTogglePredeterminado = async (agenteId: string, esPredeterminado: boolean) => {
    try {
      const response = await fetch(`/api/telefono/agentes/${agenteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ es_predeterminado: !esPredeterminado })
      });

      if (response.ok) {
        await loadAgentes(); // Recargar lista
      } else {
        setError('Error actualizando agente');
      }
    } catch (error) {
      console.error('Error actualizando agente:', error);
      setError('Error actualizando agente');
    }
  };

  const handleToggleActivo = async (agenteId: string, activo: boolean) => {
    try {
      const response = await fetch(`/api/telefono/agentes/${agenteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !activo })
      });

      if (response.ok) {
        await loadAgentes(); // Recargar lista
      } else {
        setError('Error actualizando agente');
      }
    } catch (error) {
      console.error('Error actualizando agente:', error);
      setError('Error actualizando agente');
    }
  };

  const handleDelete = async (agenteId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este agente?')) {
      return;
    }

    try {
      const response = await fetch(`/api/telefono/agentes/${agenteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadAgentes(); // Recargar lista
      } else {
        setError('Error eliminando agente');
      }
    } catch (error) {
      console.error('Error eliminando agente:', error);
      setError('Error eliminando agente');
    }
  };

  const getElevenLabsAgentName = (agentId: string) => {
    const agent = elevenLabsAgentes.find(a => 
      (a.agentId ?? a.agent_id ?? a.id) === agentId
    );
    return agent?.name || 'Agente desconocido';
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
          <h1 className="text-3xl font-bold">Gestión de Agentes</h1>
          <p className="text-gray-600 mt-1">
            Administra tus agentes de voz y configura sus parámetros
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/test-llamadas">
            <Button variant="outline">
              <Phone className="w-4 h-4 mr-2" />
              Probar Agentes
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, ID o agente de ElevenLabs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              Mostrar filtros avanzados
            </Button>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Estado:</span>
              <Button variant="outline" size="sm">
                Todos los estados
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Agentes */}
      <Card>
        <CardContent className="p-0">
          {filteredAgentes.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay agentes</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No se encontraron agentes con ese criterio de búsqueda.' : 'Aún no has creado ningún agente.'}
              </p>
              {!searchTerm && (
                <Link href="/telefono/agentes/nuevo">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primer Agente
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-4 font-medium">Nombre</th>
                    <th className="p-4 font-medium">ID ElevenLabs</th>
                    <th className="p-4 font-medium">Proveedor</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Prioridad</th>
                    <th className="p-4 font-medium">Creado</th>
                    <th className="p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgentes.map((agente) => (
                    <tr key={agente.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">
                            {agente.nombre || getElevenLabsAgentName(agente.agent_id)}
                          </div>
                          {agente.es_predeterminado && (
                            <Badge variant="default" className="bg-yellow-500 text-xs mt-1">
                              <Star className="w-3 h-3 mr-1" />
                              Predeterminado
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {agente.agent_id}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {agente.provider}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={agente.activo ? "default" : "secondary"}>
                          {agente.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {agente.prioridad}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(agente.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePredeterminado(agente.id, agente.es_predeterminado)}
                            title={agente.es_predeterminado ? "Quitar como predeterminado" : "Marcar como predeterminado"}
                          >
                            {agente.es_predeterminado ? (
                              <StarOff className="w-4 h-4" />
                            ) : (
                              <Star className="w-4 h-4" />
                            )}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActivo(agente.id, agente.activo)}
                            title={agente.activo ? "Desactivar" : "Activar"}
                          >
                            {agente.activo ? 'Desactivar' : 'Activar'}
                          </Button>
                          
                          <Link href={`/telefono/agentes/${agente.id}/editar`}>
                            <Button variant="outline" size="sm" title="Editar">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(agente.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </div>
  );
}