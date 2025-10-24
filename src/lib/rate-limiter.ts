import { RateLimiterMemory } from 'rate-limiter-flexible'

const limiters = {
  webhook: new RateLimiterMemory({
    points: 100, // 100 requests
    duration: 3600, // por hora
  }),
  api: new RateLimiterMemory({
    points: 60, // 60 requests
    duration: 60, // por minuto
  })
}

export async function verificarRateLimit(
  ip: string, 
  tipo: 'webhook' | 'api' = 'api'
): Promise<boolean> {
  try {
    await limiters[tipo].consume(ip)
    return true
  } catch {
    return false
  }
}

export function obtenerIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
