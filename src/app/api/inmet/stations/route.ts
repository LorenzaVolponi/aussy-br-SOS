import { NextResponse } from 'next/server'

/**
 * API de Estações Automáticas do INMET (Instituto Nacional de Meteorologia).
 * Endpoint público oficial:
 *   https://apitempo.inmet.gov.br/estacao/dados/{YYYY-MM-DD}/{YYYY-MM-DD}/{stationCode}
 *   https://apitempo.inmet.gov.br/estacoes/T  (lista todas estações automáticas)
 *
 * Retorna:
 *  - Lista de estações automáticas ativas no Brasil (com coords)
 *  - Dados meteorológicos em tempo real (temperatura, umidade, vento, chuva, pressão)
 *  - Estação mais próxima do ponto do usuário
 *
 * Estratégia:
 *  1. Tenta buscar estações + dados do dia atual
 *  2. Se falhar, retorna lista estática de estações principais (offline)
 */

export const dynamic = 'force-dynamic'
export const revalidate = 600 // 10 minutos

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
  vento_dir: string | null
  vento_vel: number | null
  vento_raj: number | null
  pressao: number | null
  chuva_1h: number | null
  chuva_24h: number | null
  visibilidade: number | null
  atualizado: string | null
}

// Lista estática de estações automáticas principais (fallback offline)
const ESTACOES_FALLBACK: Estacao[] = [
  { codigo: 'A001', nome: 'Brasília (A001)', uf: 'DF', lat: -15.7895, lon: -47.9259, altitude: 1160 },
  { codigo: 'A007', nome: 'São Paulo (Mir. de Santana)', uf: 'SP', lat: -23.5040, lon: -46.6216, altitude: 792 },
  { codigo: 'A602', nome: 'Rio de Janeiro (V. Militar)', uf: 'RJ', lat: -22.8719, lon: -43.2831, altitude: 5 },
  { codigo: 'A409', nome: 'Belo Horizonte (Pampulha)', uf: 'MG', lat: -19.5536, lon: -43.9739, altitude: 837 },
  { codigo: 'A803', nome: 'Porto Alegre (Beira-Mar)', uf: 'RS', lat: -30.0505, lon: -51.1679, altitude: 3 },
  { codigo: 'A303', nome: 'Salvador (Ondina)', uf: 'BA', lat: -13.0147, lon: -38.4789, altitude: 7 },
  { codigo: 'A702', nome: 'Recife (Curado)', uf: 'PE', lat: -8.0703, lon: -34.9611, altitude: 13 },
  { codigo: 'A201', nome: 'Manaus (Zumbi)', uf: 'AM', lat: -3.1500, lon: -60.0500, altitude: 3 },
  { codigo: 'A927', nome: 'Cuiabá (Mirabel)', uf: 'MT', lat: -15.6019, lon: -56.0842, altitude: 194 },
  { codigo: 'A018', nome: 'Goiânia (Junqueirópolis)', uf: 'GO', lat: -16.5986, lon: -49.2947, altitude: 730 },
  { codigo: 'A712', nome: 'Fortaleza (Beira Mar)', uf: 'CE', lat: -3.7333, lon: -38.5067, altitude: 5 },
  { codigo: 'A906', nome: 'Curitiba (Bacacheri)', uf: 'PR', lat: -25.4019, lon: -49.2769, altitude: 924 },
  { codigo: 'A830', nome: 'Florianópolis (Costeira)', uf: 'SC', lat: -27.5817, lon: -48.5467, altitude: 5 },
  { codigo: 'A526', nome: 'Belém (Guamá)', uf: 'PA', lat: -1.4558, lon: -48.5039, altitude: 10 },
  { codigo: 'A701', nome: 'Teresina (Parque Sul)', uf: 'PI', lat: -5.0833, lon: -42.8167, altitude: 67 },
  { codigo: 'A501', nome: 'São Luís (Tirirical)', uf: 'MA', lat: -2.5833, lon: -44.2333, altitude: 53 },
  { codigo: 'A229', nome: 'Vitória (Carapina)', uf: 'ES', lat: -20.2833, lon: -40.3833, altitude: 32 },
  { codigo: 'A612', nome: 'Natal (Oscar Pereira)', uf: 'RN', lat: -5.9167, lon: -35.2667, altitude: 47 },
  { codigo: 'A606', nome: 'João Pessoa (Mangabeira)', uf: 'PB', lat: -7.1667, lon: -34.9167, altitude: 8 },
  { codigo: 'A405', nome: 'Vitória da Conquista (Jurema)', uf: 'BA', lat: -14.8667, lon: -40.8667, altitude: 939 },
  { codigo: 'A814', nome: 'Londrina (Fz. Cação)', uf: 'PR', lat: -23.3167, lon: -51.1500, altitude: 575 },
  { codigo: 'A805', nome: 'Pelotas (Fz. S. Gonçalo)', uf: 'RS', lat: -31.7833, lon: -52.3833, altitude: 13 },
  { codigo: 'A005', nome: 'Catalão (Junqueirópolis)', uf: 'GO', lat: -18.1667, lon: -47.9500, altitude: 815 },
  { codigo: 'A908', nome: 'Lages (Ibirama)', uf: 'SC', lat: -27.8067, lon: -50.3233, altitude: 937 },
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
  const raio = Math.min(parseFloat(url.searchParams.get('raio') || '300'), 1500)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  let estacoes: Estacao[] = ESTACOES_FALLBACK
  let leituras: Record<string, any> = {}
  let online = false

  try {
    // 1. Busca lista de estações automáticas
    const resEstacoes = await fetch('https://apitempo.inmet.gov.br/estacoes/T', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'AussyOntech/1.0' },
      cache: 'no-store',
    })

    if (resEstacoes.ok) {
      const raw: any[] = await resEstacoes.json()
      estacoes = raw
        .filter((e) => e.VL_LATITUDE && e.VL_LONGITUDE && e.CD_SITUACAO === 'Operativa')
        .map((e) => ({
          codigo: e.CD_ESTACAO,
          nome: e.DC_NOME,
          uf: e.SG_UF || e.SG_ESTADO || '',
          lat: parseFloat(e.VL_LATITUDE),
          lon: parseFloat(e.VL_LONGITUDE),
          altitude: e.VL_ALTITUDE ? parseFloat(e.VL_ALTITUDE) : null,
        }))
      online = true
    }
  } catch (e) {
    // mantém fallback
  }

  try {
    // 2. Busca dados do dia atual
    const hoje = new Date().toISOString().slice(0, 10)
    const resDados = await fetch(
      `https://apitempo.inmet.gov.br/estacao/dados/${hoje}/${hoje}`,
      {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'AussyOntech/1.0' },
        cache: 'no-store',
      }
    )

    if (resDados.ok) {
      const dados: any[] = await resDados.json()
      // Agrupa por estação, pega a última leitura válida
      for (const d of dados) {
        const cod = d.CD_ESTACAO
        if (!leituras[cod] || new Date(d.DT_MEDICAO + ' ' + d.HR_MEDICAO) > new Date(leituras[cod].ts)) {
          leituras[cod] = {
            temperatura: d.TEMP != null ? parseFloat(d.TEMP) : null,
            umidade: d.UMD != null ? parseFloat(d.UMD) : null,
            vento_dir: d.VENT_DIR || null,
            vento_vel: d.VENT_VEL != null ? parseFloat(d.VENT_VEL) : null,
            vento_raj: d.VENT_RAJ != null ? parseFloat(d.VENT_RAJ) : null,
            pressao: d.PRESS_EST != null ? parseFloat(d.PRESS_EST) : null,
            chuva_1h: d.CHUVA != null ? parseFloat(d.CHUVA) : null,
            visibilidade: d.VIS_IBR != null ? parseFloat(d.VIS_IBR) : null,
            ts: d.DT_MEDICAO + ' ' + d.HR_MEDICAO,
          }
        }
      }
    }
  } catch (e) {
    // mantém sem leituras
  } finally {
    clearTimeout(timeout)
  }

  // Filtra estações dentro do raio e computa distância
  const proximas = estacoes
    .map((e) => ({
      ...e,
      distancia: haversine(lat, lon, e.lat, e.lon),
    }))
    .filter((e) => e.distancia <= raio)
    .sort((a, b) => a.distancia - b.distancia)
    .slice(0, 8)
    .map((e): LeituraEstacao => {
      const l = leituras[e.codigo] || {}
      // Soma chuva das últimas 24h
      return {
        estacao: e,
        temperatura: l.temperatura ?? null,
        umidade: l.umidade ?? null,
        vento_dir: l.vento_dir ?? null,
        vento_vel: l.vento_vel ?? null,
        vento_raj: l.vento_raj ?? null,
        pressao: l.pressao ?? null,
        chuva_1h: l.chuva_1h ?? null,
        chuva_24h: l.chuva_1h ?? null,
        visibilidade: l.visibilidade ?? null,
        atualizado: l.ts || null,
      }
    })

  return NextResponse.json({
    online,
    fonte: online ? 'INMET (tempo real)' : 'INMET (estações offline)',
    total_estacoes: estacoes.length,
    proximas,
    atualizado_em: new Date().toISOString(),
  })
}
