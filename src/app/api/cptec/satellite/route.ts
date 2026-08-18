import { NextResponse } from 'next/server'

/**
 * CPTEC/INPE — acesso seguro às imagens oficiais de satélite.
 *
 * A implementação anterior fabricava URLs HTTP a partir do relógio local e
 * marcava `online: true` sem verificar se a imagem existia. Em produção HTTPS,
 * isso ainda podia ser bloqueado como mixed content.
 *
 * Nesta build usamos apenas os portais HTTPS oficiais/verificados. Uma futura
 * integração de imagens deve descobrir/proxyar arquivos reais server-side e
 * só então publicá-los como `imagens[]`.
 */

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET() {
  return NextResponse.json({
    online: true,
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
    aviso: 'Nenhuma URL de imagem é gerada por estimativa nesta build. Use os portais oficiais para a imagem mais recente; o Aussy só voltará a embutir imagens quando conseguir validar e servir o arquivo real por HTTPS.',
  })
}
