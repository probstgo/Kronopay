import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    
    // Obtener estadísticas de números
    const { data: numeros, error } = await supabase
      .from('phone_numbers')
      .select('id, estado');

    if (error) {
      console.error('Error obteniendo estadísticas de números:', error);
      return NextResponse.json({ error: 'Error obteniendo estadísticas' }, { status: 500 });
    }

    const stats = {
      total: numeros?.length || 0,
      disponibles: numeros?.filter(n => n.estado === 'disponible').length || 0,
      ocupados: numeros?.filter(n => n.estado === 'asignado').length || 0,
      suspendidos: numeros?.filter(n => n.estado === 'suspendido').length || 0
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error en API de estadísticas de números:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
