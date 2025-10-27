import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    
    // Obtener estadísticas de agentes
    const { data: agentes, error } = await supabase
      .from('llamada_agente')
      .select('id, activo, es_predeterminado');

    if (error) {
      console.error('Error obteniendo estadísticas de agentes:', error);
      return NextResponse.json({ error: 'Error obteniendo estadísticas' }, { status: 500 });
    }

    const stats = {
      total: agentes?.length || 0,
      activos: agentes?.filter(a => a.activo).length || 0,
      predeterminados: agentes?.filter(a => a.es_predeterminado).length || 0
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error en API de estadísticas de agentes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
