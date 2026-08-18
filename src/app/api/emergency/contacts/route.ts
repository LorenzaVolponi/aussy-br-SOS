import { NextResponse } from 'next/server'
import { BRAZIL_EMERGENCY_NUMBERS } from '@/lib/data/satellites'
import { EMERGENCY_PHRASES } from '@/lib/data/first-aid'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    country: 'Brasil',
    dataQuality: 'verified-static',
    verifiedAt: '2026-08-18',
    source: 'ANATEL / Ministério da Saúde / Defesa Civil Nacional / Apple Support / Google Pixel Help',
    sourceUrls: [
      'https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais/servicos-de-utilidade-publica-e-de-emergencia',
      'https://www.gov.br/saude/pt-br/composicao/saes/samu-192',
      'https://www.gov.br/anatel/pt-br/dados/utilidade-publica/alertas-de-desastres/defesa-civil-alerta',
      'https://www.gov.br/mcom/pt-br/noticias/noticias_alt/2026/julho/como-receber-alertas-da-defesa-civil-sobre-situacoes-de-emergencia-no-celular',
      'https://support.apple.com/pt-br/101573',
      'https://support.google.com/pixelphone/answer/15254448?hl=pt-BR',
    ],
    numbers: BRAZIL_EMERGENCY_NUMBERS,
    phrases: EMERGENCY_PHRASES,
    smsBroadcast: {
      channel: 'automático',
      name: 'Defesa Civil Alerta',
      description: 'Cell Broadcast da Defesa Civil: dispensa cadastro e envia alertas a aparelhos compatíveis conectados às redes móveis 4G/5G na área afetada.',
      carriers: ['redes móveis 4G/5G compatíveis'],
      status: 'Ativo no Brasil; dispensa cadastro',
      smsRegistration: {
        number: '40199',
        instruction: 'Para alertas por SMS baseados em CEP, envie o CEP para 40199.',
      },
    },
    satelliteSos: {
      apple: {
        device: 'iPhone 14 ou posterior compatível',
        service: 'SOS de Emergência via Satélite',
        coverage: 'Não disponível oficialmente no Brasil em 18/08/2026',
        note: 'A lista oficial da Apple consultada nesta data não inclui o Brasil. A disponibilidade depende de região, regulamentação e requisitos do mercado.',
      },
      android: {
        device: 'Pixel 9 ou posterior compatível, exceto Pixel 9a',
        service: 'Satellite SOS',
        coverage: 'Não disponível oficialmente no Brasil em 18/08/2026',
        note: 'A lista oficial do Google consultada nesta data não inclui o Brasil. O recurso depende de dispositivo, software, região e cobertura do serviço.',
      },
      limitations: 'Não conte com SOS via satélite de smartphone no Brasil sem confirmação no próprio dispositivo. O Aussy não cria conectividade por satélite e não substitui cobertura celular, serviços oficiais nem um comunicador satelital dedicado.',
    },
  })
}
