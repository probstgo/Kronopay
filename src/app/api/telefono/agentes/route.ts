import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    
    // Obtener agentes del usuario actual y globales
    const { data: agentes, error } = await supabase
      .from('llamada_agente')
      .select('*')
      .order('es_predeterminado', { ascending: false })
      .order('prioridad', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo agentes:', error);
      return NextResponse.json({ error: 'Error obteniendo agentes' }, { status: 500 });
    }

    return NextResponse.json(agentes || []);
  } catch (error) {
    console.error('Error en API de agentes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Validar datos requeridos
    if (!body.agent_id || !body.provider) {
      return NextResponse.json({ error: 'agent_id y provider son requeridos' }, { status: 400 });
    }

    // Si es predeterminado, desmarcar otros predeterminados del usuario
    if (body.es_predeterminado) {
      await supabase
        .from('llamada_agente')
        .update({ es_predeterminado: false })
        .eq('usuario_id', user.id);
    }

    const nuevoAgente = {
      usuario_id: user.id,
      agent_id: body.agent_id,
      nombre: body.nombre || null,
      provider: body.provider,
      agent_phone_number_id: body.agent_phone_number_id || null,
      es_predeterminado: body.es_predeterminado || false,
      prioridad: body.prioridad || 100,
      model_id: body.model_id || null,
      voice_id: body.voice_id || null,
      speaking_rate: body.speaking_rate || null,
      pitch: body.pitch || null,
      style: body.style || null,
      language: body.language || null,
      prompt_base: body.prompt_base || null,
      activo: body.activo !== false
    };

    const { data, error } = await supabase
      .from('llamada_agente')
      .insert([nuevoAgente])
      .select()
      .single();

    if (error) {
      console.error('Error creando agente:', error);
      return NextResponse.json({ error: 'Error creando agente' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error en API de creación de agente:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
