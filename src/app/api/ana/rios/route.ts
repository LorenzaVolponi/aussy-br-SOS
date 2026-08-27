import { NextResponse } from 'next/server'

/**
 * Hidrologia — gateway para fontes oficiais brasileiras.
 *
 * O Aussy não possui nesta build uma credencial do HidroWebService capaz de
 * consultar níveis/tendências automaticamente. Em vez de manter uma lista local
 * de estações que pode envelhecer, esta rota expõe os canais oficiais que devem
 * ser consultados para rios, cheias, secas e alertas hidrológicos.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 86400

const SOURCES = [
  {
    id: 'sgb-sace',
    name: 'SGB · SACE',
    organization: 'Serviço Geológico do Brasil',
    url: 'https://www.sgb.gov.br/sace/',
    kind: 'monitoring-and-alerts',
    description: 'Monitoramento hidrológico, níveis de rios, bacias acompanhadas, boletins e alertas dos Sistemas de Alerta Hidrológico.',
    recommended: true,
  },
  {
    id: 'ana-monitoramento',
    name: 'ANA · Monitoramento Hidrológico',
    organization: 'Agência Nacional de Águas e Saneamento Básico',
    url: 'https://www.gov.br/ana/pt-br/assuntos/monitoramento-e-eventos-criticos/monitoramento-hidrologico',
    kind: 'official-systems',
    description: 'Acesso oficial a Telemetria, HidroWeb, HidroSat, reservatórios e demais sistemas de monitoramento da ANA.',
    recommended: true,
  },
  {
    id: 'ana-sala',
    name: 'ANA · Sala de Situação',
    organization: 'Agência Nacional de Águas e Saneamento Básico',
    url: 'https://www.gov.br/ana/pt-br/sala-de-situacao',
    kind: 'bulletins-and-critical-events',
    description: 'Boletins e acompanhamento de chuvas, níveis, vazões, secas e inundações em sistemas e bacias acompanhados.',
    recommended: true,
  },
  {
    id: 'ana-hidrowebservice',
    name: 'ANA · HidroWebService',
    organization: 'Sistema Nacional de Informações sobre Recursos Hídricos',
    url: 'https://www.ana.gov.br/hidrowebservice/swagger-ui/index.html',
    kind: 'authenticated-api',
    description: 'Documentação da integração oficial automatizada. O acesso operacional pode exigir autenticação/credencial própria.',
    recommended: false,
  },
] as const

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

  if (lat === null || lon === null) {
    return NextResponse.json({
      online: false,
      automationAvailable: false,
      dataQuality: 'unavailable',
      source: 'SGB / ANA',
      reference: null,
      sources: [],
      error: 'invalid-location',
      note: 'Latitude e longitude válidas são obrigatórias. Nenhuma cidade padrão é assumida.',
    }, { status: 400 })
  }

  return NextResponse.json({
    online: false,
    automationAvailable: false,
    dataQuality: 'official-portals-only',
    verifiedAt: '2026-08-27',
    source: 'SGB / ANA — fontes oficiais de hidrologia',
    reference: { lat, lon },
    sources: SOURCES,
    error: null,
    note: 'O Aussy não publica nível, vazão, tendência ou alerta de rio como dado ao vivo sem uma resposta oficial automatizada confirmada. Use SGB/SACE e os sistemas da ANA para a situação hidrológica atual.',
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
