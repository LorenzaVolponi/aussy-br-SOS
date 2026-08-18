import { NextResponse } from 'next/server'

/**
 * Estações automáticas do INMET.
 *
 * Regras de integridade:
 * - coordenadas do usuário são obrigatórias; nunca usamos Brasília como fallback;
 * - sem catálogo oficial, não fabricamos nem promovemos lista estática como estação atual;
 * - catálogo oficial e observações têm estados separados;
 * - chuva_24h permanece null até existir cálculo real de janela de 24h;
 * - vento é mantido na unidade publicada pelo INMET para estações automáticas: m/s;
 * - sentinelas de indisponibilidade do INMET (9999/Null/vazio) viram null;
 * - o Service Worker pode devolver a última resposta válida quando o upstream degrada.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 600

const STATIONS_URL = 'https://apitempo.inmet.gov.br/estacoes/T'
const OBSERVATIONS_BASE = 'https://apitempo.inmet.gov.br/estacao/dados'
const SOURCE_PORTAL = 'https://portal.inmet.gov.br/'

interface Estacao {
  codigo: string
  nome: string
  uf: string
  lat: number
  lon: number
  altitude: number | null
}

interface LeituraEstacao {
  estacao: Estacao
  temperatura: number | null
  umidade: number | null
  vento_dir: number | null
  vento_vel: number | null
  vento_raj: number | null
  pressao: number | null
  chuva_1h: number | null
  chuva_24h: null
  visibilidade: number | null
  atualizado: string | null
}

interface LatestReading {
  temperatura: number | null
  umidade: number | null
  vento_dir: number | null
  vento_vel: number | null
  vento_raj: number | null
  pressao: number | null
  chuva_1h: number | null
  visibilidade: number | null
  atualizado: string | null
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim().replace(',', '.')
  if (!normalized || normalized.toLowerCase() === 'null') return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed === 9999) return null
  return parsed
}

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function measurementIso(dateValue: unknown, hourValue: unknown): string | null {
  const date = String(dateValue || '').slice(0, 10)
  const digits = String(hourValue ?? '').replace(/\D/g, '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !digits) return null

  const hhmm = digits.padStart(4, '0').slice(0, 4)
  const hour = Number(hhmm.slice(0, 2))
  const minute = Number(hhmm.slice(2, 4))
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return null

  const iso = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
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

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AussyOntech/1.0',
      },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`INMET retornou ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const lat = parseCoordinate(url.searchParams.get('lat'), -90, 90)
  const lon = parseCoordinate(url.searchParams.get('lon'), -180, 180)
  const raioRaw = Number(url.searchParams.get('raio') || '300')
  const raio = Number.isFinite(raioRaw) ? Math.min(Math.max(raioRaw, 1), 1500) : 300

  if (lat === null || lon === null) {
    return NextResponse.json(
      {
        online: false,
        catalogLive: false,
        observationsLive: false,
        dataQuality: 'unavailable',
        fonte: 'INMET',
        sourceUrl: SOURCE_PORTAL,
        total_estacoes: 0,
        proximas: [],
        fetchedAt: new Date().toISOString(),
        error: 'invalid-location',
        note: 'Latitude e longitude válidas são obrigatórias. Nenhuma cidade padrão é assumida.',
      },
      { status: 400 }
    )
  }

  let estacoes: Estacao[] = []

  try {
    const raw = await fetchJson(STATIONS_URL, 6000)
    if (!Array.isArray(raw)) throw new Error('Catálogo INMET em formato inesperado')

    estacoes = raw
      .map((entry: any): Estacao | null => {
        const stationLat = toNumber(entry?.VL_LATITUDE)
        const stationLon = toNumber(entry?.VL_LONGITUDE)
        if (stationLat === null || stationLon === null) return null

        const status = String(entry?.CD_SITUACAO || '').trim().toLowerCase()
        const isOperational = status === 'operante' || status === 'operativa'
        if (!isOperational) return null

        return {
          codigo: String(entry?.CD_ESTACAO || '').trim(),
          nome: String(entry?.DC_NOME || entry?.CD_ESTACAO || 'Estação INMET').trim(),
          uf: String(entry?.SG_UF || entry?.SG_ESTADO || '').trim(),
          lat: stationLat,
          lon: stationLon,
          altitude: toNumber(entry?.VL_ALTITUDE),
        }
      })
      .filter((entry): entry is Estacao => Boolean(entry?.codigo))
  } catch {
    return NextResponse.json(
      {
        online: false,
        catalogLive: false,
        observationsLive: false,
        dataQuality: 'unavailable',
        fonte: 'INMET — catálogo indisponível',
        sourceUrl: SOURCE_PORTAL,
        total_estacoes: 0,
        proximas: [],
        fetchedAt: new Date().toISOString(),
        error: 'upstream-unavailable',
        note: 'Nenhuma estação sintética ou lista local foi apresentada como dado atual. O Service Worker pode usar a última resposta válida em cache.',
      },
      { status: 503 }
    )
  }

  const leituras: Record<string, LatestReading> = {}
  let observationsLive = false

  try {
    const hoje = new Date().toISOString().slice(0, 10)
    const raw = await fetchJson(`${OBSERVATIONS_BASE}/${hoje}/${hoje}`, 8000)
    if (!Array.isArray(raw)) throw new Error('Observações INMET em formato inesperado')

    for (const entry of raw as any[]) {
      const codigo = String(entry?.CD_ESTACAO || '').trim()
      if (!codigo) continue

      const atualizado = measurementIso(entry?.DT_MEDICAO, entry?.HR_MEDICAO)
      const previous = leituras[codigo]
      if (previous?.atualizado && atualizado && previous.atualizado >= atualizado) continue
      if (previous && !atualizado) continue

      const leitura: LatestReading = {
        temperatura: toNumber(entry?.TEMP),
        umidade: toNumber(entry?.UMD),
        vento_dir: toNumber(entry?.VENT_DIR),
        vento_vel: toNumber(entry?.VENT_VEL),
        vento_raj: toNumber(entry?.VENT_RAJ),
        pressao: toNumber(entry?.PRESS_EST),
        chuva_1h: toNumber(entry?.CHUVA),
        visibilidade: toNumber(entry?.VIS_IBR),
        atualizado,
      }

      const hasMeasurement = [
        leitura.temperatura,
        leitura.umidade,
        leitura.vento_dir,
        leitura.vento_vel,
        leitura.vento_raj,
        leitura.pressao,
        leitura.chuva_1h,
        leitura.visibilidade,
      ].some((value) => value !== null)

      if (hasMeasurement || atualizado) leituras[codigo] = leitura
    }

    observationsLive = Object.keys(leituras).length > 0
  } catch {
    observationsLive = false
  }

  const proximas = estacoes
    .map((estacao) => ({
      ...estacao,
      distancia: haversine(lat, lon, estacao.lat, estacao.lon),
    }))
    .filter((estacao) => estacao.distancia <= raio)
    .sort((a, b) => a.distancia - b.distancia)
    .slice(0, 8)
    .map((estacao): LeituraEstacao => {
      const leitura = observationsLive ? leituras[estacao.codigo] : undefined
      return {
        estacao,
        temperatura: leitura?.temperatura ?? null,
        umidade: leitura?.umidade ?? null,
        vento_dir: leitura?.vento_dir ?? null,
        vento_vel: leitura?.vento_vel ?? null,
        vento_raj: leitura?.vento_raj ?? null,
        pressao: leitura?.pressao ?? null,
        chuva_1h: leitura?.chuva_1h ?? null,
        chuva_24h: null,
        visibilidade: leitura?.visibilidade ?? null,
        atualizado: leitura?.atualizado ?? null,
      }
    })

  return NextResponse.json({
    online: observationsLive,
    catalogLive: true,
    observationsLive,
    dataQuality: observationsLive ? 'live-observations' : 'live-catalog',
    fonte: observationsLive
      ? 'INMET — catálogo e observações consultados'
      : 'INMET — catálogo consultado; observações indisponíveis',
    sourceUrl: SOURCE_PORTAL,
    total_estacoes: estacoes.length,
    proximas,
    fetchedAt: new Date().toISOString(),
    note: observationsLive
      ? 'Vento e rajada em m/s. Chuva representa o acumulado horário informado pela estação. Chuva em 24h não é inferida a partir de 1h. Valores 9999/Null/vazios são tratados como indisponíveis.'
      : 'Localizações vêm do catálogo oficial consultado nesta requisição, mas não há observações meteorológicas utilizáveis nesta resposta.',
  })
}
