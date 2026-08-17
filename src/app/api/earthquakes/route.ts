import { NextRequest, NextResponse } from 'next/server'

/**
 * API: USGS Earthquakes — terremotos globais em tempo real
 * Fonte: earthquake.usgs.gov (serviço público, sem chave de API)
 * Filtros: lat/lon/raio (km), magnitude mínima, período (dias)
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 300 // 5 minutos

interface QuakeEvent {
  id: string
  magnitude: number
  place: string
  time: number
  url: string
  coords: { lat: number; lon: number; depth: number }
  distanceKm?: number
  severity: 'baixo' | 'moderado' | 'forte' | 'major' | 'great'
  tsunami: boolean
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function severityFromMag(m: number): QuakeEvent['severity'] {
  if (m >= 8) return 'great'
  if (m >= 7) return 'major'
  if (m >= 6) return 'forte'
  if (m >= 4.5) return 'moderado'
  return 'baixo'
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const lat = parseFloat(searchParams.get('lat') || '-15.7801')
  const lon = parseFloat(searchParams.get('lon') || '-47.9292')
  const radius = parseFloat(searchParams.get('raio') || '500')
  const minMag = parseFloat(searchParams.get('mag') || '2.5')
  const days = parseInt(searchParams.get('dias') || '7', 10)

  const startTime = new Date(Date.now() - days * 86400000).toISOString()
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startTime}&minmagnitude=${minMag}&orderby=time&limit=200`

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 7000)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'AussyOntech/1.0 (emergency PWA)' },
      cache: 'no-store',
    })
    clearTimeout(t)

    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`)

    const data = await res.json()
    const features: any[] = data.features || []

    const events: QuakeEvent[] = features
      .map((f: any) => {
        const [lonEq, latEq, depth] = f.geometry.coordinates
        const dist = haversine(lat, lon, latEq, lonEq)
        return {
          id: f.id,
          magnitude: f.properties.mag ?? 0,
          place: f.properties.place || '—',
          time: f.properties.time,
          url: f.properties.url,
          coords: { lat: latEq, lon: lonEq, depth: depth || 0 },
          distanceKm: Math.round(dist),
          severity: severityFromMag(f.properties.mag ?? 0),
          tsunami: !!f.properties.tsunami,
        }
      })
      .filter((e) => e.distanceKm <= radius)
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))

    return NextResponse.json(
      {
        source: 'USGS Earthquake Hazards Program',
        sourceUrl: 'https://earthquake.usgs.gov',
        queriedAt: new Date().toISOString(),
        center: { lat, lon, radiusKm: radius },
        minMagnitude: minMag,
        periodDays: days,
        total: events.length,
        events: events.slice(0, 50),
        offline: false,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (err: any) {
    const now = Date.now()
    const fallback: QuakeEvent[] = [
      {
        id: 'fallback-1',
        magnitude: 4.1,
        place: 'São Marcos, RS, Brasil (2022)',
        time: now - 5 * 86400000,
        url: 'https://earthquake.usgs.gov',
        coords: { lat: -28.97, lon: -51.07, depth: 8 },
        distanceKm: Math.round(haversine(lat, lon, -28.97, -51.07)),
        severity: 'moderado',
        tsunami: false,
      },
      {
        id: 'fallback-2',
        magnitude: 3.5,
        place: 'Caldas Novas, GO, Brasil',
        time: now - 12 * 86400000,
        url: 'https://earthquake.usgs.gov',
        coords: { lat: -17.74, lon: -48.62, depth: 5 },
        distanceKm: Math.round(haversine(lat, lon, -17.74, -48.62)),
        severity: 'baixo',
        tsunami: false,
      },
      {
        id: 'fallback-3',
        magnitude: 4.8,
        place: 'Porto dos Gaúchos, MT (2008 histórico)',
        time: now - 30 * 86400000,
        url: 'https://earthquake.usgs.gov',
        coords: { lat: -11.4, lon: -57.07, depth: 10 },
        distanceKm: Math.round(haversine(lat, lon, -11.4, -57.07)),
        severity: 'moderado',
        tsunami: false,
      },
    ]

    return NextResponse.json(
      {
        source: 'fallback (offline ou API indisponível)',
        sourceUrl: 'https://earthquake.usgs.gov',
        queriedAt: new Date().toISOString(),
        center: { lat, lon, radiusKm: radius },
        minMagnitude: minMag,
        periodDays: days,
        total: fallback.length,
        events: fallback.filter((e) => (e.distanceKm ?? 0) <= radius),
        offline: true,
        note: 'USGS indisponível; exibindo sismos históricos brasileiros para referência.',
      },
      { status: 200 }
    )
  }
}
