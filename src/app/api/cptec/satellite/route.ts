import { NextResponse } from 'next/server'

/**
 * CPTEC/INPE — acesso seguro aos portais oficiais de satélite.
 *
 * A implementação anterior fabricava URLs HTTP a partir do relógio local e
 * marcava `online: true` sem verificar se a imagem existia. Em produção HTTPS,
 * isso ainda podia ser bloqueado como mixed content.
 *
 * Esta rota é deliberadamente uma referência de portais oficiais, não um feed.
 * Uma futura integração de imagens deve descobrir/proxyar arquivos reais
 * server-side e só então publicá-los como `imagens[]`.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET() {
  return NextResponse.json({
    online: false,
    automationAvailable: false,
    dataQuality: 'official-portal',
    verifiedAt: '2026-08-17',
    fonte: 'CPTEC/INPE — portais oficiais de sensoriamento remoto',
    satelite: 'GOES — consulte o produto ativo no portal CPTEC/INPE',
    resolucao: null,
    atualizado_em: null,
    pagina_base: 'https://sigma.cptec.inpe.br/',
    acervo: 'https://sigma.cptec.inpe.br/acervohd/',
    pagina_satelites: 'https://satelite.cptec.inpe.br/home/index.jsp',
    imagens: [],
    error: null,
    aviso: 'Consulta automatizada de imagens não está habilitada nesta build. Nenhuma URL ou timestamp é estimado; use os portais oficiais para consultar a imagem mais recente.',
  })
}
