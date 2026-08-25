import { NextRequest, NextResponse } from 'next/server'

/**
 * Previsão meteorológica operacional por coordenadas.
 *
 * O caminho `/api/cptec/forecast` é mantido por compatibilidade com o cliente e
 * com o Service Worker. A previsão é obtida do MET Norway Locationforecast 2.0,
 * serviço global que exige latitude/longitude reais e identificação do cliente.
 *
 * Regras de integridade:
 * - latitude/longitude são obrigatórias; nunca existe cidade padrão;
 * - campos ausentes permanecem `null`; nunca viram 0°C/0% artificialmente;
 * - os cartões representam janelas móveis de 24h, evitando inventar um fuso;
 * - falha do upstream retorna 503/unavailable para permitir last-known-good no SW.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 1800

const FORECAST_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact'
const SOURCE_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/documentation'
const USER_AGENT = 'AussyOntech/1.0 (+https://github.com/LorenzaVolponi/aussy-br-SOS)'
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

interface ForecastDay {
  date: string
  dayOfWeek: string
  periodLabel: string
  condition: string
  conditionLabel: string
  min: number | null
  max: number | null
  icon: string
  wind: string | null
  humidity: number | null
  rainProbability: number | null
}

interface MetSeriesEntry {
  time?: string
  data?: {
    instant?: { details?: Record<string, unknown> }
    next_1_hours?: {
      summary?: { symbol_code?: string }
      details?: Record<string, unknown>
    }
    next_6_hours?: {
      summary?: { symbol_code?: string }
      details?: Record<string, unknown>
    }
  }
}

const MET_CONDITIONS: Record<string, { label: string; icon: string }> = {
  clearsky: { label: 'Céu claro', icon: '☀️' },
  fair: { label: 'Poucas nuvens', icon: '🌤️' },
  partlycloudy: { label: 'Parcialmente nublado', icon: '⛅' },
  cloudy: { label: 'Nublado', icon: '☁️' },
  fog: { label: 'Nevoeiro', icon: '🌫️' },
  lightrainshowers: { label: 'Pancadas leves', icon: '🌦️' },
  rainshowers: { label: 'Pancadas de chuva', icon: '🌦️' },
  heavyrainshowers: { label: 'Pancadas fortes', icon: '🌧️' },
  lightrain: { label: 'Chuva leve', icon: '🌧️' },
  rain: { label: 'Chuva', icon: '🌧️' },
  heavyrain: { label: 'Chuva forte', icon: '🌧️' },
  rainshowersandthunder: { label: 'Pancadas e trovoadas', icon: '⛈️' },
  lightrainshowersandthunder: { label: 'Pancadas leves e trovoadas', icon: '⛈️' },
  heavyrainshowersandthunder: { label: 'Pancadas fortes e trovoadas', icon: '⛈️' },
  rainandthunder: { label: 'Chuva e trovoadas', icon: '⛈️' },
  lightrainandthunder: { label: 'Chuva leve e trovoadas', icon: '⛈️' },
  heavyrainandthunder: { label: 'Chuva forte e trovoadas', icon: '⛈️' },
  sleetshowers: { label: 'Pancadas de chuva e neve', icon: '🌨️' },
  sleet: { label: 'Chuva e neve', icon: '🌨️' },
  snowshowers: { label: 'Pancadas de neve', icon: '🌨️' },
  snow: { label: 'Neve', icon: '❄️' },
}

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function numeric(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeSymbol(value: unknown): string {
  return String(value || 'unknown')
    .toLowerCase()
    .replace(/_(day|night|polartwilight)$/i, '')
}

function dominantSymbol(entries: MetSeriesEntry[]): string {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const raw =
      entry.data?.next_1_hours?.summary?.symbol_code ||
      entry.data?.next_6_hours?.summary?.symbol_code
    if (!raw) continue
    const symbol = normalizeSymbol(raw)
    counts.set(symbol, (counts.get(symbol) || 0) + 1)
  }

  let winner = 'unknown'
  let max = -1
  for (const [symbol, count] of counts) {
    if (count > max) {
      winner = symbol
      max = count
    }
  }
  return winner
}

function average(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function rounded(value: number | null, digits = 0): number | null {
  if (value === null) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function buildRollingForecast(entries: MetSeriesEntry[]): ForecastDay[] {
  const valid = entries
    .filter((entry) => typeof entry.time === 'string' && Number.isFinite(Date.parse(entry.time)))
    .sort((a, b) => Date.parse(a.time as string) - Date.parse(b.time as string))

  if (!valid.length) return []

  const now = Date.now()
  const future = valid.filter((entry) => Date.parse(entry.time as string) >= now - 2 * HOUR_MS)
  const series = future.length ? future : valid
  const start = Date.parse(series[0].time as string)
  const buckets: MetSeriesEntry[][] = [[], [], [], []]

  for (const entry of series) {
    const timestamp = Date.parse(entry.time as string)
    const index = Math.floor((timestamp - start) / DAY_MS)
    if (index < 0) continue
    if (index > 3) break
    buckets[index].push(entry)
  }

  return buckets.flatMap((bucket, index): ForecastDay[] => {
    if (!bucket.length) return []

    const temperatures: number[] = []
    const humidities: number[] = []
    const winds: number[] = []
    const rainProbabilities: number[] = []

    for (const entry of bucket) {
      const details = entry.data?.instant?.details || {}
      const temperature = numeric(details.air_temperature)
      const humidity = numeric(details.relative_humidity)
      const wind = numeric(details.wind_speed)
      if (temperature !== null) temperatures.push(temperature)
      if (humidity !== null) humidities.push(humidity)
      if (wind !== null) winds.push(wind)

      const oneHour = numeric(entry.data?.next_1_hours?.details?.probability_of_precipitation)
      const sixHours = numeric(entry.data?.next_6_hours?.details?.probability_of_precipitation)
      const rain = oneHour ?? sixHours
      if (rain !== null) rainProbabilities.push(rain)
    }

    const firstTimestamp = bucket[0].time as string
    const date = new Date(firstTimestamp)
    const symbol = dominantSymbol(bucket)
    const condition = MET_CONDITIONS[symbol] || {
      label: symbol === 'unknown' ? 'Condição não informada' : symbol.replaceAll('_', ' '),
      icon: '🌡️',
    }
    const maxWind = winds.length ? Math.max(...winds) : null

    return [{
      date: firstTimestamp,
      dayOfWeek: DAY_NAMES[date.getUTCDay()] || '',
      periodLabel: index === 0 ? 'Próximas 24h' : `${index * 24}–${(index + 1) * 24}h`,
      condition: symbol.toUpperCase(),
      conditionLabel: condition.label,
      min: temperatures.length ? rounded(Math.min(...temperatures), 1) : null,
      max: temperatures.length ? rounded(Math.max(...temperatures), 1) : null,
      icon: condition.icon,
      wind: maxWind === null ? null : `até ${rounded(maxWind, 1)} m/s`,
      humidity: rounded(average(humidities)),
      rainProbability: rainProbabilities.length ? rounded(Math.max(...rainProbabilities)) : null,
    }]
  })
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const lat = parseCoordinate(searchParams.get('lat'), -90, 90)
  const lon = parseCoordinate(searchParams.get('lon'), -180, 180)

  if (lat === null || lon === null) {
    return NextResponse.json({
      source: 'MET Norway Locationforecast',
      sourceUrl: SOURCE_URL,
      queriedAt: new Date().toISOString(),
      center: null,
      city: null,
      days: [],
      total: 0,
      offline: false,
      error: 'invalid-location',
      dataQuality: 'unavailable',
      note: 'Latitude e longitude válidas são obrigatórias. Nenhuma cidade padrão é assumida.',
    }, { status: 400 })
  }

  const upstream = new URL(FORECAST_URL)
  upstream.searchParams.set('lat', lat.toFixed(4))
  upstream.searchParams.set('lon', lon.toFixed(4))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6500)

  try {
    const response = await fetch(upstream, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    })

    if (!response.ok) throw new Error(`MET Norway HTTP ${response.status}`)

    const payload = await response.json()
    const entries: MetSeriesEntry[] = Array.isArray(payload?.properties?.timeseries)
      ? payload.properties.timeseries
      : []
    const days = buildRollingForecast(entries)
    if (!days.length) throw new Error('MET Norway retornou série sem períodos utilizáveis')

    return NextResponse.json({
      source: 'MET Norway Locationforecast 2.0',
      sourceUrl: SOURCE_URL,
      attribution: 'Weather data: MET Norway',
      queriedAt: new Date().toISOString(),
      updatedAt: typeof payload?.properties?.meta?.updated_at === 'string'
        ? payload.properties.meta.updated_at
        : null,
      center: { lat, lon },
      city: null,
      days,
      total: days.length,
      offline: false,
      error: null,
      dataQuality: 'live-model-forecast',
      periodBasis: 'rolling-24h',
      note: 'Previsão por modelo meteorológico para as coordenadas atuais. Os cartões usam janelas móveis de 24h; nenhum fuso ou cidade é inferido pelo servidor.',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200',
      },
    })
  } catch {
    return NextResponse.json({
      source: 'MET Norway Locationforecast — indisponível',
      sourceUrl: SOURCE_URL,
      queriedAt: new Date().toISOString(),
      center: { lat, lon },
      city: null,
      days: [],
      total: 0,
      offline: false,
      error: 'upstream-unavailable',
      dataQuality: 'unavailable',
      note: 'Não foi possível confirmar uma previsão meteorológica nesta consulta. Nenhum valor sintético foi gerado; o Service Worker pode usar a última resposta válida em cache.',
    }, { status: 503 })
  } finally {
    clearTimeout(timeout)
  }
}
