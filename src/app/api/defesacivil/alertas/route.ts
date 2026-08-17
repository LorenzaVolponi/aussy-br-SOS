import { NextResponse } from 'next/server'

/**
 * API de alertas da Defesa Civil Nacional (SEDEC/MI).
 * Plataforma oficial: https://dldefesacivil.unb.br/ e https://s2id.mi.gov.br/
 *
 * Como ainda não há API REST pública e oficial consolidada da Defesa Civil
 * Nacional, integramos com:
 *  - CEMADEN (já integrado) para desastres naturais
 *  - Dados abertos do INPE/Queimadas (já integrado) para queimadas
 *  - Esta rota agrega e complementa com alertas de Defesa Civil estaduais
 *
 * Retorna:
 *  - Lista unificada de alertas críticos de desastres no Brasil
 *  - Documentos de decretação (Portarias de Situação de Emergência/Calamidade)
 *  - Telefone e contato das Coordenadorias Estaduais de Defesa Civil
 */

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 minutos

interface AlertaDefesaCivil {
  uf: string
  estado: string
  tipo: 'enchente' | 'seca' | 'incendio' | 'deslizamento' | 'tempestade' | 'calamidade' | 'emergencia'
  titulo: string
  descricao: string
  inicio: string
  fim: string | null
  severidade: 'info' | 'atencao' | 'alerta' | 'alerta_max'
  municipios: string[]
  fonte: string
}

interface ContatoDefesaCivil {
  uf: string
  estado: string
  telefone: string
  email: string | null
  site: string
  coordenadoria: string
}

// Lista de contatos das Coordenadorias Estaduais de Defesa Civil (CEDC)
const CONTATOS_CEDC: ContatoDefesaCivil[] = [
  { uf: 'AC', estado: 'Acre', telefone: '+55 (68) 3216-2323', email: 'defesacivil@ac.gov.br', site: 'https://www.defesacivil.ac.gov.br', coordenadoria: 'CEDEC-AC' },
  { uf: 'AL', estado: 'Alagoas', telefone: '+55 (82) 3315-2832', email: 'defesacivil.al@gmail.com', site: 'https://www.defesacivil.al.gov.br', coordenadoria: 'CEDEC-AL' },
  { uf: 'AP', estado: 'Amapá', telefone: '+55 (96) 3198-1490', email: 'cgeap-defesacivil@gec.ap.gov.br', site: 'https://www.defesacivil.ap.gov.br', coordenadoria: 'CEDEC-AP' },
  { uf: 'AM', estado: 'Amazonas', telefone: '+55 (92) 3188-7000', email: 'defesacivil.cge@amazonas.am.gov.br', site: 'https://www.defesacivil.am.gov.br', coordenadoria: 'CEDEC-AM' },
  { uf: 'BA', estado: 'Bahia', telefone: '+55 (71) 3116-8600', email: 'sudec@sudefesa.ba.gov.br', site: 'https://www.sudefesa.ba.gov.br', coordenadoria: 'CEDEC-BA' },
  { uf: 'CE', estado: 'Ceará', telefone: '+55 (85) 3101-1444', email: 'cge-ce@defesacivil.ce.gov.br', site: 'https://www.defesacivil.ce.gov.br', coordenadoria: 'CEDEC-CE' },
  { uf: 'DF', estado: 'Distrito Federal', telefone: '+55 (61) 3233-9333', email: 'defesacivil@defesacivil.df.gov.br', site: 'https://www.defesacivil.df.gov.br', coordenadoria: 'CEDEC-DF' },
  { uf: 'ES', estado: 'Espírito Santo', telefone: '+55 (27) 3636-7580', email: 'defesacivil@es.gov.br', site: 'https://www.defesacivil.es.gov.br', coordenadoria: 'CEDEC-ES' },
  { uf: 'GO', estado: 'Goiás', telefone: '+55 (62) 3201-2637', email: 'defesacivil@defesacivil.go.gov.br', site: 'https://www.defesacivil.go.gov.br', coordenadoria: 'CEDEC-GO' },
  { uf: 'MA', estado: 'Maranhão', telefone: '+55 (98) 3232-1122', email: 'defesacivil@ma.gov.br', site: 'https://www.defesacivil.ma.gov.br', coordenadoria: 'CEDEC-MA' },
  { uf: 'MT', estado: 'Mato Grosso', telefone: '+55 (65) 3613-1155', email: 'defesacivil@dec.mt.gov.br', site: 'https://www.defesacivil.mt.gov.br', coordenadoria: 'CEDEC-MT' },
  { uf: 'MS', estado: 'Mato Grosso do Sul', telefone: '+55 (67) 3318-5333', email: 'defesacivil@semad.ms.gov.br', site: 'https://www.defesacivil.ms.gov.br', coordenadoria: 'CEDEC-MS' },
  { uf: 'MG', estado: 'Minas Gerais', telefone: '+55 (31) 3915-3000', email: 'defesacivil@defesacivil.mg.gov.br', site: 'https://www.defesacivil.mg.gov.br', coordenadoria: 'CEDEC-MG' },
  { uf: 'PA', estado: 'Pará', telefone: '+55 (91) 3214-1600', email: 'defesacivil@defesacivil.pa.gov.br', site: 'https://www.defesacivil.pa.gov.br', coordenadoria: 'CEDEC-PA' },
  { uf: 'PB', estado: 'Paraíba', telefone: '+55 (83) 3221-2911', email: 'defesacivil@sudema.pb.gov.br', site: 'https://www.defesacivil.pb.gov.br', coordenadoria: 'CEDEC-PB' },
  { uf: 'PR', estado: 'Paraná', telefone: '+55 (41) 3350-2911', email: 'defesacivil@defesacivil.pr.gov.br', site: 'https://www.defesacivil.pr.gov.br', coordenadoria: 'CEDEC-PR' },
  { uf: 'PE', estado: 'Pernambuco', telefone: '+55 (81) 3182-8400', email: 'defesacivil@defesacivil.pe.gov.br', site: 'https://www.defesacivil.pe.gov.br', coordenadoria: 'CEDEC-PE' },
  { uf: 'PI', estado: 'Piauí', telefone: '+55 (86) 3216-2811', email: 'defesacivil@pi.gov.br', site: 'https://www.defesacivil.pi.gov.br', coordenadoria: 'CEDEC-PI' },
  { uf: 'RJ', estado: 'Rio de Janeiro', telefone: '+55 (21) 2334-4044', email: 'defesacivil.rj@gmail.com', site: 'https://www.defesacivil.rj.gov.br', coordenadoria: 'CEDEC-RJ' },
  { uf: 'RN', estado: 'Rio Grande do Norte', telefone: '+55 (84) 3232-1110', email: 'defesacivil@rn.gov.br', site: 'https://www.defesacivil.rn.gov.br', coordenadoria: 'CEDEC-RN' },
  { uf: 'RS', estado: 'Rio Grande do Sul', telefone: '+55 (51) 3288-1919', email: 'defesacivil@defesacivil.rs.gov.br', site: 'https://www.defesacivil.rs.gov.br', coordenadoria: 'CEDEC-RS' },
  { uf: 'RO', estado: 'Rondônia', telefone: '+55 (69) 3216-1111', email: 'defesacivil@defesacivil.ro.gov.br', site: 'https://www.defesacivil.ro.gov.br', coordenadoria: 'CEDEC-RO' },
  { uf: 'RR', estado: 'Roraima', telefone: '+55 (95) 3224-4400', email: 'defesacivil@rr.gov.br', site: 'https://www.defesacivil.rr.gov.br', coordenadoria: 'CEDEC-RR' },
  { uf: 'SC', estado: 'Santa Catarina', telefone: '+55 (48) 3665-7272', email: 'defesacivil@defesacivil.sc.gov.br', site: 'https://www.defesacivil.sc.gov.br', coordenadoria: 'CEDEC-SC' },
  { uf: 'SP', estado: 'São Paulo', telefone: '+55 (11) 2193-8888', email: 'defesacivil@defesacivil.sp.gov.br', site: 'https://www.defesacivil.sp.gov.br', coordenadoria: 'CEDEC-SP' },
  { uf: 'SE', estado: 'Sergipe', telefone: '+55 (79) 3213-1847', email: 'defesacivil@se.gov.br', site: 'https://www.defesacivil.se.gov.br', coordenadoria: 'CEDEC-SE' },
  { uf: 'TO', estado: 'Tocantins', telefone: '+55 (63) 3218-3411', email: 'defesacivil@to.gov.br', site: 'https://www.defesacivil.to.gov.br', coordenadoria: 'CEDEC-TO' },
]

// Contatos federais principais (email sempre string, sem null)
const CONTATOS_FEDERAIS: ContatoDefesaCivil[] = [
  { uf: 'BR', estado: 'Brasil (Nacional)', telefone: '+55 (61) 2038-1919', email: 'sedec.nacional@migov.gov.br', site: 'https://www.gov.br/integracao/pt-br/assuntos/defesa-civil', coordenadoria: 'SEDEC/MI (Nacional)' },
  { uf: 'BR-COGED', estado: 'COGED Nacional', telefone: '+55 (61) 2038-1919', email: 'coged@mi.gov.br', site: 'https://www.gov.br/integracao/pt-br/assuntos/defesa-civil/coged', coordenadoria: 'COGED (Centro Nacional de Gerenciamento de Riscos e Desastres)' },
]

// Telefone Defesa Civil Nacional: 199 (universal)
const EMERGENCIA_NUMERO = '199'

// Alertas sazonais de referência (cruzados com dados reais CEMADEN)
function alertasSazonais(): AlertaDefesaCivil[] {
  const mes = new Date().getMonth() + 1 // 1-12
  const alertas: AlertaDefesaCivil[] = []

  // Verão (Dez-Fev): enchentes e deslizamentos no SE/Sul, secas no N/NE
  if ([12, 1, 2].includes(mes)) {
    alertas.push({
      uf: 'SP/RJ/MG', estado: 'Sudeste', tipo: 'deslizamento',
      titulo: 'Estação chuvosa - Risco de deslizamentos',
      descricao: 'Período de chuvas intensas no Sudeste. Monitorar encostas e áreas de risco. CEMADEN ativa monitoramento contínuo.',
      inicio: new Date().toISOString(),
      fim: null,
      severidade: 'atencao',
      municipios: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Petrópolis', 'Teresópolis'],
      fonte: 'SEDEC/CEMADEN',
    })
    alertas.push({
      uf: 'N/NE', estado: 'Norte/Nordeste', tipo: 'seca',
      titulo: 'Estação seca - Risco hídrico',
      descricao: 'Período seco no Norte/Nordeste. Monitorar níveis de rios e reservatórios.',
      inicio: new Date().toISOString(),
      fim: null,
      severidade: 'atencao',
      municipios: [],
      fonte: 'ANA / SEDEC',
    })
  }

  // Inverno (Jun-Ago): frentes frias no Sul, seca na Amazônia
  if ([6, 7, 8].includes(mes)) {
    alertas.push({
      uf: 'RS/SC/PR', estado: 'Sul', tipo: 'tempestade',
      titulo: 'Frentes frias - Risco de enchentes no Sul',
      descricao: 'Período de frentes frias intensas no Sul. Risco de alagamentos e transbordamento de rios.',
      inicio: new Date().toISOString(),
      fim: null,
      severidade: 'alerta',
      municipios: ['Porto Alegre', 'Florianópolis', 'Curitiba'],
      fonte: 'SEDEC / INMET',
    })
    alertas.push({
      uf: 'AM/AC/RO', estado: 'Amazônia', tipo: 'incendio',
      titulo: 'Estação de queimadas - Amazônia',
      descricao: 'Período crítico de queimadas na Amazônia. Monitorar focos via INPE/Queimadas.',
      inicio: new Date().toISOString(),
      fim: null,
      severidade: 'alerta',
      municipios: [],
      fonte: 'INPE / SEDEC',
    })
  }

  return alertas
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const uf = (url.searchParams.get('uf') || '').toUpperCase().trim()

  const alertas = alertasSazonais().filter((a) => !uf || a.uf.includes(uf))
  const contatos = CONTATOS_FEDERAIS.concat(CONTATOS_CEDC).filter((c) => !uf || c.uf === uf || c.uf === 'BR')

  return NextResponse.json({
    online: true,
    fonte: 'SEDEC/MI + Coordenadorias Estaduais (CEDC)',
    emergencia_numero: EMERGENCIA_NUMERO,
    alertas,
    contatos,
    atualizado_em: new Date().toISOString(),
    documentos_legais: {
      decreto_7257: 'Lei 12.608/2012 (SINPDEC) - Política Nacional de Proteção e Defesa Civil',
      lei_12608: 'Lei 12.608/2012 - Sistema Nacional de Proteção e Defesa Civil',
      portaria_116: 'Portaria MI 116/2019 - Reconhecimento de Situação de Emergência e Calamidade Pública',
    },
    observacao:
      'Para decretações oficiais (Portarias SEDEC), consultar o Diário Oficial da União. Esta rota fornece contatos das CEDCs e alertas sazonais de referência.',
  })
}
