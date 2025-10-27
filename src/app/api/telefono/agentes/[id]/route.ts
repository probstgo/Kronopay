import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const { data: agente, error } = await supabase
      .from('llamada_agente')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error obteniendo agente:', error);
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(agente);
  } catch (error) {
    console.error('Error en API de agente individual:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Si se está marcando como predeterminado, desmarcar otros
    if (body.es_predeterminado) {
      await supabase
        .from('llamada_agente')
        .update({ es_predeterminado: false })
        .eq('usuario_id', user.id)
        .neq('id', id);
    }

    const { data, error } = await supabase
      .from('llamada_agente')
      .update(body)
      .eq('id', id)
      .eq('usuario_id', user.id) // Solo puede editar sus propios agentes
      .select()
      .single();

    if (error) {
      console.error('Error actualizando agente:', error);
      return NextResponse.json({ error: 'Error actualizando agente' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en API de actualización de agente:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { error } = await supabase
      .from('llamada_agente')
      .delete()
      .eq('id', id)
      .eq('usuario_id', user.id); // Solo puede eliminar sus propios agentes

    if (error) {
      console.error('Error eliminando agente:', error);
      return NextResponse.json({ error: 'Error eliminando agente' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en API de eliminación de agente:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
