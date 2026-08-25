import { NextResponse } from 'next/server'

/**
 * Focos de fogo ativo — Programa Queimadas / INPE.
 *
 * Fonte oficial de dados abertos:
 * https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/
 *
 * O diretório publica arquivos CSV em janelas de 10 minutos. A rota descobre
 * os arquivos mais recentes, agrega uma janela curta e filtra por distância.
 * Se a fonte estiver indisponível, NÃO cria focos sintéticos; o Service Worker
 * pode servir a última resposta real em cache.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 600

const INDEX_URL = 'https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/'
const SOURCE_URL = 'https://terrabrasilis.dpi.inpe.br/queimadas/portal/pages/secao_downloads/dados-abertos/index.html'

export interface FocoQueimada {
  id: string
  lat: number
  lon: number
  municipio: string
  uf: string
  bioma: string
  satellite: string
  dataHora: string
  distanciaKm?: number
  risco: 'Baixo' | 'Médio' | 'Alto' | 'Crítico'
}

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function boundedRadius(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 200
  return Math.min(Math.max(Math.round(parsed), 1), 1000)
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]).map(normalizeKey)
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })
}

function first(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (row[key] != null && row[key] !== '') return row[key]
  }
  return ''
}

function proximityRisk(distanceKm: number): FocoQueimada['risco'] {
  if (distanceKm <= 10) return 'Crítico'
  if (distanceKm <= 25) return 'Alto'
  if (distanceKm <= 75) return 'Médio'
  return 'Baixo'
}

async function fetchText(url: string, timeoutMs: number, accept: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: accept },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const lat = parseCoordinate(url.searchParams.get('lat'), -90, 90)
  const lon = parseCoordinate(url.searchParams.get('lon'), -180, 180)
  const raio = boundedRadius(url.searchParams.get('raio'))

  if (lat === null || lon === null) {
    return NextResponse.json({
      focos: [],
      total: 0,
      raio,
      referencia: null,
      cached: false,
      offline: false,
      error: 'invalid-location',
      dataQuality: 'unavailable',
      message: 'Latitude e longitude válidas são obrigatórias. Nenhuma cidade padrão é assumida.',
      fetchedAt: new Date().toISOString(),
      source: 'Programa Queimadas / INPE',
      sourceUrl: SOURCE_URL,
    }, { status: 400 })
  }

  try {
    const indexHtml = await fetchText(INDEX_URL, 6000, 'text/html')
    const filenames = [...indexHtml.matchAll(/href=["']?(focos_10min_\d{8}_\d{4}\.csv)["']?/g)]
      .map((match) => match[1])
      .filter((value, index, all) => all.indexOf(value) === index)
      .sort()
      .slice(-12)

    if (!filenames.length) throw new Error('INPE: nenhum CSV recente encontrado')

    const csvResults = await Promise.allSettled(filenames.map(async (filename) => ({
      filename,
      csv: await fetchText(
        `${INDEX_URL}${filename}`,
        5000,
        'text/csv,text/plain;q=0.9,*/*;q=0.1'
      ),
    })))

    const seen = new Set<string>()
    const focos: FocoQueimada[] = []

    for (const result of csvResults) {
      if (result.status !== 'fulfilled') continue
      for (const row of parseCsv(result.value.csv)) {
        const fLat = Number(first(row, ['latitude', 'lat']))
        const fLon = Number(first(row, ['longitude', 'lon', 'lng']))
        if (!Number.isFinite(fLat) || !Number.isFinite(fLon)) continue

        const distance = haversine(lat, lon, fLat, fLon)
        if (distance > raio) continue

        const timestamp = first(row, ['data_hora_gmt', 'data_hora', 'datahora', 'data']) || result.value.filename
        const satellite = first(row, ['satelite', 'satellite']) || 'não informado'
        const id = `${fLat.toFixed(5)}:${fLon.toFixed(5)}:${timestamp}:${satellite}`
        if (seen.has(id)) continue
        seen.add(id)

        focos.push({
          id,
          lat: fLat,
          lon: fLon,
          municipio: first(row, ['municipio', 'municipality']),
          uf: first(row, ['estado', 'uf']).toUpperCase(),
          bioma: first(row, ['bioma', 'biome']) || 'não informado',
          satellite,
          dataHora: timestamp,
          distanciaKm: Math.round(distance),
          risco: proximityRisk(distance),
        })
      }
    }

    focos.sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity))

    return NextResponse.json({
      focos: focos.slice(0, 100),
      total: focos.length,
      raio,
      referencia: { lat, lon },
      cached: false,
      offline: false,
      error: null,
      dataQuality: 'live-open-data',
      riskBasis: 'proximidade ao foco; não substitui avaliação oficial de risco de incêndio',
      fetchedAt: new Date().toISOString(),
      source: 'Programa Queimadas / INPE — CSV oficial de 10 minutos',
      sourceUrl: SOURCE_URL,
      filesUsed: csvResults.filter((result) => result.status === 'fulfilled').length,
    })
  } catch {
    return NextResponse.json({
      focos: [],
      total: 0,
      raio,
      referencia: { lat, lon },
      cached: false,
      offline: false,
      error: 'unavailable',
      dataQuality: 'unavailable',
      message: 'Não foi possível confirmar focos recentes no servidor oficial do INPE. Nenhum foco sintético foi gerado.',
      fetchedAt: new Date().toISOString(),
      source: 'Programa Queimadas / INPE — indisponível',
      sourceUrl: SOURCE_URL,
    }, { status: 503 })
  }
}
