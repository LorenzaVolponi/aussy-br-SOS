import { NextResponse } from 'next/server'
import { BRAZIL_OPERATORS } from '@/lib/data/coverage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const OSM_URL = 'https://www.openstreetmap.org/'

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function parseRadius(value: string | null): number | null {
  if (value === null || value.trim() === '') return 30
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 30) return null
  return parsed
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function wifiType(tags: Record<string, string> = {}) {
  if (tags.amenity === 'school' || tags.amenity === 'university' || tags.amenity === 'college') return 'escola'
  if (tags.amenity === 'library') return 'biblioteca'
  if (tags.amenity === 'clinic' || tags.amenity === 'hospital' || tags.healthcare) return 'ubs'
  if (tags.leisure === 'park' || tags.place === 'square') return 'praca'
  return 'equipamento_publico'
}

function elementPoint(element: any): { lat: number; lng: number } | null {
  const lat = Number(element?.lat ?? element?.center?.lat)
  const lng = Number(element?.lon ?? element?.center?.lon)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseCoordinate(searchParams.get('lat'), -90, 90)
  const lon = parseCoordinate(searchParams.get('lon'), -180, 180)
  const radius = parseRadius(searchParams.get('radius'))

  if (lat === null || lon === null || radius === null) {
    return NextResponse.json({
      dataQuality: 'unavailable', error: 'invalid-location', observer: null, wifiPoints: [], wifiTotal: 0,
      towers: [], towersTotal: 0, byOperator: [], timestamp: new Date().toISOString(),
      source: 'OpenStreetMap / Overpass API', sourceUrl: OSM_URL,
      note: 'Latitude, longitude e raio entre 0 e 30 km são obrigatórios. Nenhuma cidade padrão é assumida.',
    }, { status: 400 })
  }

  const byOperator = BRAZIL_OPERATORS.map((operator) => ({
    name: operator.name, color: operator.color, towers: 0, closest: null, estimated: false, dataQuality: 'unavailable',
  }))

  const radiusMeters = Math.round(radius * 1000)
  const query = `[out:json][timeout:12];(nwr(around:${radiusMeters},${lat},${lon})[internet_access=wlan];nwr(around:${radiusMeters},${lat},${lon})[internet_access=wifi];nwr(around:${radiusMeters},${lat},${lon})[wifi=yes];);out center tags;`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 14000)

  try {
    const upstream = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json',
        'User-Agent': 'AUSSY.SOS/1.0 public-wifi-discovery',
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!upstream.ok) throw new Error(`Overpass HTTP ${upstream.status}`)
    const payload = await upstream.json()
    const seen = new Set<string>()
    const wifiPoints = (Array.isArray(payload?.elements) ? payload.elements : [])
      .map((element: any) => {
        const point = elementPoint(element)
        if (!point) return null
        const id = `osm-${String(element.type || 'element')}-${String(element.id || `${point.lat}-${point.lng}`)}`
        if (seen.has(id)) return null
        seen.add(id)
        const tags = element.tags || {}
        return {
          id,
          name: String(tags.name || tags.operator || tags.amenity || 'Ponto Wi-Fi mapeado'),
          city: String(tags['addr:city'] || tags['addr:municipality'] || '—'),
          state: String(tags['addr:state'] || '—'),
          type: wifiType(tags),
          lat: point.lat,
          lng: point.lng,
          distance: haversine(lat, lon, point.lat, point.lng),
          access: String(tags.internet_access || tags.wifi || 'yes'),
          fee: tags.fee ? String(tags.fee) : null,
          source: 'OpenStreetMap contributors',
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.distance - b.distance)
      .slice(0, 200)

    return NextResponse.json({
      observer: { lat, lon, radius }, timestamp: new Date().toISOString(),
      source: 'OpenStreetMap contributors via Overpass API', sourceUrl: OSM_URL,
      dataQuality: { towers: 'unavailable', wifiPoints: 'live-crowdsourced' },
      wifiPoints, wifiTotal: wifiPoints.length, towers: [], towersTotal: 0, byOperator,
      note: 'Pontos de Wi-Fi são registros geográficos atuais consultados no OpenStreetMap. A presença no mapa não garante disponibilidade, gratuidade, alcance ou funcionamento neste instante. ERBs oficiais não integradas nesta build. O Aussy não fabrica posições de ERB.',
    }, { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=21600' } })
  } catch {
    return NextResponse.json({
      observer: { lat, lon, radius }, timestamp: new Date().toISOString(), offline: true,
      source: 'OpenStreetMap / Overpass API', sourceUrl: OSM_URL,
      dataQuality: { towers: 'unavailable', wifiPoints: 'unavailable' },
      wifiPoints: [], wifiTotal: 0, towers: [], towersTotal: 0, byOperator,
      error: 'wifi-upstream-unavailable',
      note: 'A fonte de Wi-Fi não respondeu. O Aussy não substitui a falha por pontos demonstrativos ou inventados. ERBs oficiais não integradas nesta build. O Aussy não fabrica posições de ERB.',
    }, { status: 503 })
  } finally {
    clearTimeout(timeout)
  }
}