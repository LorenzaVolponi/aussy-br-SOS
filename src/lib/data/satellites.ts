// Catálogo local de referências satelitais e utilidades brasileiras.
// Revisão de confiança: 2026-08-18.
//
// REGRA: contagem de satélites, cobertura comercial, preço, parceiros, aparelhos,
// disponibilidade regional e status D2D/D2C mudam rapidamente. Esses campos não
// devem ser apresentados como atuais sem consulta a fonte oficial + data.

export interface SatelliteConstellation {
  id: string;
  name: string;
  operator: string;
  type: 'D2C' | 'LEO-broadband' | 'GEO' | 'M2M' | 'legacy';
  orbit: 'LEO' | 'MEO' | 'GEO';
  constellationSize: number | null;
  activeSatellites: number | null;
  frequency: string;
  band: string;
  d2cCompatible: boolean;
  partners: string[];
  coverage: string;
  status: 'operational' | 'testing' | 'planned' | 'limited' | 'unknown';
  launchYear: number | null;
  services: string[];
  celestrakGroup?: string;
  description: string;
  techDetails: string;
  phoneRequirement: string;
  costModel: string;
  websiteUrl: string;
  dataQuality: 'unverified-static';
  mutableFieldsVerifiedAt: null;
}

const MUTABLE_NOTICE =
  'não verificado nesta build — confirme diretamente na fonte oficial antes de decisão operacional ou comercial';

const CATALOG_DESCRIPTION =
  'Referência local de identidade. Frota ativa, cobertura, parceiros, serviços, compatibilidade D2D/D2C, aparelhos, preço e disponibilidade no Brasil não são confirmados nesta build.';

function localReference(input: {
  id: string;
  name: string;
  operator: string;
  type: SatelliteConstellation['type'];
  orbit: SatelliteConstellation['orbit'];
  websiteUrl: string;
  celestrakGroup?: string;
}): SatelliteConstellation {
  return {
    ...input,
    constellationSize: null,
    activeSatellites: null,
    frequency: MUTABLE_NOTICE,
    band: MUTABLE_NOTICE,
    d2cCompatible: false,
    partners: [],
    coverage: MUTABLE_NOTICE,
    status: 'unknown',
    launchYear: null,
    services: [],
    description: CATALOG_DESCRIPTION,
    techDetails: MUTABLE_NOTICE,
    phoneRequirement: MUTABLE_NOTICE,
    costModel: MUTABLE_NOTICE,
    dataQuality: 'unverified-static',
    mutableFieldsVerifiedAt: null,
  };
}

// Os IDs originais são preservados para compatibilidade interna. A entrada não
// afirma disponibilidade comercial nem compatibilidade atual por si só.
export const SATELLITE_CONSTELLATIONS: SatelliteConstellation[] = [
  localReference({
    id: 'starlink-d2c',
    name: 'Starlink Direct to Cell',
    operator: 'SpaceX',
    type: 'D2C',
    orbit: 'LEO',
    websiteUrl: 'https://www.starlink.com/business/direct-to-cell',
    celestrakGroup: 'starlink',
  }),
  localReference({
    id: 'ast-spacemobile',
    name: 'AST SpaceMobile',
    operator: 'AST SpaceMobile',
    type: 'D2C',
    orbit: 'LEO',
    websiteUrl: 'https://ast-science.com/',
  }),
  localReference({
    id: 'lynk-global',
    name: 'Lynk Global',
    operator: 'Lynk Global',
    type: 'D2C',
    orbit: 'LEO',
    websiteUrl: 'https://lynk.world/',
  }),
  localReference({
    id: 'iridium',
    name: 'Iridium',
    operator: 'Iridium Communications',
    type: 'M2M',
    orbit: 'LEO',
    websiteUrl: 'https://www.iridium.com/',
    celestrakGroup: 'iridium',
  }),
  localReference({
    id: 'globalstar',
    name: 'Globalstar',
    operator: 'Globalstar',
    type: 'M2M',
    orbit: 'LEO',
    websiteUrl: 'https://www.globalstar.com/',
    celestrakGroup: 'globalstar',
  }),
  localReference({
    id: 'inmarsat',
    name: 'Inmarsat',
    operator: 'Inmarsat / Viasat',
    type: 'GEO',
    orbit: 'GEO',
    websiteUrl: 'https://www.inmarsat.com/',
    celestrakGroup: 'inmarsat',
  }),
  localReference({
    id: 'swarm',
    name: 'Swarm',
    operator: 'Swarm / SpaceX',
    type: 'M2M',
    orbit: 'LEO',
    websiteUrl: 'https://swarm.space/',
    celestrakGroup: 'swarm',
  }),
  localReference({
    id: 'othernet',
    name: 'Othernet',
    operator: 'Othernet',
    type: 'M2M',
    orbit: 'GEO',
    websiteUrl: 'https://othernet.is/',
  }),
];

export interface BrazilianRegulatoryInfo {
  agency: string;
  verifiedAt: string;
  sourceUrl: string;
  d2cStatus: string;
  operatorsInNegotiation: string[];
  relevantRegulations: string[];
  publicDatasets: {
    name: string;
    url: string;
    description: string;
  }[];
}

export const BRAZIL_REGULATORY: BrazilianRegulatoryInfo = {
  agency: 'ANATEL — Agência Nacional de Telecomunicações',
  verifiedAt: '2026-08-18',
  sourceUrl:
    'https://www.gov.br/anatel/pt-br/regulado/agenda-regulatoria/sandbox-autorizacao-para-sistemas-satelitais-em-aplicacoes-direct-to-device',
  d2cStatus:
    'Em 18/08/2026, a Anatel mantém ambiente regulatório experimental para testes de aplicações Direct-to-Device (D2D). Em maio de 2026, a Agência descreveu D2D como tecnologia que o mercado brasileiro estuda para ofertar futuramente. Testes já foram acompanhados no País, mas isso não equivale a disponibilidade comercial nacional.',
  operatorsInNegotiation: [],
  relevantRegulations: [
    'Lei nº 9.472/1997 — Lei Geral de Telecomunicações.',
    'Resolução Anatel nº 748/2021 — Regulamento Geral de Exploração de Satélites.',
    'Ato Anatel nº 5.322/2024 — ambiente regulatório experimental para aplicações Direct-to-Device em faixas do SMP.',
    'PDFF — Plano de Atribuição, Destinação e Distribuição de Faixas de Frequências.',
  ],
  publicDatasets: [
    {
      name: 'ANATEL — Satélites autorizados',
      url: 'https://www.gov.br/anatel/pt-br/regulado/satelite/satelites-autorizados',
      description:
        'Painéis oficiais para consultar satélites autorizados, direitos de exploração e satélites em operação comercial no Brasil.',
    },
    {
      name: 'ANATEL — Regulamentação de satélites',
      url: 'https://www.gov.br/anatel/pt-br/regulado/satelite/regulamentacao',
      description: 'Instrumentos regulatórios aplicáveis à exploração de satélites no Brasil.',
    },
    {
      name: 'ANATEL — Sandbox D2D',
      url: 'https://www.gov.br/anatel/pt-br/regulado/agenda-regulatoria/sandbox-autorizacao-para-sistemas-satelitais-em-aplicacoes-direct-to-device',
      description: 'Estado e regras do ambiente regulatório experimental para testes Direct-to-Device.',
    },
  ],
};

// Ordem dos quatro primeiros é intencional: EmergencySOS usa slice(0,4).
// Assim, SAMU, PM, Bombeiros e Defesa Civil aparecem nos atalhos principais.
export const BRAZIL_EMERGENCY_NUMBERS = [
  { number: '192', name: 'SAMU', description: 'Serviço de Atendimento Móvel de Urgência', icon: 'ambulance' },
  { number: '190', name: 'Polícia Militar', description: 'Emergência policial', icon: 'shield' },
  { number: '193', name: 'Bombeiros', description: 'Corpo de Bombeiros', icon: 'flame' },
  { number: '199', name: 'Defesa Civil', description: 'Proteção e Defesa Civil', icon: 'alert' },
  { number: '197', name: 'Polícia Civil', description: 'Polícia Civil', icon: 'police' },
  { number: '191', name: 'Polícia Rodoviária Federal', description: 'PRF', icon: 'shield' },
  { number: '198', name: 'Polícia Rodoviária Estadual', description: 'Serviço rodoviário estadual', icon: 'shield' },
  { number: '180', name: 'Central de Atendimento à Mulher', description: 'Serviço de utilidade pública', icon: 'phone' },
  { number: '100', name: 'Direitos Humanos', description: 'Serviço de utilidade pública', icon: 'scale' },
  { number: '188', name: 'Linha da Vida', description: 'Código 188 conforme designação nacional da Anatel', icon: 'heart' },
];

export const BRAZILIAN_OPERATORS = [
  {
    name: 'Vivo',
    satellitePartners: [] as string[],
    d2cStatus: MUTABLE_NOTICE,
    officialUrl: 'https://www.vivo.com.br/',
    verifiedAt: null as string | null,
  },
  {
    name: 'Claro',
    satellitePartners: [] as string[],
    d2cStatus: MUTABLE_NOTICE,
    officialUrl: 'https://www.claro.com.br/',
    verifiedAt: null as string | null,
  },
  {
    name: 'TIM',
    satellitePartners: [] as string[],
    d2cStatus: MUTABLE_NOTICE,
    officialUrl: 'https://www.tim.com.br/',
    verifiedAt: null as string | null,
  },
];
