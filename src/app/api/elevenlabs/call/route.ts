import { NextResponse } from 'next/server'
import { startOutboundCall } from '@/lib/elevenlabs'

export async function POST(req: Request) {
  try {
    const { agentId, toNumber, agentPhoneNumberId, dynamicVariables } = await req.json()

    if (!agentId || !toNumber) {
      return NextResponse.json({ error: 'agentId y toNumber son requeridos' }, { status: 400 })
    }

    const res = await startOutboundCall({ 
      agentId, 
      toNumber, 
      agentPhoneNumberId,
      dynamicVariables 
    })

    return NextResponse.json({ ok: true, result: res }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error iniciando llamada:', error)
    return NextResponse.json({ error: message ?? 'Error iniciando llamada' }, { status: 500 })
  }
}
