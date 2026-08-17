import { NextResponse } from 'next/server'

/**
 * API do IBGE - Serviço de Localidades.
 * Endpoint público oficial: https://servicodados.ibge.gov.br/api/v1/localidades
 *
 * Retorna:
 *  - Lista de municípios próximos ao ponto informado (com distância)
 *  - Estado, região e código IBGE
 *  - Útil para fallback de geocoding reverso offline
 *
 * Estratégia:
 *  - Busca todos os municípios (5570 cidades, ~600KB)
 *  - SW cacheia por 30 dias
 *  - Filtra os mais próximos do ponto do usuário
 */

export const dynamic = 'force-dynamic'
export const revalidate = 2592000 // 30 dias

interface Municipio {
  codigo_ibge: number
  nome: string
  uf: string
  estado: string
  regiao: string
  lat: number
  lon: number
  distancia: number
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const lat = parseFloat(url.searchParams.get('lat') || '-15.7801')
  const lon = parseFloat(url.searchParams.get('lon') || '-47.9292')
  const raio = Math.min(parseFloat(url.searchParams.get('raio') || '100'), 500)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '15', 10), 50)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    // Busca municípios com coords (centroides)
    // O IBGE oferece /municipios que retorna 5570 cidades
    const res = await fetch(
      'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=geo',
      {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'AussyOntech/1.0' },
        cache: 'no-store',
      }
    )

    clearTimeout(timeout)

    if (!res.ok) throw new Error(`IBGE retornou ${res.status}`)

    const raw: any[] = await res.json()

    const municipios: Municipio[] = raw
      .filter((m) => m?.municipio?.centroide?.coordinates)
      .map((m) => {
        const coords = m.municipio.centroide.coordinates // [lon, lat]
        const mlat = coords[1]
        const mlon = coords[0]
        return {
          codigo_ibge: m.municipio.id,
          nome: m.municipio.nome,
          uf: m.municipio.microrregiao?.mesorregiao?.UF?.sigla || '',
          estado: m.municipio.microrregiao?.mesorregiao?.UF?.nome || '',
          regiao: m.municipio.microrregiao?.mesorregiao?.UF?.regiao?.nome || '',
          lat: mlat,
          lon: mlon,
          distancia: haversine(lat, lon, mlat, mlon),
        }
      })
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, limit)

    return NextResponse.json({
      online: true,
      fonte: 'IBGE Localidades',
      total: municipios.length,
      municipios,
      atualizado_em: new Date().toISOString(),
    })
  } catch (err) {
    clearTimeout(timeout)
    return NextResponse.json(
      {
        online: false,
        erro: 'IBGE indisponível',
        municipios: [],
        atualizado_em: new Date().toISOString(),
      },
      { status: 200 } // retorna 200 com erro mesmo offline
    )
  }
}
