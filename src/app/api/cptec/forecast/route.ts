import { NextRequest, NextResponse } from 'next/server'

/**
 * API: CPTEC/INPE — previsão do tempo para uma cidade.
 *
 * Regra de segurança: sem resposta confirmada do CPTEC, NÃO produzimos
 * temperatura, chuva, umidade ou condição sintética. O Service Worker pode
 * servir a última previsão real cacheada; sem cache, o cliente recebe
 * `days: []` + estado indisponível.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 3600

interface ForecastDay {
  date: string
  dayOfWeek: string
  condition: string
  conditionLabel: string
  min: number
  max: number
  icon: string
  wind: string
  humidity: number
  rainProbability?: number
}

const CONDITIONS: Record<string, string> = {
  ec: 'Encoberto com Chuvas',
  ci: 'Chuvas Isoladas',
  c: 'Chuva',
  in: 'Instável',
  pp: 'Poss.de Pancadas',
  cm: 'Chuva pela Manhã',
  cn: 'Chuva a Noite',
  pt: 'Pancadas a Tarde',
  pm: 'Pancadas pela Manhã',
  np: 'Nublado e Pancadas',
  pc: 'Pancadas de Chuva',
  hn: 'Chuva a Noite',
  n: 'Nublado',
  cl: 'Céu Claro',
  nv: 'Nevoeiro',
  g: 'Geada',
  ne: 'Neve',
  nd: 'Não Definido',
  pnt: 'Pancadas a Noite',
  ps: 'Pancadas pela Manhã',
  qa: 'Chuva a Tarde',
  ca: 'Chuva a Manhã',
  cv: 'Chuva a Noite',
  ct: 'Chuva a Tarde',
  ppn: 'Poss.panc.noite',
  ppt: 'Poss.panc.tarde',
  ppm: 'Poss.panc.manha',
}

const CONDITION_ICONS: Record<string, string> = {
  ec: '🌧️', ci: '🌦️', c: '🌧️', in: '⛈️', pp: '🌦️', cm: '🌧️',
  cn: '🌧️', pt: '🌦️', pm: '🌦️', np: '☁️', pc: '🌧️', hn: '🌧️',
  n: '☁️', cl: '☀️', nv: '🌫️', g: '❄️', ne: '❄️', nd: '❓',
  pnt: '🌧️', ps: '🌦️', qa: '🌧️', ca: '🌧️', cv: '🌧️', ct: '🌧️',
  ppn: '🌧️', ppt: '🌦️', ppm: '🌦️',
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const lat = parseFloat(searchParams.get('lat') || '-15.7801')
  const lon = parseFloat(searchParams.get('lon') || '-47.9292')

  try {
    const cityUrl = `https://servicos.cptec.inpe.br/API/v1/latitude/${lat.toFixed(4)}/${lon.toFixed(4)}`
    const ctrl1 = new AbortController()
    const t1 = setTimeout(() => ctrl1.abort(), 5000)
    const cityRes = await fetch(cityUrl, { signal: ctrl1.signal, cache: 'no-store' })
    clearTimeout(t1)

    if (!cityRes.ok) throw new Error(`CPTEC city HTTP ${cityRes.status}`)

    const cityData = await cityRes.json()
    const cityId = cityData?.id
    const cityName = cityData?.nome || 'Cidade desconhecida'
    const uf = cityData?.uf || ''

    if (!cityId) throw new Error('CPTEC: cidade não encontrada para estas coordenadas')

    const forecastUrl = `https://servicos.cptec.inpe.br/API/cptec/v1/cidade/${cityId}/previsao`
    const ctrl2 = new AbortController()
    const t2 = setTimeout(() => ctrl2.abort(), 6000)
    const fcRes = await fetch(forecastUrl, { signal: ctrl2.signal, cache: 'no-store' })
    clearTimeout(t2)

    if (!fcRes.ok) throw new Error(`CPTEC forecast HTTP ${fcRes.status}`)

    const fcData = await fcRes.json()
    const rawDays: any[] = []
    if (fcData?.previsao) rawDays.push(...fcData.previsao)
    if (fcData?.clima) rawDays.push(...fcData.clima)

    const days: ForecastDay[] = rawDays.slice(0, 4).map((d: any) => {
      const cond = (d.condicao || d.cond || 'nd').toLowerCase()
      const dateStr = d.data || d.dia || ''
      const date = new Date(dateStr + 'T12:00:00')
      return {
        date: dateStr,
        dayOfWeek: isNaN(date.getTime()) ? '' : DAY_NAMES[date.getDay()],
        condition: cond.toUpperCase(),
        conditionLabel: CONDITIONS[cond] || cond,
        min: parseInt(d.min || d.minima || '0', 10),
        max: parseInt(d.max || d.maxima || '0', 10),
        icon: CONDITION_ICONS[cond] || '🌡️',
        wind: d.vento || d.vento_dir || '',
        humidity: parseInt(d.umidade || '0', 10),
        rainProbability: d.chuva ? parseInt(d.chuva, 10) : undefined,
      }
    })

    return NextResponse.json({
      source: 'CPTEC/INPE — Centro de Previsão de Tempo e Estudos Climáticos',
      sourceUrl: 'https://cptec.inpe.br',
      queriedAt: new Date().toISOString(),
      center: { lat, lon },
      city: { id: cityId, name: cityName, uf },
      days,
      total: days.length,
      offline: false,
      error: null,
      dataQuality: 'live',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (err) {
    return NextResponse.json({
      source: 'CPTEC/INPE — indisponível',
      sourceUrl: 'https://cptec.inpe.br',
      queriedAt: new Date().toISOString(),
      center: { lat, lon },
      city: null,
      days: [],
      total: 0,
      offline: false,
      error: 'unavailable',
      dataQuality: 'unavailable',
      note: 'Não foi possível confirmar uma previsão no CPTEC. Nenhuma previsão sintética foi gerada.',
    }, { status: 503 })
  }
}
