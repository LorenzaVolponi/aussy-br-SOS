import { NextResponse } from 'next/server'

/**
 * Proxy defensivo para alertas do CEMADEN.
 *
 * Regra de segurança: se nenhuma fonte responder, NÃO geramos alertas sazonais,
 * estimativas ou eventos sintéticos para municípios reais. O cliente recebe
 * `unavailable` e o Service Worker pode usar a última resposta válida em cache.
 *
 * Canal oficial de consulta em tempo real:
 * https://painelalertas.cemaden.gov.br
 */

export const dynamic = 'force-dynamic'
export const revalidate = 1800

export interface CemadenAlert {
  id: string
  municipio: string
  uf: string
  codIBGE: string
  evento: string
  severidade: 'Atenção' | 'Alerta' | 'Alerta Máximo'
  probabilidade: number
  inicio: string
  fim: string
  descricao: string
  chuvaAcumulada?: number
  chuvaPrevisao?: number
  lat?: number
  lon?: number
}

const ENDPOINTS = [
  'http://www2.cemaden.gov.br/api/v1/monitoramento/alertas',
  'http://www2.cemaden.gov.br/api/alerta/municipios.json',
]

function mapSeveridade(value: string): CemadenAlert['severidade'] {
  const lower = (value || '').toLowerCase()
  if (lower.includes('máximo') || lower.includes('maximo') || lower.includes('extremo') || lower.includes('alto')) return 'Alerta Máximo'
  if (lower.includes('alerta') || lower.includes('médio') || lower.includes('medio') || lower.includes('moderado')) return 'Alerta'
  return 'Atenção'
}

function normalize(data: unknown): CemadenAlert[] {
  if (!Array.isArray(data)) return []

  return data
    .map((raw: any): CemadenAlert => ({
      id: String(raw.id || raw.codigo || `${raw.municipio || raw.nomeMunicipio || ''}-${raw.evento || raw.tipoEvento || ''}-${raw.inicio || raw.dataInicio || ''}`),
      municipio: String(raw.municipio || raw.nomeMunicipio || raw.city || ''),
      uf: String(raw.uf || raw.UF || raw.estado || '').toUpperCase(),
      codIBGE: String(raw.codIBGE || raw.codigoIBGE || ''),
      evento: String(raw.evento || raw.tipoEvento || 'Monitoramento'),
      severidade: mapSeveridade(String(raw.severidade || raw.nivel || raw.risco || '')),
      probabilidade: Number(raw.probabilidade || raw.probabilidadeChuva || 0) || 0,
      inicio: String(raw.inicio || raw.dataInicio || ''),
      fim: String(raw.fim || raw.dataFim || ''),
      descricao: String(raw.descricao || raw.mensagem || ''),
      chuvaAcumulada: Number(raw.chuvaAcumulada || raw.chuva24h) || undefined,
      chuvaPrevisao: Number(raw.chuvaPrevisao || raw.previsao72h) || undefined,
      lat: Number(raw.lat || raw.latitude) || undefined,
      lon: Number(raw.lon || raw.longitude) || undefined,
    }))
    .filter((alert) => Boolean(alert.municipio || alert.evento))
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const uf = url.searchParams.get('uf')?.toUpperCase()
  const tipo = url.searchParams.get('tipo')?.toLowerCase()

  let rawAlerts: unknown[] | null = null
  let source: string | null = null

  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4500)

    try {
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'AussyOntech/1.0',
        },
        cache: 'no-store',
      })

      if (!response.ok) continue
      const payload = await response.json()
      rawAlerts = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.alertas)
          ? payload.alertas
          : Array.isArray(payload?.monitoramento)
            ? payload.monitoramento
            : []
      source = endpoint
      break
    } catch {
      // Tenta a próxima fonte. Nenhum dado sintético será criado.
    } finally {
      clearTimeout(timeout)
    }
  }

  if (rawAlerts === null || source === null) {
    return NextResponse.json({
      alerts: [],
      total: 0,
      error: 'unavailable',
      offline: false,
      dataQuality: 'unavailable',
      fetchedAt: new Date().toISOString(),
      source: 'CEMADEN — fonte ao vivo indisponível',
      officialPanel: 'https://painelalertas.cemaden.gov.br',
      message: 'Não foi possível confirmar alertas ativos no CEMADEN. Nenhum alerta sintético foi gerado.',
    }, { status: 503 })
  }

  const alerts = normalize(rawAlerts).filter((alert) => {
    if (uf && alert.uf !== uf) return false
    if (tipo && !alert.evento.toLowerCase().includes(tipo)) return false
    return true
  })

  return NextResponse.json({
    alerts,
    total: alerts.length,
    error: null,
    offline: false,
    dataQuality: 'live',
    fetchedAt: new Date().toISOString(),
    source: `CEMADEN (${source})`,
    officialPanel: 'https://painelalertas.cemaden.gov.br',
  })
}
