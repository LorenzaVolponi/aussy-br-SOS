import { NextRequest, NextResponse } from 'next/server'

/**
 * API: OpenStreetMap Nominatim — reverse geocoding
 * Converte coordenadas (lat, lon) em nome de cidade/estado/país
 * Fonte: nominatim.openstreetmap.org (serviço público, sem chave)
 * Política: máximo 1 req/segundo, identificar User-Agent
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 86400 // 24h (cidade não muda)

interface ReverseGeocode {
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
  state?: string
  stateCode?: string
  country?: string
  countryCode?: string
  postcode?: string
  road?: string
  suburb?: string
  displayName: string
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Parâmetros lat e lon são obrigatórios' },
      { status: 400 }
    )
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=pt-BR&zoom=12`

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'AussyOntech/1.0 (emergency PWA) - contato@aussyontech.com',
        'Accept-Language': 'pt-BR',
      },
    })
    clearTimeout(t)

    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)

    const data = await res.json()
    const addr = data.address || {}

    const result: ReverseGeocode = {
      city: addr.city,
      town: addr.town,
      village: addr.village,
      municipality: addr.municipality,
      county: addr.county,
      state: addr.state,
      stateCode: addr['ISO3166-2-lvl4']?.split('-')[1],
      country: addr.country,
      countryCode: addr.country_code?.toUpperCase(),
      postcode: addr.postcode,
      road: addr.road,
      suburb: addr.suburb,
      displayName: data.display_name || '',
    }

    const city =
      result.city || result.town || result.village || result.municipality || result.county || 'Localização desconhecida'

    return NextResponse.json(
      {
        source: 'OpenStreetMap Nominatim',
        sourceUrl: 'https://nominatim.openstreetmap.org',
        queriedAt: new Date().toISOString(),
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        city,
        ...result,
        offline: false,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        source: 'fallback',
        sourceUrl: 'https://nominatim.openstreetmap.org',
        queriedAt: new Date().toISOString(),
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        city: null,
        displayName: null,
        offline: true,
        note: 'Nominatim indisponível ou offline.',
      },
      { status: 200 }
    )
  }
}
