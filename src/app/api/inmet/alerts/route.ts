import { NextRequest, NextResponse } from 'next/server'
import {
  circuitUnavailable,
  enforceRateLimit,
  isCircuitOpen,
  recordProviderFailure,
  recordProviderSuccess,
} from '@/lib/api-resilience'

/**
 * Alertas meteorológicos do INMET.
 *
 * Sem upstream confirmado, esta rota não produz "nenhum alerta ativo" como se
 * fosse uma consulta bem-sucedida. Ela retorna 503/unavailable para permitir que
 * o Service Worker preserve e sinalize a última resposta válida, quando existir.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 1800

const ALERTS_API = 'https://apitempo.inmet.gov.br/alerta/v1/'
const ALERTS_PORTAL = 'https://alertas2.inmet.gov.br/'
const PROVIDER = 'inmet-alerts'

interface InmetAlert {
  aviso: string
  evento: string
  severidade: string
  descricao: string
  inicio: string
  fim: string
  uf: string
  municipios?: string[]
  cor: string
}

export async function GET(req: NextRequest) {
  const limited = enforceRateLimit(req, PROVIDER, { limit: 45, windowMs: 60_000 })
  if (limited) return limited
  if (isCircuitOpen(PROVIDER)) return circuitUnavailable(PROVIDER, 'INMET', ALERTS_PORTAL)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(ALERTS_API, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AussyOntech/1.0',
      },
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(`INMET retornou ${res.status}`)

    const raw = await res.json()
    if (!Array.isArray(raw)) throw new Error('INMET retornou alertas em formato inesperado')

    const alerts = raw.map((entry: any): InmetAlert => ({
      aviso: String(entry?.aviso || ''),
      evento: String(entry?.evento || 'Evento meteorológico'),
      severidade: String(entry?.severidade || ''),
      descricao: String(entry?.descricao || ''),
      inicio: String(entry?.inicio || ''),
      fim: String(entry?.fim || ''),
      uf: String(entry?.uf || ''),
      municipios: Array.isArray(entry?.municipios) ? entry.municipios.map(String) : [],
      cor: String(entry?.cor || '#f59e0b'),
    }))

    recordProviderSuccess(PROVIDER)
    const fetchedAt = new Date().toISOString()
    return NextResponse.json({
      online: true,
      dataQuality: 'live-alerts',
      freshness: 'live',
      alerts,
      total: alerts.length,
      cached: false,
      fetchedAt,
      source: 'INMET',
      sourceUrl: ALERTS_PORTAL,
      note: 'Resposta obtida do endpoint de alertas do INMET nesta requisição.',
    })
  } catch {
    recordProviderFailure(PROVIDER)
    return NextResponse.json(
      {
        online: false,
        dataQuality: 'unavailable',
        freshness: 'unavailable',
        alerts: [],
        total: 0,
        cached: false,
        error: 'upstream-unavailable',
        message: 'Não foi possível confirmar os alertas do INMET nesta requisição.',
        fetchedAt: new Date().toISOString(),
        source: 'INMET',
        sourceUrl: ALERTS_PORTAL,
        note: 'Nenhum estado "sem alertas" é inferido quando a fonte falha. Se houver última resposta válida, o Service Worker pode devolvê-la como CACHE.',
      },
      { status: 503 }
    )
  } finally {
    clearTimeout(timeout)
  }
}
