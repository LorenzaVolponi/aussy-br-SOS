import { NextResponse } from 'next/server'

const VERIFIED_AT = '2026-08-18'
const ALERTS_PORTAL = 'https://www.gov.br/cemaden/pt-br/assuntos/monitoramento/alertas-em-tempo-real'
const RISK_FORECAST = 'https://www.gov.br/cemaden/pt-br/assuntos/monitoramento/previsao-de-riscos'
const GEORISK = 'https://georisk.cemaden.gov.br/'

/**
 * Safety boundary for the legacy CEMADEN route.
 *
 * The current route still references endpoints that are not documented as a
 * stable public CEMADEN API. Until route + UI are migrated to an official
 * contract, block that automation rather than returning an empty list that can
 * be misread as "no active alerts".
 */
export function proxy() {
  return NextResponse.json({
    online: false,
    automationAvailable: false,
    dataQuality: 'unavailable',
    error: 'automation-unavailable',
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
    note: 'A automação CEMADEN está desabilitada nesta build. Lista vazia NÃO significa ausência de alertas ativos; consulte os canais oficiais.',
  }, {
    status: 503,
    headers: {
      'Cache-Control': 'no-store',
      'X-Aussy-Data-Quality': 'unavailable',
      'X-Aussy-Safety-Block': 'cemaden-undocumented-api',
    },
  })
}

export const config = {
  matcher: ['/api/cemaden/alerts'],
}
