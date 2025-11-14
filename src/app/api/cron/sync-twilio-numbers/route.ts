import { NextResponse } from 'next/server'
import { sincronizarNumerosTwilio } from '@/lib/syncTwilioNumbers'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await sincronizarNumerosTwilio()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sincronizando números Twilio:', error)
    return NextResponse.json(
      { error: 'Error sincronizando números', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}

