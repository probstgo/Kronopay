import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    
    // Obtener estadísticas de llamadas de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const { data: llamadasHoy, error: errorHoy } = await supabase
      .from('agente_conversaciones')
      .select('id, duracion_segundos, costo_usd')
      .gte('created_at', hoy.toISOString());

    if (errorHoy) {
      console.error('Error obteniendo llamadas de hoy:', errorHoy);
      return NextResponse.json({ error: 'Error obteniendo estadísticas' }, { status: 500 });
    }

    // Obtener estadísticas de esta semana
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    
    const { data: llamadasSemana, error: errorSemana } = await supabase
      .from('agente_conversaciones')
      .select('id, duracion_segundos, costo_usd')
      .gte('created_at', inicioSemana.toISOString());

    if (errorSemana) {
      console.error('Error obteniendo llamadas de la semana:', errorSemana);
      return NextResponse.json({ error: 'Error obteniendo estadísticas' }, { status: 500 });
    }

    // Calcular métricas
    const duracionPromedio = llamadasHoy?.length > 0 
      ? Math.round((llamadasHoy.reduce((acc, l) => acc + (l.duracion_segundos || 0), 0) / llamadasHoy.length) / 60)
      : 0;

    const tasaExito = llamadasHoy?.length > 0 
      ? Math.round((llamadasHoy.filter(l => l.duracion_segundos && l.duracion_segundos > 30).length / llamadasHoy.length) * 100)
      : 0;

    const stats = {
      hoy: llamadasHoy?.length || 0,
      esta_semana: llamadasSemana?.length || 0,
      duracion_promedio: duracionPromedio,
      tasa_exito: tasaExito
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error en API de estadísticas de llamadas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
