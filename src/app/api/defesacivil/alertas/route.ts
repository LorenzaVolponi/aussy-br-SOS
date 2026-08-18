import { NextResponse } from 'next/server'

/**
 * Defesa Civil — canais oficiais e estado seguro para alertas.
 *
 * Esta rota NÃO fabrica alertas sazonais e NÃO publica uma lista local de
 * telefones estaduais sem verificação. Alertas ativos devem vir de uma fonte
 * oficial confirmada ou da última cópia válida em cache.
 *
 * Referências verificadas em 17/08/2026:
 * - 199: Defesa Civil (código nacional de emergência / utilidade pública)
 * - 40199: cadastro de CEP para alertas por SMS
 * - Cell Broadcast: automático, sem cadastro, em aparelhos compatíveis 4G/5G
 * - WhatsApp Defesa Civil Alertas: (61) 2034-4611
 */

export const dynamic = 'force-dynamic'
export const revalidate = 1800

export async function GET() {
  return NextResponse.json({
    online: false,
    fonte: 'Defesa Civil Nacional / ANATEL / Ministério das Comunicações',
    dataQuality: 'official-channels-only',
    verifiedAt: '2026-08-17',
    emergencia_numero: '199',
    alertas: [],
    contatos: [
      {
        uf: 'BR',
        estado: 'Brasil',
        telefone: '199',
        email: null,
        site: 'https://www.gov.br/integracao/pt-br/assuntos/defesa-civil',
        coordenadoria: 'Defesa Civil — emergência',
      },
    ],
    alertChannels: {
      cellBroadcast: {
        registrationRequired: false,
        description: 'Defesa Civil Alerta via Cell Broadcast em aparelhos compatíveis conectados a redes 4G/5G na área afetada.',
      },
      sms: {
        number: '40199',
        instruction: 'Envie o CEP da área de interesse para 40199.',
      },
      whatsapp: {
        number: '+55 61 2034-4611',
        instruction: 'Envie “olá” e siga as orientações do canal Defesa Civil Alertas.',
      },
    },
    atualizado_em: new Date().toISOString(),
    sourceUrls: [
      'https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais/servicos-de-utilidade-publica-e-de-emergencia',
      'https://www.gov.br/anatel/pt-br/dados/utilidade-publica/alertas-de-desastres/defesa-civil-alerta',
      'https://www.gov.br/mcom/pt-br/noticias/noticias_alt/2026/julho/como-receber-alertas-da-defesa-civil-sobre-situacoes-de-emergencia-no-celular',
    ],
    observacao: 'Esta resposta contém canais oficiais, não um feed de alertas ativos. Nenhum alerta sazonal ou estimado é apresentado como ocorrência atual.',
  })
}
