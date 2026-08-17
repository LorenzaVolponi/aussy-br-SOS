import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const testUrl = searchParams.get('url') || 'https://www.google.com/generate_204'

  const startTime = Date.now()
  let reachable = false
  let latency: number | null = null
  let contentType: string | null = null
  let error: string | null = null

  try {
    const res = await fetch(testUrl, {
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

  // Detecta provedor de DNS, IP externo, etc. via serviço público
  let externalIp: string | null = null
  let isp: string | null = null
  let country: string | null = null
  try {
    const ipRes = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    if (ipRes.ok) {
      const data = await ipRes.json()
      externalIp = data.ip
      isp = data.org
      country = data.country_name
    }
  } catch {
    // ok, não tem internet externa ou ipapi indisponível
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    online: reachable,
    latency,
    target: testUrl,
    contentType,
    error,
    externalIp,
    isp,
    country,
    note: 'Diagnóstico de rede em tempo real feito server-side. Para diagnóstico client-side, use a Network Information API no navegador.',
  })
}
