import { NextResponse } from 'next/server';
import { getAgent } from '@/lib/elevenlabs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await ctx.params;
    const agent = await getAgent(agentId);
    return NextResponse.json(agent);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error obteniendo agente' },
      { status: 500 }
    );
  }
}
