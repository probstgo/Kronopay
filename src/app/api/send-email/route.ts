import { NextRequest, NextResponse } from 'next/server'
import { resend, fromEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message, from } = await request.json()
    
    // Validaciones básicas
    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: to, subject, message' }, 
        { status: 400 }
      )
    }

    // Enviar email usando Resend
    const { data, error } = await resend.emails.send({
      from: from || fromEmail, // Usa el dominio personalizado configurado
      to: [to],
      subject: subject,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
               <h2 style="color: #333;">Nuevo mensaje</h2>
               <p style="line-height: 1.6; color: #666;">${message}</p>
               <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
               <p style="font-size: 12px; color: #999;">Enviado desde tu aplicación Next.js</p>
             </div>`
    })

    if (error) {
      console.error('Error de Resend:', error)
      return NextResponse.json(
        { error: 'Error enviando email', details: error }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email enviado correctamente',
      data: data 
    })

  } catch (error) {
    console.error('Error en API route:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    )
  }
}

// Método GET para probar que la API funciona
export async function GET() {
  return NextResponse.json({ 
    message: 'API de envío de emails funcionando',
    endpoints: {
      POST: 'Enviar email',
      GET: 'Verificar estado'
    }
  })
}
