import { NextResponse } from 'next/server'

/**
 * ANA / SNIRH — estações fluviométricas de referência.
 *
 * Regra de segurança: esta build NÃO possui credencial para o HidroWebservice
 * autenticado da ANA. Portanto, esta rota oferece somente referências locais
 * de posição/nome de algumas estações e NUNCA publica nível, tendência ou
 * atualização inventados como telemetria atual.
 *
 * Integração oficial para dados hidrológicos automatizados:
 * https://www.snirh.gov.br/hidrowebservice/swagger-ui/index.html
 */

export const dynamic = 'force-dynamic'
export const revalidate = 86400

type Tendencia = 'desconhecido'

interface EstacaoReferencia {
  codigo: string
  nome: string
  rio: string
  uf: string
  lat: number
  lon: number
}

interface EstacaoFluviometrica extends EstacaoReferencia {
  nivel_atual: null
  nivel_acima_abaixo: null
  tendencia: Tendencia
  atualizado: null
  distancia: number
}

const ESTACOES_REFERENCIA: EstacaoReferencia[] = [
  { codigo: '14880000', nome: 'Manacapuru - Rio Solimões', rio: 'Solimões', uf: 'AM', lat: -3.3167, lon: -60.6167 },
  { codigo: '14910000', nome: 'Manaus - Rio Negro', rio: 'Negro', uf: 'AM', lat: -3.1167, lon: -60.05 },
  { codigo: '64570000', nome: 'Itaipu - Rio Paraná', rio: 'Paraná', uf: 'PR', lat: -25.4167, lon: -54.6167 },
  { codigo: '64565000', nome: 'Guaíra - Rio Paraná', rio: 'Paraná', uf: 'PR', lat: -24.0833, lon: -54.2667 },
  { codigo: '49370000', nome: 'São Francisco - Petrolina', rio: 'São Francisco', uf: 'PE', lat: -9.4075, lon: -40.5025 },
  { codigo: '44300000', nome: 'Três Marias - Rio São Francisco', rio: 'São Francisco', uf: 'MG', lat: -18.2167, lon: -45.2333 },
  { codigo: '59050000', nome: 'São Paulo - Rio Tietê', rio: 'Tietê', uf: 'SP', lat: -23.5505, lon: -46.6333 },
  { codigo: '58770000', nome: 'Resende - Rio Paraíba do Sul', rio: 'Paraíba do Sul', uf: 'RJ', lat: -22.4833, lon: -44.45 },
  { codigo: '85770000', nome: 'Porto Alegre - Guaíba', rio: 'Guaíba', uf: 'RS', lat: -30.0505, lon: -51.2333 },
  { codigo: '56870000', nome: 'Colatina - Rio Doce', rio: 'Doce', uf: 'ES', lat: -19.5333, lon: -40.6333 },
  { codigo: '66870000', nome: 'Cáceres - Rio Paraguai', rio: 'Paraguai', uf: 'MT', lat: -16.075, lon: -57.6817 },
  { codigo: '66900000', nome: 'Corumbá - Rio Paraguai', rio: 'Paraguai', uf: 'MS', lat: -19.0086, lon: -57.6494 },
  { codigo: '23170000', nome: 'Araguaína - Rio Tocantins', rio: 'Tocantins', uf: 'TO', lat: -7.1833, lon: -48.2 },
  { codigo: '76170000', nome: 'Uruguaiana - Rio Uruguai', rio: 'Uruguai', uf: 'RS', lat: -29.76, lon: -57.09 },
  { codigo: '34950000', nome: 'Teresina - Rio Parnaíba', rio: 'Parnaíba', uf: 'PI', lat: -5.0833, lon: -42.8167 },
  { codigo: '35490000', nome: 'Recife - Rio Capibaribe', rio: 'Capibaribe', uf: 'PE', lat: -8.0476, lon: -34.877 },
]

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const lat = parseFloat(url.searchParams.get('lat') || '-15.7801')
  const lon = parseFloat(url.searchParams.get('lon') || '-47.9292')
  const raio = Math.min(Math.max(parseFloat(url.searchParams.get('raio') || '500'), 1), 2000)

  const estacoes: EstacaoFluviometrica[] = ESTACOES_REFERENCIA
    .map((estacao) => ({
      ...estacao,
      nivel_atual: null,
      nivel_acima_abaixo: null,
      tendencia: 'desconhecido' as const,
      atualizado: null,
      distancia: haversine(lat, lon, estacao.lat, estacao.lon),
    }))
    .filter((estacao) => estacao.distancia <= raio)
    .sort((a, b) => a.distancia - b.distancia)

  return NextResponse.json({
    online: false,
    dataQuality: 'reference-location-only',
    verifiedAt: '2026-08-17',
    fonte: 'Referência local de estações — não é telemetria ANA em tempo real',
    total: estacoes.length,
    estacoes,
    atualizado_em: null,
    officialApi: 'https://www.snirh.gov.br/hidrowebservice/swagger-ui/index.html',
    aviso: 'Níveis e tendências foram desativados nesta build. Dados hidrológicos automatizados em tempo real exigem integração oficial/autenticada com o HidroWebservice da ANA.',
  })
}
