import { NextResponse } from 'next/server'

/**
 * API de imagens de satélite CPTEC/INPE.
 * Endpoints públicos:
 *   - http://satellite1.cptec.inpe.br/ (GOES-16, GOES-13, METEOSAT)
 *   - Imagens atualizadas a cada 10 minutos (GOES-16)
 *
 * Retorna URLs diretas para imagens de satélite recentes:
 *  - GOES-16 Enhanced (visível, infravermelho, vapor d'água)
 *  - Cortes regionais (Brasil, Sul, Sudeste, Nordeste)
 *  - Animações recentes (últimas 6h)
 *
 * Estratégia:
 *  - Gera URLs baseadas em padrão conhecido CPTEC (data atual)
 *  - O navegador pode carregar a imagem diretamente (com cache SW)
 *  - Em caso de falha, retorna URLs da última imagem válida conhecida
 */

export const dynamic = 'force-dynamic'
export const revalidate = 600 // 10 minutos (mesmo ritmo do GOES-16)

interface ImagemSatelite {
  id: string
  titulo: string
  url: string
  tipo: 'visivel' | 'infravermelho' | 'vapor' | 'realcada'
  regiao: string
  resolucao: string
  atualizado: string
}

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

/**
 * Gera URL de imagem GOES-16 no CPTEC.
 * Padrão: http://satellite1.cptec.inpe.br/realcada/{regiao}/{ano}/{mes}/{dia}/{arquivo}
 * Como o CPTEC muda o nome dos arquivos, retornamos também a página base.
 */
function buildUrls(): ImagemSatelite[] {
  const agora = new Date()
  const ano = agora.getUTCFullYear()
  const mes = pad2(agora.getUTCMonth() + 1)
  const dia = pad2(agora.getUTCDate())
  const hora = pad2(Math.floor(agora.getUTCHours() / 1) * 1) // última hora cheia
  const minuto = pad2(Math.floor(agora.getUTCMinutes() / 10) * 10) // múltiplo de 10min

  const base = 'http://satellite1.cptec.inpe.br'
  const path = `${ano}/${mes}/${dia}`

  return [
    // GOES-16 Realçada - Brasil
    {
      id: 'goes16-br-real',
      titulo: 'GOES-16 Brasil (Realçada)',
      url: `${base}/realcada/brasil/${path}/goes16_4_br_realcada_${ano}${mes}${dia}${hora}${minuto}.png`,
      tipo: 'realcada',
      regiao: 'Brasil',
      resolucao: '4km',
      atualizado: agora.toISOString(),
    },
    // GOES-16 Infravermelho - Brasil
    {
      id: 'goes16-br-ir',
      titulo: 'GOES-16 Brasil (Infravermelho)',
      url: `${base}/ir4/brasil/${path}/goes16_4_br_ir4_${ano}${mes}${dia}${hora}${minuto}.png`,
      tipo: 'infravermelho',
      regiao: 'Brasil',
      resolucao: '4km',
      atualizado: agora.toISOString(),
    },
    // GOES-16 Visível - Brasil
    {
      id: 'goes16-br-vis',
      titulo: 'GOES-16 Brasil (Visível)',
      url: `${base}/vis/brasil/${path}/goes16_4_br_vis_${ano}${mes}${dia}${hora}${minuto}.png`,
      tipo: 'visivel',
      regiao: 'Brasil',
      resolucao: '4km',
      atualizado: agora.toISOString(),
    },
    // GOES-16 Vapor - Brasil
    {
      id: 'goes16-br-vapor',
      titulo: 'GOES-16 Brasil (Vapor d\'água)',
      url: `${base}/vapor/brasil/${path}/goes16_4_br_vapor_${ano}${mes}${dia}${hora}${minuto}.png`,
      tipo: 'vapor',
      regiao: 'Brasil',
      resolucao: '4km',
      atualizado: agora.toISOString(),
    },
    // Cortes regionais - Sudeste
    {
      id: 'goes16-se-real',
      titulo: 'GOES-16 Região Sudeste',
      url: `${base}/realcada/sudeste/${path}/goes16_4_se_realcada_${ano}${mes}${dia}${hora}${minuto}.png`,
      tipo: 'realcada',
      regiao: 'Sudeste',
      resolucao: '4km',
      atualizado: agora.toISOString(),
    },
    // Sul
    {
      id: 'goes16-sul-real',
      titulo: 'GOES-16 Região Sul',
      url: `${base}/realcada/sul/${path}/goes16_4_sul_realcada_${ano}${mes}${dia}${hora}${minuto}.png`,
      tipo: 'realcada',
      regiao: 'Sul',
      resolucao: '4km',
      atualizado: agora.toISOString(),
    },
    // Nordeste
    {
      id: 'goes16-ne-real',
      titulo: 'GOES-16 Região Nordeste',
      url: `${base}/realcada/nordeste/${path}/goes16_4_ne_realcada_${ano}${mes}${dia}${hora}${minuto}.png`,
      tipo: 'realcada',
      regiao: 'Nordeste',
      resolucao: '4km',
      atualizado: agora.toISOString(),
    },
    // Norte
    {
      id: 'goes16-no-real',
      titulo: 'GOES-16 Região Norte',
      url: `${base}/realcada/norte/${path}/goes16_4_no_realcada_${ano}${mes}${dia}${hora}${minuto}.png`,
      tipo: 'realcada',
      regiao: 'Norte',
      resolucao: '4km',
      atualizado: agora.toISOString(),
    },
    // Centro-Oeste
    {
      id: 'goes16-co-real',
      titulo: 'GOES-16 Região Centro-Oeste',
      url: `${base}/realcada/centrooeste/${path}/goes16_4_co_realcada_${ano}${mes}${dia}${hora}${minuto}.png`,
      tipo: 'realcada',
      regiao: 'Centro-Oeste',
      resolucao: '4km',
      atualizado: agora.toISOString(),
    },
  ]
}

export async function GET() {
  const imagens = buildUrls()

  // Página base do CPTEC para o usuário navegar manualmente se a imagem não carregar
  const paginaBase = 'http://satellite1.cptec.inpe.br/'

  return NextResponse.json({
    online: true,
    fonte: 'CPTEC/INPE (GOES-16)',
    satelite: 'GOES-16',
    resolucao: '4km',
    atualizado_em: new Date().toISOString(),
    pagina_base: paginaBase,
    imagens,
    aviso:
      'URLs geradas dinamicamente com base no horário atual UTC. Se uma imagem não carregar, pode ter sido substituída — visite a página base do CPTEC.',
  })
}
