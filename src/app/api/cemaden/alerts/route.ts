import { NextResponse } from 'next/server'

const VERIFIED_AT = '2026-08-18'
const ALERTS_PORTAL = 'https://www.gov.br/cemaden/pt-br/assuntos/monitoramento/alertas-em-tempo-real'
const RISK_FORECAST = 'https://www.gov.br/cemaden/pt-br/assuntos/monitoramento/previsao-de-riscos'
const GEORISK = 'https://georisk.cemaden.gov.br/'

export const dynamic = 'force-dynamic'

/**
 * Contrato oficial de referência CEMADEN.
 *
 * Esta build NÃO automatiza alertas a partir de endpoints não documentados como
 * API pública estável. A lista vazia abaixo é deliberadamente "não aplicável":
 * ela nunca deve ser interpretada como ausência de alertas ativos.
 */
export async function GET() {
  return NextResponse.json({
    online: false,
    automationAvailable: false,
    dataQuality: 'official-portal',
    error: null,
    source: 'CEMADEN / MCTI',
    sourceUrl: ALERTS_PORTAL,
    verifiedAt: VERIFIED_AT,
    alerts: [],
    total: 0,
    portals: [
      { name: 'Alertas em Tempo Real', url: ALERTS_PORTAL },
      { name: 'Previsão de Riscos', url: RISK_FORECAST },
      { name: 'GeoRisk', url: GEORISK },
    ],
    message: 'Consulta automatizada de alertas CEMADEN não está habilitada nesta build.',
    note: 'Lista vazia NÃO significa ausência de alertas ativos. Consulte os canais oficiais do CEMADEN/MCTI.',
    fetchedAt: new Date().toISOString(),
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Aussy-Data-Quality': 'official-portal',
    },
  })
}
