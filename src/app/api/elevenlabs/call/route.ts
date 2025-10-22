import { NextResponse } from 'next/server'
import { startOutboundCall } from '@/lib/elevenlabs'

export async function POST(req: Request) {
  try {
    const { agentId, toNumber, agentPhoneNumberId } = await req.json()

    if (!agentId || !toNumber) {
      return NextResponse.json({ error: 'agentId y toNumber son requeridos' }, { status: 400 })
    }

    const res = await startOutboundCall({ agentId, toNumber, agentPhoneNumberId })

    return NextResponse.json({ ok: true, result: res }, { status: 200 })
  } catch (error: any) {
    console.error('Error iniciando llamada:', error)
    return NextResponse.json({ error: error?.message ?? 'Error iniciando llamada' }, { status: 500 })
  }
}
