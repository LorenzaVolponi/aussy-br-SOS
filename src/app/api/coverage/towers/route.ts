import { NextResponse } from 'next/server'
import { WIFI_PUBLIC_POINTS, BRAZIL_OPERATORS } from '@/lib/data/coverage'

export const runtime = 'nodejs'
export const revalidate = 86400 // 24h

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function parseRadius(value: string | null): number | null {
  if (value === null || value.trim() === '') return 30
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) return null
  return parsed
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseCoordinate(searchParams.get('lat'), -90, 90)
  const lon = parseCoordinate(searchParams.get('lon'), -180, 180)
  const radius = parseRadius(searchParams.get('radius'))

  if (lat === null || lon === null || radius === null) {
    return NextResponse.json(
      {
        dataQuality: 'unavailable',
        error: 'invalid-location',
        observer: null,
        wifiPoints: [],
        wifiTotal: 0,
        towers: [],
        towersTotal: 0,
        byOperator: [],
        timestamp: new Date().toISOString(),
        source: 'Aussy Ontech — catálogo amostral de Wi-Fi público',
        note: 'Latitude, longitude e raio válidos são obrigatórios. Nenhuma cidade padrão é assumida.',
      },
      { status: 400 }
    )
  }

  const wifiNear = WIFI_PUBLIC_POINTS
    .map((point) => ({
      ...point,
      distance: haversine(lat, lon, point.lat, point.lng),
    }))
    .filter((point) => point.distance <= radius)
    .sort((a, b) => a.distance - b.distance)

  const byOperator = BRAZIL_OPERATORS.map((operator) => ({
    name: operator.name,
    color: operator.color,
    towers: 0,
    closest: null,
    estimated: false,
    dataQuality: 'unavailable',
  }))

  return NextResponse.json({
    observer: { lat, lon, radius },
    timestamp: new Date().toISOString(),
    source: 'Aussy Ontech — catálogo amostral de Wi-Fi público; ERBs oficiais não integradas nesta build',
    dataQuality: {
      towers: 'unavailable',
      wifiPoints: 'sample',
    },
    wifiPoints: wifiNear,
    wifiTotal: wifiNear.length,
    towers: [],
    towersTotal: 0,
    byOperator,
    note: 'O Aussy não fabrica posições de ERB. Para localização oficial de antenas, consulte a base ERB-Web da ANATEL.',
  })
}
