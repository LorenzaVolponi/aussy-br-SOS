import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CONNECTIVITY_TARGET = 'https://www.google.com/generate_204'

export async function GET() {
  const startTime = Date.now()
  let reachable = false
  let latency: number | null = null
  let contentType: string | null = null
  let error: string | null = null

  try {
    const res = await fetch(CONNECTIVITY_TARGET, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
      redirect: 'follow',
    })
    reachable = res.ok || res.status === 204 || res.status === 200
    latency = Date.now() - startTime
    contentType = res.headers.get('content-type')
  } catch (err) {
    error = err instanceof Error ? err.message : 'Falha de rede'
  }

  let externalIp: string | null = null
  let isp: string | null = null
  let country: string | null = null
  let city: string | null = null
  let region: string | null = null
  let latitude: number | null = null
  let longitude: number | null = null

  try {
    const ipRes = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (ipRes.ok) {
      const data = await ipRes.json()
      externalIp = typeof data.ip === 'string' ? data.ip : null
      isp = typeof data.org === 'string' ? data.org : null
      country = typeof data.country_name === 'string' ? data.country_name : null
      city = typeof data.city === 'string' ? data.city : null
      region = typeof data.region === 'string' ? data.region : null
      latitude = Number.isFinite(data.latitude) ? data.latitude : null
      longitude = Number.isFinite(data.longitude) ? data.longitude : null
    }
  } catch {
    // O diagnóstico principal continua útil mesmo se o serviço de IP estiver indisponível.
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    online: reachable,
    latency,
    target: 'connectivity-check',
    contentType,
    error,
    externalIp,
    isp,
    country,
    geo: latitude !== null && longitude !== null
      ? { latitude, longitude, city, region, country }
      : null,
    note: 'Diagnóstico de rede server-side com destino fixo e seguro. Nenhuma URL fornecida pelo cliente é buscada pelo servidor.',
  })
}
