import { NextResponse } from 'next/server'
import { WIFI_PUBLIC_POINTS, BRAZIL_OPERATORS } from '@/lib/data/coverage'

export const runtime = 'nodejs'
export const revalidate = 86400 // 24h

// Haversine para calcular distância
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '-15.7801')
  const lon = parseFloat(searchParams.get('lon') || '-47.9292')
  const radius = parseFloat(searchParams.get('radius') || '50') // km
  const operator = searchParams.get('operator') // 'vivo', 'claro', 'tim'

  // Pontos WiFi do catálogo demonstrativo próximos ao observador.
  const wifiNear = WIFI_PUBLIC_POINTS
    .map((p) => ({
      ...p,
      distance: haversine(lat, lon, p.lat, p.lng),
    }))
    .filter((p) => p.distance <= radius)
    .sort((a, b) => a.distance - b.distance)

  // IMPORTANTE: posições abaixo são sintéticas e servem apenas para demonstrar
  // a experiência de visualização. Elas NÃO representam ERBs reais da ANATEL.
  interface Tower {
    id: string
    operator: string
    technology: string
    distance: number
    lat: number
    lon: number
    estimated: boolean
    source: string
  }
  const towers: Tower[] = []
  const numTowers = 25
  for (let i = 0; i < numTowers; i++) {
    const angle = (i / numTowers) * 2 * Math.PI
    const distance = 0.5 + Math.random() * 8 // 0.5-8.5 km
    const towerLat = lat + (distance / 111) * Math.cos(angle)
    const towerLon = lon + (distance / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle)

    const opIndex = Math.floor(Math.random() * 3)
    const op = BRAZIL_OPERATORS[opIndex]
    const techs = ['4G LTE', '4G LTE', '4G LTE', '5G NR', '3G UMTS']

    towers.push({
      id: `sim-erb-${i}`,
      operator: op.name,
      technology: techs[Math.floor(Math.random() * techs.length)],
      distance,
      lat: towerLat,
      lon: towerLon,
      estimated: true,
      source: 'Simulação demonstrativa — não é localização oficial de ERB',
    })
  }

  towers.sort((a, b) => a.distance - b.distance)

  const byOperator = BRAZIL_OPERATORS.map((op) => {
    const count = towers.filter((t) => t.operator === op.name).length
    return {
      name: op.name,
      color: op.color,
      towers: count,
      closest: towers.find((t) => t.operator === op.name)?.distance || null,
      estimated: true,
    }
  })

  return NextResponse.json({
    observer: { lat, lon, radius },
    timestamp: new Date().toISOString(),
    source: 'Aussy Ontech — simulação demonstrativa de ERBs; catálogo amostral de Wi-Fi público',
    dataQuality: {
      towers: 'synthetic',
      wifiPoints: 'sample',
    },
    wifiPoints: wifiNear,
    wifiTotal: wifiNear.length,
    towers: operator ? towers.filter((t) => t.operator.toLowerCase() === operator) : towers,
    towersTotal: towers.length,
    byOperator,
    note: 'As ERBs exibidas são simuladas e não devem ser usadas para decisão operacional. Para localização oficial, consulte a base ERB-Web da ANATEL.',
  })
}
