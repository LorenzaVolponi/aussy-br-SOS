import { NextRequest, NextResponse } from 'next/server'

/**
 * USGS Earthquakes — eventos globais confirmados.
 *
 * Sem resposta do USGS, NÃO convertemos sismos históricos em eventos atuais.
 * A última resposta real pode ser servida pelo Service Worker; sem cache,
 * retornamos `events: []` + indisponibilidade explícita.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 300

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
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function severityFromMag(magnitude: number): QuakeEvent['severity'] {
  if (magnitude >= 8) return 'great'
  if (magnitude >= 7) return 'major'
  if (magnitude >= 6) return 'forte'
  if (magnitude >= 4.5) return 'moderado'
  return 'baixo'
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const lat = parseFloat(searchParams.get('lat') || '-15.7801')
  const lon = parseFloat(searchParams.get('lon') || '-47.9292')
  const radius = Math.min(Math.max(parseFloat(searchParams.get('raio') || '500'), 1), 20000)
  const minMag = Math.min(Math.max(parseFloat(searchParams.get('mag') || '2.5'), 0), 10)
  const days = Math.min(Math.max(parseInt(searchParams.get('dias') || '7', 10), 1), 30)

  const startTime = new Date(Date.now() - days * 86400000).toISOString()
  const sourceUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${encodeURIComponent(startTime)}&minmagnitude=${minMag}&orderby=time&limit=200`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 7000)
    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AussyOntech/1.0 (emergency PWA)' },
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!response.ok) throw new Error(`USGS HTTP ${response.status}`)

    const data = await response.json()
    const features: any[] = Array.isArray(data?.features) ? data.features : []

    const events: QuakeEvent[] = features
      .map((feature: any) => {
        const coordinates = feature?.geometry?.coordinates
        if (!Array.isArray(coordinates) || coordinates.length < 2) return null
        const [eventLon, eventLat, depth] = coordinates
        if (!Number.isFinite(eventLat) || !Number.isFinite(eventLon)) return null
        const distance = haversine(lat, lon, eventLat, eventLon)
        const magnitude = Number(feature?.properties?.mag ?? 0)
        return {
          id: String(feature.id),
          magnitude,
          place: String(feature?.properties?.place || 'Local não informado'),
          time: Number(feature?.properties?.time || 0),
          url: String(feature?.properties?.url || 'https://earthquake.usgs.gov'),
          coords: { lat: eventLat, lon: eventLon, depth: Number(depth || 0) },
          distanceKm: Math.round(distance),
          severity: severityFromMag(magnitude),
          tsunami: Boolean(feature?.properties?.tsunami),
        } satisfies QuakeEvent
      })
      .filter((event): event is QuakeEvent => Boolean(event && (event.distanceKm ?? Infinity) <= radius))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))

    return NextResponse.json({
      source: 'USGS Earthquake Hazards Program',
      sourceUrl: 'https://earthquake.usgs.gov',
      queriedAt: new Date().toISOString(),
      center: { lat, lon, radiusKm: radius },
      minMagnitude: minMag,
      periodDays: days,
      total: events.length,
      events: events.slice(0, 50),
      offline: false,
      error: null,
      dataQuality: 'live',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch {
    return NextResponse.json({
      source: 'USGS Earthquake Hazards Program — indisponível',
      sourceUrl: 'https://earthquake.usgs.gov',
      queriedAt: new Date().toISOString(),
      center: { lat, lon, radiusKm: radius },
      minMagnitude: minMag,
      periodDays: days,
      total: 0,
      events: [],
      offline: false,
      error: 'unavailable',
      dataQuality: 'unavailable',
      note: 'Não foi possível confirmar eventos no USGS. Nenhum sismo histórico foi apresentado como evento atual.',
    }, { status: 503 })
  }
}
