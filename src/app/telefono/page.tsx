'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Users, Activity, Settings, Plus, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface AgenteStats {
  total: number;
  activos: number;
  predeterminados: number;
}

export default function TelefonoPage() {
  const [agentesStats, setAgentesStats] = useState<AgenteStats>({ total: 0, activos: 0, predeterminados: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Cargar estadísticas de agentes
      const agentesResponse = await fetch('/api/telefono/agentes/stats');
      if (agentesResponse.ok) {
        const agentesData = await agentesResponse.json();
        setAgentesStats(agentesData);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Teléfono</h1>
          <p className="text-gray-600 mt-1">
            Administra agentes, números y monitorea el rendimiento de llamadas
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/telefono/agentes/nuevo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Agente
            </Button>
          </Link>
          <Link href="/test-llamadas">
            <Button variant="outline">
              <Phone className="w-4 h-4 mr-2" />
              Probar Llamada
            </Button>
          </Link>
        </div>
      </div>

      {/* Estadísticas de Agentes */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentesStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {agentesStats.activos} activos, {agentesStats.predeterminados} predeterminados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Gestión de Agentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Administra tus agentes de voz y configura sus parámetros
            </p>
            <div className="flex gap-2">
              <Link href="/telefono/agentes" className="flex-1">
                <Button variant="outline" className="w-full">
                  Ver Agentes
                </Button>
              </Link>
              <Link href="/telefono/agentes/nuevo">
                <Button size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Configuración del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Configura APIs, números automáticos y pruebas del sistema
            </p>
            <div className="flex gap-2">
              <Link href="/test-llamadas" className="flex-1">
                <Button variant="outline" className="w-full">
                  Probar Llamadas
                </Button>
              </Link>
              <Button size="sm" variant="outline">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado del Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">ElevenLabs API</span>
              <Badge variant="secondary">Conectado</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Webhook</span>
              <Badge variant="secondary">Activo</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Base de Datos</span>
              <Badge variant="secondary">Operativo</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Pool Automático</span>
              <Badge variant="secondary">Funcionando</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
