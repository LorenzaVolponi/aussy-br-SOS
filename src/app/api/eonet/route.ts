import { NextRequest, NextResponse } from 'next/server'

/**
 * NASA EONET v3 — eventos naturais globais curados por múltiplas fontes.
 *
 * Regras de integridade:
 * - localização válida é obrigatória; nunca usamos uma cidade padrão;
 * - status/dias/raio são validados antes da consulta;
 * - evento aberto em EONET tem `closed: null`, portanto só tratamos como fechado
 *   quando existe uma data real em `closed`;
 * - falha do upstream retorna 503/unavailable para preservar last-known-good no SW.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 1800

const EONET_EVENTS_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events'
const EONET_HOME = 'https://eonet.gsfc.nasa.gov/'

interface EonetEvent {
  id: string
  title: string
  category: string
  categoryLabel: string
  date: string
  coords: { lat: number; lon: number }
  source?: string
  closed: boolean
  closedAt: string | null
  distanceKm: number
}

const CATEGORY_LABELS: Record<string, string> = {
  wildfires: 'Queimadas',
  volcanoes: 'Vulcões',
  severeStorms: 'Tempestades Severas',
  seaLakeIce: 'Gelo Marítimo/Lacustre',
  snow: 'Neve',
  drought: 'Seca',
  dustHaze: 'Poeira/Névoa',
  manmade: 'Origem Humana',
  tempExtremes: 'Extremos de Temperatura',
  waterColor: 'Cor da Água',
  landslides: 'Deslizamentos',
  earthquakes: 'Terremotos',
  floods: 'Enchentes',
}

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function boundedNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
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

function geometryCenter(geometry: any): { lat: number; lon: number } | null {
  if (!geometry || !Array.isArray(geometry.coordinates)) return null

  if (geometry.type === 'Point') {
    const [lon, lat] = geometry.coordinates
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return null
    return { lat: Number(lat), lon: Number(lon) }
  }

  if (geometry.type === 'Polygon') {
    const points = geometry.coordinates?.[0]
    if (!Array.isArray(points) || points.length === 0) return null
    const validPoints = points.filter(
      (point: unknown) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1]))
    ) as unknown[][]
    if (validPoints.length === 0) return null
    const lon = validPoints.reduce((sum, point) => sum + Number(point[0]), 0) / validPoints.length
    const lat = validPoints.reduce((sum, point) => sum + Number(point[1]), 0) / validPoints.length
    return { lat, lon }
  }

  return null
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const lat = parseCoordinate(searchParams.get('lat'), -90, 90)
  const lon = parseCoordinate(searchParams.get('lon'), -180, 180)

  if (lat === null || lon === null) {
    return NextResponse.json(
      {
        offline: true,
        dataQuality: 'unavailable',
        error: 'invalid-location',
        events: [],
        total: 0,
        source: 'NASA EONET',
        sourceUrl: EONET_HOME,
        queriedAt: new Date().toISOString(),
        note: 'Latitude e longitude válidas são obrigatórias. Nenhuma cidade padrão é assumida.',
      },
      { status: 400 }
    )
  }

  const radius = boundedNumber(searchParams.get('raio'), 1000, 1, 10000)
  const days = Math.round(boundedNumber(searchParams.get('dias'), 30, 1, 365))
  const requestedStatus = searchParams.get('status') || 'open'
  const status = ['open', 'closed', 'all'].includes(requestedStatus) ? requestedStatus : 'open'
  const category = searchParams.get('categoria')?.trim() || null

  const upstream = new URL(EONET_EVENTS_URL)
  upstream.searchParams.set('status', status)
  upstream.searchParams.set('days', String(days))
  upstream.searchParams.set('limit', '200')
  if (category) upstream.searchParams.set('category', category)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(upstream, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AussyOntech/1.0 (emergency PWA)' },
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(`EONET HTTP ${res.status}`)

    const data = await res.json()
    const rawEvents: any[] = Array.isArray(data?.events) ? data.events : []
    const events: EonetEvent[] = []

    for (const event of rawEvents) {
      const categories = Array.isArray(event?.categories) ? event.categories : []
      const primaryCategory = String(categories[0]?.id || 'unknown')
      const geometries = Array.isArray(event?.geometry) ? event.geometry : []
      const latestGeometry = geometries.at(-1)
      const coords = geometryCenter(latestGeometry)
      if (!coords) continue

      const distanceKm = haversine(lat, lon, coords.lat, coords.lon)
      if (distanceKm > radius) continue

      const firstSource = Array.isArray(event?.sources) ? event.sources[0] : null
      const source = typeof firstSource?.url === 'string' ? firstSource.url : undefined
      const closedAt = typeof event?.closed === 'string' && event.closed ? event.closed : null

      events.push({
        id: String(event?.id || ''),
        title: String(event?.title || 'Evento EONET'),
        category: primaryCategory,
        categoryLabel: CATEGORY_LABELS[primaryCategory] || primaryCategory,
        date: String(latestGeometry?.date || geometries[0]?.date || ''),
        coords,
        source,
        closed: Boolean(closedAt),
        closedAt,
        distanceKm: Math.round(distanceKm),
      })
    }

    events.sort((a, b) => a.distanceKm - b.distanceKm)

    return NextResponse.json(
      {
        offline: false,
        dataQuality: 'live-eonet',
        source: 'NASA EONET v3',
        sourceUrl: EONET_HOME,
        queriedAt: new Date().toISOString(),
        center: { lat, lon, radiusKm: radius },
        periodDays: days,
        status,
        total: events.length,
        events: events.slice(0, 60),
        note: 'EONET é um catálogo de eventos curados a partir de múltiplas fontes; não é, por si só, um sensor ou feed de satélite em tempo real.',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    )
  } catch {
    return NextResponse.json(
      {
        offline: true,
        dataQuality: 'unavailable',
        source: 'NASA EONET v3',
        sourceUrl: EONET_HOME,
        queriedAt: new Date().toISOString(),
        center: { lat, lon, radiusKm: radius },
        periodDays: days,
        status,
        total: 0,
        events: [],
        error: 'upstream-unavailable',
        note: 'NASA EONET indisponível nesta consulta. Nenhum estado “sem eventos” é inferido; o Service Worker pode usar a última resposta válida em cache.',
      },
      { status: 503 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
