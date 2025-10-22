import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY!
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

if (!apiKey) {
  throw new Error('RESEND_API_KEY no está configurada en las variables de entorno')
}

export const resend = new Resend(apiKey)
export { fromEmail }
