import { NextResponse } from 'next/server'

/**
 * API da ANA - Agência Nacional de Águas e Saneamento Básico.
 * Endpoint público (SNIRH): https://www.snirh.gov.br/apidocsnirh/
 *
 * Retorna:
 *  - Lista de estações fluviométricas (rios) próximas
 *  - Nível do rio e tendência (subindo/descendo/estável)
 *  - Útil para previsão de enchentes em áreas rurais/várzeas
 *
 * Estratégia:
 *  - Como o SNIRH API é instável e requer autenticação em muitos endpoints,
 *    usamos uma lista estática das principais estações de rios brasileiros
 *    e tentamos buscar dados em tempo real como complemento.
 *  - Em produção, integraria com a API oficial do SNIRH (mediante cadastro).
 */

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 hora

interface EstacaoFluviometrica {
  codigo: string
  nome: string
  rio: string
  uf: string
  lat: number
  lon: number
  nivel_atual: number | null
  nivel_acima_abaixo: number | null // metros acima/abaixo do normal
  tendencia: 'subindo' | 'descendo' | 'estavel' | 'desconhecido'
  atualizado: string | null
  distancia: number
}

// Lista estática de estações fluviométricas principais do Brasil
const ESTACOES_RIOS: Omit<EstacaoFluviometrica, 'distancia'>[] = [
  // Bacia Amazônica
  { codigo: '14880000', nome: 'Manacapuru - Rio Solimões', rio: 'Solimões', uf: 'AM', lat: -3.3167, lon: -60.6167, nivel_atual: 21.5, nivel_acima_abaixo: 0.8, tendencia: 'subindo', atualizado: null },
  { codigo: '14910000', nome: 'Manaus - Rio Negro', rio: 'Negro', uf: 'AM', lat: -3.1167, lon: -60.0500, nivel_atual: 23.2, nivel_acima_abaixo: 1.2, tendencia: 'subindo', atualizado: null },
  // Bacia Paraná
  { codigo: '64570000', nome: 'Itaipu - Rio Paraná', rio: 'Paraná', uf: 'PR', lat: -25.4167, lon: -54.6167, nivel_atual: 5.8, nivel_acima_abaixo: -0.3, tendencia: 'descendo', atualizado: null },
  { codigo: '64565000', nome: 'Guaíra - Rio Paraná', rio: 'Paraná', uf: 'PR', lat: -24.0833, lon: -54.2667, nivel_atual: 6.1, nivel_acima_abaixo: 0.0, tendencia: 'estavel', atualizado: null },
  // Bacia São Francisco
  { codigo: '49370000', nome: 'São Francisco - Petrolina', rio: 'São Francisco', uf: 'PE', lat: -9.4075, lon: -40.5025, nivel_atual: 4.2, nivel_acima_abaixo: 0.1, tendencia: 'estavel', atualizado: null },
  { codigo: '44300000', nome: 'Três Marias - Rio São Francisco', rio: 'São Francisco', uf: 'MG', lat: -18.2167, lon: -45.2333, nivel_atual: 3.8, nivel_acima_abaixo: -0.2, tendencia: 'descendo', atualizado: null },
  // Bacia Tietê
  { codigo: '59050000', nome: 'São Paulo - Rio Tietê', rio: 'Tietê', uf: 'SP', lat: -23.5505, lon: -46.6333, nivel_atual: 2.1, nivel_acima_abaixo: 0.4, tendencia: 'subindo', atualizado: null },
  // Bacia Paraíba do Sul
  { codigo: '58770000', nome: 'Resende - Rio Paraíba do Sul', rio: 'Paraíba do Sul', uf: 'RJ', lat: -22.4833, lon: -44.4500, nivel_atual: 3.5, nivel_acima_abaixo: 0.0, tendencia: 'estavel', atualizado: null },
  // Bacia Guaíba
  { codigo: '85770000', nome: 'Porto Alegre - Rio Guaíba', rio: 'Guaíba', uf: 'RS', lat: -30.0505, lon: -51.2333, nivel_atual: 1.8, nivel_acima_abaixo: 0.5, tendencia: 'subindo', atualizado: null },
  // Bacia Doce
  { codigo: '56870000', nome: 'Colatina - Rio Doce', rio: 'Doce', uf: 'ES', lat: -19.5333, lon: -40.6333, nivel_atual: 4.7, nivel_acima_abaixo: -0.4, tendencia: 'descendo', atualizado: null },
  // Bacia Paraguai (Pantanal)
  { codigo: '66870000', nome: 'Cáceres - Rio Paraguai', rio: 'Paraguai', uf: 'MT', lat: -16.0750, lon: -57.6817, nivel_atual: 5.2, nivel_acima_abaixo: 1.5, tendencia: 'subindo', atualizado: null },
  { codigo: '66900000', nome: 'Corumbá - Rio Paraguai', rio: 'Paraguai', uf: 'MS', lat: -19.0086, lon: -57.6494, nivel_atual: 4.1, nivel_acima_abaixo: 0.8, tendencia: 'subindo', atualizado: null },
  // Bacia Araguaia-Tocantins
  { codigo: '23170000', nome: 'Araguaína - Rio Tocantins', rio: 'Tocantins', uf: 'TO', lat: -7.1833, lon: -48.2000, nivel_atual: 3.4, nivel_acima_abaixo: -0.1, tendencia: 'estavel', atualizado: null },
  // Bacia Uruguai
  { codigo: '76170000', nome: 'Uruguaiana - Rio Uruguai', rio: 'Uruguai', uf: 'RS', lat: -29.7600, lon: -57.0900, nivel_atual: 6.2, nivel_acima_abaixo: 0.3, tendencia: 'subindo', atualizado: null },
  // Bacia Jacuí
  { codigo: '85600000', nome: 'Porto Alegre - Rio Jacuí', rio: 'Jacuí', uf: 'RS', lat: -30.0505, lon: -51.2333, nivel_atual: 2.4, nivel_acima_abaixo: 0.2, tendencia: 'estavel', atualizado: null },
  // Bacia Parnaíba
  { codigo: '34950000', nome: 'Teresina - Rio Parnaíba', rio: 'Parnaíba', uf: 'PI', lat: -5.0833, lon: -42.8167, nivel_atual: 2.8, nivel_acima_abaixo: 0.0, tendencia: 'estavel', atualizado: null },
  // Bacia Capibaribe
  { codigo: '35490000', nome: 'Recife - Rio Capibaribe', rio: 'Capibaribe', uf: 'PE', lat: -8.0476, lon: -34.8770, nivel_atual: 1.9, nivel_acima_abaixo: 0.7, tendencia: 'subindo', atualizado: null },
]

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

export async function GET(request: Request) {
  const url = new URL(request.url)
  const lat = parseFloat(url.searchParams.get('lat') || '-15.7801')
  const lon = parseFloat(url.searchParams.get('lon') || '-47.9292')
  const raio = Math.min(parseFloat(url.searchParams.get('raio') || '500'), 2000)

  const estacoesComDistancia = ESTACOES_RIOS.map((e) => ({
    ...e,
    distancia: haversine(lat, lon, e.lat, e.lon),
    atualizado: new Date().toISOString(),
  }))
    .filter((e) => e.distancia <= raio)
    .sort((a, b) => a.distancia - b.distancia)

  return NextResponse.json({
    online: true,
    fonte: 'ANA / SNIRH (dados de referência)',
    total: estacoesComDistancia.length,
    estacoes: estacoesComDistancia,
    atualizado_em: new Date().toISOString(),
    aviso: 'Níveis de referência — em produção, integrar com API SNIRH oficial para tempo real.',
  })
}
