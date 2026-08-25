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

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function boundedNumber(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function measuredNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
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
  const lat = parseCoordinate(searchParams.get('lat'), -90, 90)
  const lon = parseCoordinate(searchParams.get('lon'), -180, 180)
  const radius = boundedNumber(searchParams.get('raio'), 500, 1, 20000)
  const minMag = boundedNumber(searchParams.get('mag'), 2.5, 0, 10)
  const days = Math.round(boundedNumber(searchParams.get('dias'), 7, 1, 30))

  if (lat === null || lon === null) {
    return NextResponse.json({
      source: 'USGS Earthquake Hazards Program',
      sourceUrl: 'https://earthquake.usgs.gov',
      queriedAt: new Date().toISOString(),
      center: null,
      minMagnitude: minMag,
      periodDays: days,
      total: 0,
      events: [],
      offline: false,
      error: 'invalid-location',
      dataQuality: 'unavailable',
      note: 'Latitude e longitude válidas são obrigatórias. Nenhuma cidade padrão é assumida.',
    }, { status: 400 })
  }

  const startTime = new Date(Date.now() - days * 86400000).toISOString()
  const sourceUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${encodeURIComponent(startTime)}&minmagnitude=${minMag}&orderby=time&limit=200`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)

  try {
    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AussyOntech/1.0 (emergency PWA)' },
      cache: 'no-store',
    })

    if (!response.ok) throw new Error(`USGS HTTP ${response.status}`)

    const data = await response.json()
    const features: unknown[] = Array.isArray(data?.features) ? data.features : []

    const events: QuakeEvent[] = features
      .map((raw): QuakeEvent | null => {
        const feature = raw as {
          id?: unknown
          geometry?: { coordinates?: unknown }
          properties?: Record<string, unknown>
        }
        const coordinates = feature.geometry?.coordinates
        if (!Array.isArray(coordinates) || coordinates.length < 3) return null

        const eventLon = measuredNumber(coordinates[0])
        const eventLat = measuredNumber(coordinates[1])
        const depth = measuredNumber(coordinates[2])
        const magnitude = measuredNumber(feature.properties?.mag)
        const eventTime = measuredNumber(feature.properties?.time)
        const id = typeof feature.id === 'string' && feature.id.trim() ? feature.id : null

        if (
          eventLat === null || eventLat < -90 || eventLat > 90 ||
          eventLon === null || eventLon < -180 || eventLon > 180 ||
          depth === null || magnitude === null || eventTime === null || !id
        ) return null

        const distance = haversine(lat, lon, eventLat, eventLon)
        return {
          id,
          magnitude,
          place: String(feature.properties?.place || 'Local não informado'),
          time: eventTime,
          url: typeof feature.properties?.url === 'string' && feature.properties.url
            ? feature.properties.url
            : 'https://earthquake.usgs.gov',
          coords: { lat: eventLat, lon: eventLon, depth },
          distanceKm: Math.round(distance),
          severity: severityFromMag(magnitude),
          tsunami: Boolean(feature.properties?.tsunami),
        }
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
  } finally {
    clearTimeout(timeout)
  }
}
