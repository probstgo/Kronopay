import { NextResponse } from 'next/server';
import { listAgents } from '@/lib/elevenlabs';

export async function GET() {
  try {
    const agents = await listAgents();
    return NextResponse.json(agents);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error obteniendo agentes' },
      { status: 500 }
    );
  }
}
