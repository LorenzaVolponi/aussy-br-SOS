import { NextResponse } from 'next/server'

/**
 * Referência IBGE para municípios.
 *
 * A API oficial de Localidades documenta municípios e divisões
 * político-administrativas, mas não documenta coordenadas/centroides para a rota
 * `/localidades/municipios`. Por isso esta rota NÃO calcula mais “municípios
 * próximos” a partir de uma estrutura `view=geo` não documentada.
 *
 * Reverse geocoding operacional permanece em `/api/geocode`, com Nominatim e
 * last-known-good no Service Worker. Uma futura proximidade IBGE deve usar um
 * produto geoespacial oficial com latitude/longitude explicitamente documentadas.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 2592000

const LOCALIDADES_DOCS = 'https://servicodados.ibge.gov.br/api/docs/localidades'
const LOCALIDADES_PRODUCT = 'https://www.ibge.gov.br/estatisticas/multidominio/ciencia-tecnologia-e-inovacao/27385-localidades.html'

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const lat = parseCoordinate(url.searchParams.get('lat'), -90, 90)
  const lon = parseCoordinate(url.searchParams.get('lon'), -180, 180)

  return NextResponse.json(
    {
      dataQuality: 'reference-only',
      proximityAvailable: false,
      deprecatedBehaviorRemoved: true,
      requestedLocation: lat !== null && lon !== null ? { lat, lon } : null,
      total: 0,
      municipios: [],
      source: 'IBGE — API de Localidades / Localidades do Brasil',
      sourceDocs: LOCALIDADES_DOCS,
      sourceProduct: LOCALIDADES_PRODUCT,
      checkedAt: new Date().toISOString(),
      note: 'Proximidade municipal por coordenadas está desativada nesta build porque a API de Localidades não documenta `view=geo`, centroide ou latitude/longitude para `/municipios`. Nenhum município próximo é inferido ou fabricado.',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=2592000',
      },
    }
  )
}
