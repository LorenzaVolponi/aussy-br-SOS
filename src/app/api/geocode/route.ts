import { NextRequest, NextResponse } from 'next/server'
import {
  circuitUnavailable,
  enforceRateLimit,
  isCircuitOpen,
  recordProviderFailure,
  recordProviderSuccess,
} from '@/lib/api-resilience'

/**
 * OpenStreetMap Nominatim — reverse geocoding.
 *
 * O proxy mantém identificação do aplicativo, cacheia o resultado e nunca envia
 * coordenadas não validadas ao serviço público. Em falha, retorna unavailable
 * para que o Service Worker possa preservar a última resposta válida.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 86400

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'
const NOMINATIM_HOME = 'https://nominatim.openstreetmap.org/'
const PROVIDER = 'nominatim-reverse'

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

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, PROVIDER, { limit: 30, windowMs: 60_000 })
  if (limited) return limited

  const lat = parseCoordinate(req.nextUrl.searchParams.get('lat'), -90, 90)
  const lon = parseCoordinate(req.nextUrl.searchParams.get('lon'), -180, 180)

  if (lat === null || lon === null) {
    return NextResponse.json(
      {
        offline: true,
        dataQuality: 'unavailable',
        freshness: 'unavailable',
        error: 'invalid-location',
        city: null,
        displayName: null,
        source: 'OpenStreetMap Nominatim',
        sourceUrl: NOMINATIM_HOME,
        queriedAt: new Date().toISOString(),
        note: 'Latitude e longitude válidas são obrigatórias.',
      },
      { status: 400 }
    )
  }

  if (isCircuitOpen(PROVIDER)) {
    return circuitUnavailable(PROVIDER, 'OpenStreetMap Nominatim', NOMINATIM_HOME)
  }

  const upstream = new URL(NOMINATIM_REVERSE)
  upstream.searchParams.set('format', 'jsonv2')
  upstream.searchParams.set('lat', lat.toFixed(6))
  upstream.searchParams.set('lon', lon.toFixed(6))
  upstream.searchParams.set('accept-language', 'pt-BR')
  upstream.searchParams.set('zoom', '12')
  upstream.searchParams.set('addressdetails', '1')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  try {
    const res = await fetch(upstream, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AussyOntech/1.0',
        'Accept-Language': 'pt-BR',
      },
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)

    const data = await res.json()
    const address = data?.address || {}

    const result: ReverseGeocode = {
      city: address.city,
      town: address.town,
      village: address.village,
      municipality: address.municipality,
      county: address.county,
      state: address.state,
      stateCode: address['ISO3166-2-lvl4']?.split('-')[1],
      country: address.country,
      countryCode: address.country_code?.toUpperCase(),
      postcode: address.postcode,
      road: address.road,
      suburb: address.suburb,
      displayName: String(data?.display_name || ''),
    }

    const city = result.city || result.town || result.village || result.municipality || result.county || null
    recordProviderSuccess(PROVIDER)

    return NextResponse.json(
      {
        offline: false,
        dataQuality: 'live-geocode',
        freshness: 'live',
        source: 'OpenStreetMap Nominatim',
        sourceUrl: NOMINATIM_HOME,
        queriedAt: new Date().toISOString(),
        lat,
        lon,
        ...result,
        city,
        note: 'Resultado de geocodificação reversa. Coordenadas continuam sendo a referência primária; nomes de local podem variar conforme os dados do OpenStreetMap.',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    )
  } catch {
    recordProviderFailure(PROVIDER)
    return NextResponse.json(
      {
        offline: true,
        dataQuality: 'unavailable',
        freshness: 'unavailable',
        error: 'upstream-unavailable',
        source: 'OpenStreetMap Nominatim',
        sourceUrl: NOMINATIM_HOME,
        queriedAt: new Date().toISOString(),
        lat,
        lon,
        city: null,
        displayName: null,
        note: 'Nominatim indisponível nesta consulta. O Service Worker pode devolver a última resposta válida em cache.',
      },
      { status: 503 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
