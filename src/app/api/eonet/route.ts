import { NextRequest, NextResponse } from 'next/server'

/**
 * API: NASA EONET — eventos naturais globais em quase tempo real
 * Fonte: eonet.gsfc.nasa.gov (serviço público NASA, sem chave de API)
 * Tipos: Wildfires, Volcanoes, Severe Storms, Sea/Lake Ice, Snow, Drought, Dust, Haze, Manmade, Temperature Extremes
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 minutos

interface EonetEvent {
  id: string
  title: string
  category: string
  categoryLabel: string
  date: string
  coords: { lat: number; lon: number }
  source?: string
  closed?: boolean
  distanceKm?: number
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

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const lat = parseFloat(searchParams.get('lat') || '-15.7801')
  const lon = parseFloat(searchParams.get('lon') || '-47.9292')
  const radius = parseFloat(searchParams.get('raio') || '1000')
  const days = parseInt(searchParams.get('dias') || '30', 10)
  const status = searchParams.get('status') || 'open'
  const category = searchParams.get('categoria')

  const startTime = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

  let url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=${status}&start=${startTime}&limit=200`
  if (category) url += `&category=${category}`

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'AussyOntech/1.0 (emergency PWA)' },
      cache: 'no-store',
    })
    clearTimeout(t)

    if (!res.ok) throw new Error(`EONET HTTP ${res.status}`)

    const data = await res.json()
    const rawEvents: any[] = data.events || []

    const events: EonetEvent[] = []
    for (const e of rawEvents) {
      const cats = (e.categories || []).map((c: any) => c.id)
      const primaryCat = cats[0] || 'unknown'
      const geos = e.geometry || []
      const latestGeo = geos[geos.length - 1]
      if (!latestGeo) continue

      let coords: { lat: number; lon: number }
      if (latestGeo.type === 'Point') {
        const [lonEq, latEq] = latestGeo.coordinates
        coords = { lat: latEq, lon: lonEq }
      } else if (latestGeo.type === 'Polygon') {
        const pts = latestGeo.coordinates[0] || []
        if (pts.length === 0) continue
        const avgLon = pts.reduce((s: number, p: number[]) => s + p[0], 0) / pts.length
        const avgLat = pts.reduce((s: number, p: number[]) => s + p[1], 0) / pts.length
        coords = { lat: avgLat, lon: avgLon }
      } else {
        continue
      }

      const dist = haversine(lat, lon, coords.lat, coords.lon)
      if (dist > radius) continue

      const sources = (e.sources || []).map((s: any) => s.url)[0]

      events.push({
        id: e.id,
        title: e.title,
        category: primaryCat,
        categoryLabel: CATEGORY_LABELS[primaryCat] || primaryCat,
        date: latestGeo.date || (e.geometry || [])[0]?.date || '',
        coords,
        source: sources,
        closed: e.closed !== undefined,
        distanceKm: Math.round(dist),
      })
    }

    events.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))

    return NextResponse.json(
      {
        source: 'NASA EONET — Earth Observatory Natural Event Tracker',
        sourceUrl: 'https://eonet.gsfc.nasa.gov',
        queriedAt: new Date().toISOString(),
        center: { lat, lon, radiusKm: radius },
        periodDays: days,
        status,
        total: events.length,
        events: events.slice(0, 60),
        offline: false,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        source: 'fallback (offline ou API indisponível)',
        sourceUrl: 'https://eonet.gsfc.nasa.gov',
        queriedAt: new Date().toISOString(),
        center: { lat, lon, radiusKm: radius },
        total: 0,
        events: [],
        offline: true,
        note: 'NASA EONET indisponível. Tente novamente quando estiver online.',
      },
      { status: 200 }
    )
  }
}
