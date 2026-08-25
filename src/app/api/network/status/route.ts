import { isIP } from 'node:net'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CONNECTIVITY_TARGET = 'https://www.google.com/generate_204'

function numericCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function decodedHeader(value: string | null): string | null {
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function firstForwardedIp(request: Request): string | null {
  const raw =
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip')
  if (!raw) return null
  const first = raw.split(',')[0]?.trim() || ''
  return first || null
}

function isPublicIp(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) {
    const octets = ip.split('.').map(Number)
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
    const [a, b] = octets
    if (a === 0 || a === 10 || a === 127) return false
    if (a === 100 && b >= 64 && b <= 127) return false
    if (a === 169 && b === 254) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a >= 224) return false
    return true
  }

  if (version === 6) {
    const normalized = ip.toLowerCase()
    if (normalized === '::1' || normalized === '::') return false
    if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return false
    if (normalized.startsWith('::ffff:')) return isPublicIp(normalized.slice('::ffff:'.length))
    return true
  }

  return false
}

export async function GET(request: Request) {
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
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Falha de rede'
  }

  const clientIp = firstForwardedIp(request)
  let externalIp: string | null = clientIp
  let isp: string | null = null
  let country = decodedHeader(request.headers.get('x-vercel-ip-country'))
  let city = decodedHeader(request.headers.get('x-vercel-ip-city'))
  let region = decodedHeader(request.headers.get('x-vercel-ip-country-region'))
  let latitude = numericCoordinate(request.headers.get('x-vercel-ip-latitude'), -90, 90)
  let longitude = numericCoordinate(request.headers.get('x-vercel-ip-longitude'), -180, 180)
  let geoSource: 'vercel-request-geo' | 'ipapi-client-ip' | null =
    latitude !== null && longitude !== null ? 'vercel-request-geo' : null

  if ((latitude === null || longitude === null) && clientIp && isPublicIp(clientIp)) {
    try {
      const ipUrl = `https://ipapi.co/${encodeURIComponent(clientIp)}/json/`
      const ipRes = await fetch(ipUrl, {
        signal: AbortSignal.timeout(3000),
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      if (ipRes.ok) {
        const data = await ipRes.json()
        const ipLat = Number(data?.latitude)
        const ipLon = Number(data?.longitude)
        if (Number.isFinite(ipLat) && ipLat >= -90 && ipLat <= 90 && Number.isFinite(ipLon) && ipLon >= -180 && ipLon <= 180) {
          latitude = ipLat
          longitude = ipLon
          externalIp = typeof data?.ip === 'string' ? data.ip : clientIp
          isp = typeof data?.org === 'string' ? data.org : null
          country = typeof data?.country_name === 'string' ? data.country_name : country
          city = typeof data?.city === 'string' ? data.city : city
          region = typeof data?.region === 'string' ? data.region : region
          geoSource = 'ipapi-client-ip'
        }
      }
    } catch {
      // Sem coordenadas confirmadas do cliente, não usamos a localização do servidor como fallback.
    }
  }

  const geo = latitude !== null && longitude !== null
    ? { latitude, longitude, city, region, country }
    : null

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
    geo,
    geoSource,
    dataQuality: geoSource ? 'client-network-estimate' : 'network-only',
    note: geoSource
      ? 'Localização aproximada derivada do IP da requisição do cliente; GPS continua sendo a fonte preferencial.'
      : 'Diagnóstico de rede server-side. Sem coordenadas de cliente confirmadas, nenhuma localização do servidor é usada como fallback.',
  })
}
