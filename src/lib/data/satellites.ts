// Base de dados de satélites Direct-to-Cell (D2C) e de comunicação
// Fontes públicas: FCC filings, sites oficiais, Wikipedia, press releases
// Atualizado: 2026-07

export interface SatelliteConstellation {
  id: string;
  name: string;
  operator: string;
  type: 'D2C' | 'LEO-broadband' | 'GEO' | 'M2M' | 'legacy';
  orbit: 'LEO' | 'MEO' | 'GEO';
  constellationSize: number;
  activeSatellites: number;
  frequency: string;
  band: string;
  d2cCompatible: boolean;
  partners: string[];
  coverage: string;
  status: 'operational' | 'testing' | 'planned' | 'limited';
  launchYear: number;
  services: string[];
  celestrakGroup?: string;
  description: string;
  techDetails: string;
  phoneRequirement: string;
  costModel: string;
  websiteUrl: string;
}

export const SATELLITE_CONSTELLATIONS: SatelliteConstellation[] = [
  {
    id: 'starlink-d2c',
    name: 'Starlink Direct to Cell',
    operator: 'SpaceX',
    type: 'D2C',
    orbit: 'LEO',
    constellationSize: 8000,
    activeSatellites: 350,
    frequency: '1910-1990 MHz (PCS), 1610-1626.5 MHz',
    band: 'L-band + S-band (LTE)',
    d2cCompatible: true,
    partners: ['T-Mobile (US)', 'Optus (AU)', 'KDDI (JP)', 'Rogers (CA)', 'One NZ (NZ)', 'Entel (CL)', 'Empresas Brasileiras (em negociação)'],
    coverage: 'Global (latitudes até ±65°)',
    status: 'operational',
    launchYear: 2024,
    services: ['SMS (ativo)', 'Dados LTE (ativo)', 'Voz VoLTE (ativo)', 'IoT (testes)'],
    celestrakGroup: 'starlink',
    description:
      'Primeira constelação D2C realmente operacional. O satélite funciona como uma "torre celular orbital" — retransmite LTE em bandas celulares comuns para que qualquer celular 4G compatível se conecte sem hardware extra.',
    techDetails:
      'O satélite usa phased array antenna de ~25m² que projeta células LTE de ~15km de raio na superfície. Latência 25-50ms. Tecnologia desenvolvida em parceria com a Swan Technologies (Lydia).',
    phoneRequirement:
      'Qualquer celular LTE Cat-M ou superior com firmware atualizado pela operadora parceira. No Brasil: ainda sem operadora habilitada — VIVO está em negociações (jul/2025).',
    costModel:
      'Gratuito para clientes T-Mobile nos EUA (SMS). Dados: incluído no plano. No Brasil: modelo ainda não definido.',
    websiteUrl: 'https://www.starlink.com/business/direct-to-cell',
  },
  {
    id: 'ast-spacemobile',
    name: 'BlueBird (AST SpaceMobile)',
    operator: 'AST SpaceMobile',
    type: 'D2C',
    orbit: 'LEO',
    constellationSize: 243,
    activeSatellites: 6,
    frequency: '600-960 MHz, 1427-1518 MHz, 1610-1660 MHz, 2483-2500 MHz',
    band: 'Multiple cellular bands',
    d2cCompatible: true,
    partners: ['AT&T (US)', 'Verizon (US)', 'Rakuten (JP)', 'Vodafone (EU)', 'Smart (PH)'],
    coverage: 'Equatorial + temperada (expansão planejada)',
    status: 'operational',
    launchYear: 2022,
    services: ['Voz (ativo)', 'SMS (ativo)', 'Dados (ativo em testes)', 'IoT'],
    celestrakGroup: 'ast',
    description:
      'Pioneiro do D2C — primeira chamada de voz via satélite para celular Android comum em 2023. Satélites BlueBird usam antenas phased array gigantes (~64m²) que falam diretamente em bandas celulares.',
    techDetails:
      'Satélites de 1.500kg com painéis solares de 64m². Latência 30-60ms. Constelação completa prevista para 2027 com 243 satélites em 5 planos orbitais.',
    phoneRequirement:
      'Celular 4G/5G com firmware habilitado. Testes em 2024 liberaram Android 14+ (Samsung S22+, S23+, S24, Pixel 9). iPhone suporte em desenvolvimento.',
    costModel:
      'AT&T: dia de teste grátis (2024), depois add-on de ~US$ 20/mês. Verizon: inclusão em planos Above Unlimited.',
    websiteUrl: 'https://ast-science.com',
  },
  {
    id: 'lynk-global',
    name: 'Lynk Global',
    operator: 'Lynk Global',
    type: 'D2C',
    orbit: 'LEO',
    constellationSize: 50,
    activeSatellites: 8,
    frequency: '900 MHz, 1800 MHz, 2.4 GHz',
    band: 'GSM/UMTS/LTE cellular',
    d2cCompatible: true,
    partners: ['Telecom (Caribe)', 'Brightwave (Pacífico)', 'Aliv (Bahamas)', 'Vodafone (em testes)'],
    coverage: 'Caribe, Pacífico Sul, em expansão',
    status: 'operational',
    launchYear: 2019,
    services: ['SMS (ativo)', 'Voz (testes)', 'IoT'],
    celestrakGroup: 'lynk',
    description:
      'Startup focada em mercados insulares. Já opera SMS via satélite em celulares 3GPP comuns em países como Bahamas, Cook Islands, Palau. Modelo "operadora como serviço" — qualquer MNO pode comprar capacidade.',
    techDetails:
      'Satélites CubeSat de 20kg. Latência 50-100ms. Foco em SMS e IoT barato. Planeja 50 satélites para cobertura global.',
    phoneRequirement:
      'Qualquer celular 2G/3G/4G com SIM de operadora parceira habilitada.',
    costModel:
      'Cobrado da operadora, repassado ao usuário. Modelo "smart cap" — algumas operadoras incluem X SMS grátis/mês.',
    websiteUrl: 'https://lynk.world',
  },
  {
    id: 'iridium',
    name: 'Iridium Certus / SBD',
    operator: 'Iridium Communications',
    type: 'M2M',
    orbit: 'LEO',
    constellationSize: 66,
    activeSatellites: 66,
    frequency: '1616-1626.5 MHz (L-band)',
    band: 'L-band (próprio)',
    d2cCompatible: false,
    partners: ['NASA', 'DOD (US)', 'Marinha', 'Embraer'],
    coverage: 'Global 100% (incluindo polos)',
    status: 'operational',
    launchYear: 1998,
    services: ['Voz (ativo)', 'Mensagens (ativo)', 'Dados 352kbps', 'SBD (Short Burst Data)'],
    celestrakGroup: 'iridium',
    description:
      'Única constelação com cobertura real 100% global. Não é D2C (precisa de telefone Iridium dedicado), mas serve mensagens curtas via gateway. iPhone 14+ usa Iridium indiretamente para Emergency SOS em algumas regiões.',
    techDetails:
      '66 satélites em 6 planos orbitais a 780km. Latência 5-15ms entre satélites (cross-links). Versão NEXT lançada 2017-2019.',
    phoneRequirement:
      'Telefone Iridium dedicado (9555, 9575) ou módulo SBD. iPhone 14+ tem chip GPS+Iridium para SOS apenas.',
    costModel:
      'Planos desde US$ 60/mês. Mensagens SBD baratas (centavos). Hardware US$ 1.000+.',
    websiteUrl: 'https://www.iridium.com',
  },
  {
    id: 'globalstar',
    name: 'Globalstar',
    operator: 'Globalstar',
    type: 'M2M',
    orbit: 'LEO',
    constellationSize: 48,
    activeSatellites: 48,
    frequency: '2483-2500 MHz (S-band) + 1610-1621 MHz',
    band: 'S-band + L-band',
    d2cCompatible: true,
    partners: ['Apple (iPhone 14+)', 'SPOT', 'Nicira'],
    coverage: 'Temperada (sem polos)',
    status: 'operational',
    launchYear: 2000,
    services: ['Voz (ativo)', 'Mensagens', 'Emergency SOS (Apple)', 'IoT'],
    celestrakGroup: 'globalstar',
    description:
      'Operadora que faz o Emergency SOS via satélite do iPhone 14+. Apple investiu US$ 445M em 2022 para expansão. Funciona "invisível" para o usuário — só aciona em emergência.',
    techDetails:
      '48 satélites LEO a 1.414km. Bandwidth limitada (~9.6kbps). Apple usa protocolo próprio comprimido.',
    phoneRequirement:
      'iPhone 14 ou superior. Não funciona com Android. Não há API pública para terceiros.',
    costModel:
      'Apple: grátis por 2 anos após compra, depois US$ 14.95/mês (satellite features). Outros: planos SPOT.',
    websiteUrl: 'https://www.globalstar.com',
  },
  {
    id: 'inmarsat',
    name: 'Inmarsat BGAN / ELERA',
    operator: 'Inmarsat (Viasat)',
    type: 'GEO',
    orbit: 'GEO',
    constellationSize: 12,
    activeSatellites: 12,
    frequency: '1525-1559 MHz + 1626.5-1660.5 MHz',
    band: 'L-band',
    d2cCompatible: false,
    partners: ['Viasat', 'Aviação comercial', 'Marinha'],
    coverage: 'Global (exceto polos)',
    status: 'operational',
    launchYear: 1980,
    services: ['Voz', 'Dados 492kbps', 'IoT', 'Aviação'],
    celestrakGroup: 'inmarsat',
    description:
      'Pioneiro em satélites GEO. BGAN (Broadband Global Area Network) fornece internet móvel em terminais portáteis. Usado por jornalistas, ONGs, militares. ELERA é a nova rede IoT L-band.',
    techDetails:
      'Satélites GEO a 35.786km. Latência 600-700ms. Terminais BGAN custam US$ 1.500-5.000.',
    phoneRequirement:
      'Terminal BGAN dedicado (Explorer 510, 710, etc.). Não funciona com celular comum.',
    costModel:
      'Pré-pago: US$ 0.50-2.00/MB. Pós-pago: planos desde US$ 50/mês + dados.',
    websiteUrl: 'https://www.inmarsat.com',
  },
  {
    id: 'swarm',
    name: 'Swarm Tile',
    operator: 'SpaceX (Swarm)',
    type: 'M2M',
    orbit: 'LEO',
    constellationSize: 190,
    activeSatellites: 190,
    frequency: '137-138 MHz + 149-150 MHz (VHF)',
    band: 'VHF',
    d2cCompatible: false,
    partners: ['SpaceX', 'Aplicativos IoT'],
    coverage: 'Global',
    status: 'operational',
    launchYear: 2021,
    services: ['IoT apenas', 'Mensagens curtas (até 192 bytes)'],
    celestrakGroup: 'swarm',
    description:
      'Comprada pela SpaceX em 2021. Constelação de CubeSats VHF baratos para IoT. Módulo Tile custa ~US$ 100 + plano de US$ 5/mês. Não é para celular, mas é a rede orbital mais barata que existe.',
    techDetails:
      '120 CubeSats 0.25U a 550km. Latência 1-4 horas. Dispositivo Tile: 90g, bateria 1 ano.',
    phoneRequirement:
      'Não compatível com celular. Hardware dedicado Swarm Tile necessário.',
    costModel:
      'Hardware US$ 119 + US$ 5/mês (até 750 mensagens/mês).',
    websiteUrl: 'https://www.swarm.space',
  },
  {
    id: 'othernet',
    name: 'Othernet (ex-Outernet)',
    operator: 'Othernet',
    type: 'M2M',
    orbit: 'GEO',
    constellationSize: 3,
    activeSatellites: 3,
    frequency: 'Ku-band downlink only',
    band: 'Ku (recepção)',
    d2cCompatible: false,
    partners: ['Comunidade open-source'],
    coverage: 'Américas, Europa, África',
    status: 'operational',
    launchYear: 2014,
    services: ['Broadcast unidirecional (dados)'],
    celestrakGroup: 'othernet',
    description:
      'Único serviço de internet "grátis" via satélite que existe. Recebe broadcasts de dados (notícias, mapas, livros, código) via satélite GEO. Não tem uplink. Hardware receptor DIY ~US$ 100 (SDR + antena).',
    techDetails:
      'Transponder Ku alugado em satélites GEO existentes. Receptor: RTL-SDR + LNB + antena offset 60cm. Software livre.',
    phoneRequirement:
      'Hardware SDR dedicado. Pode receber via Raspberry Pi + hotspot para celular.',
    costModel:
      'Recepção 100% gratuita após compra do hardware (~US$ 100). Conteúdo selecionado pela comunidade.',
    websiteUrl: 'https://othernet.is',
  },
];

// Informações regulatórias Brasil
export interface BrazilianRegulatoryInfo {
  agency: string;
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
  agency: 'ANATEL (Agência Nacional de Telecomunicações)',
  d2cStatus:
    'ANATEL publicou em 2024 Consulta Pública sobre Serviço Móvel por Satélite. Em 2025, iniciou estudos para autorizar D2C nas bandas 1910-1990 MHz (PCS) e 1610-1626.5 MHz.',
  operatorsInNegotiation: [
    'Vivo (Telefônica Brasil) — negocia com AST SpaceMobile desde 2024',
    'Claro (América Móvil) — assinou MoU com Lynk Global em fev/2025',
    'TIM Brasil — em conversas com Starlink D2C',
  ],
  relevantRegulations: [
    'Lei Geral de Telecomunicações (Lei 9.472/1997)',
    'Resolução Anatel nº 715/2019 (Plano de Atribuição de Bandas)',
    'Ato nº 4.841/2024 — Consulta Pública D2C',
    'Resolução Anatel nº 747/2020 — Cell Broadcast',
  ],
  publicDatasets: [
    {
      name: 'ERB-Web (Estações Rádio-Base)',
      url: 'https://www.gov.br/anatel/pt-br/dados/erbs',
      description:
        'Base pública com TODAS as torres de celular do Brasil — operadora, tecnologia (2G/3G/4G/5G), frequência, latitude/longitude. Atualizada mensalmente.',
    },
    {
      name: 'Emissão Cell Broadcast',
      url: 'https://www.gov.br/anatel/pt-br/assuntos/noticias/anatel-aprova-regramento-para-cell-broadcast',
      description:
        'Desde 2024, ANATEL exige que operadoras enviem alertas de emergência via Cell Broadcast para todos os celulares na área de risco. Funciona SEM necessidade de app.',
    },
    {
      name: 'Wifi Grátis Brasil',
      url: 'https://www.gov.br/mcom/pt-br/centrais-de-conteudo/publicacoes/wifi-gratis-brasil',
      description:
        'Programa do Governo Federal que instala WiFi público gratuito em praças, escolas e equipamentos públicos. Mais de 87 mil pontos ativos.',
    },
    {
      name: 'Plano Nacional de Banda Larga',
      url: 'https://www.gov.br/mcom/pt-br/assuntos/plano-nacional-de-banda-larga',
      description:
        'Programa governo que mapeia cobertura de internet em todo Brasil por município.',
    },
    {
      name: 'CEMADEN (Centro Nacional de Monitoramento)',
      url: 'https://www.gov.br/cemaden/pt-br',
      description:
        'Alertas de desastres naturais (enchentes, deslizamentos) com API pública para integração.',
    },
    {
      name: 'Sismologia UNB',
      url: 'http://www.sismo.unb.br',
      description:
        'Sismologia USP/UNB — monitoramento sísmico brasileiro com API pública.',
    },
  ],
};

// Números de emergência oficiais Brasil
export const BRAZIL_EMERGENCY_NUMBERS = [
  { number: '192', name: 'SAMU', description: 'Serviço de Atendimento Móvel de Urgência', icon: 'ambulance' },
  { number: '190', name: 'Polícia Militar', description: 'Policiamento, ocorrências criminais', icon: 'shield' },
  { number: '193', name: 'Bombeiros', description: 'Incêndios, resgates, salvamento', icon: 'flame' },
  { number: '197', name: 'Polícia Civil', description: 'Investigação, delegacias', icon: 'police' },
  { number: '180', name: 'Central de Atendimento à Mulher', description: 'Denúncias de violência contra mulher', icon: 'heart' },
  { number: '100', name: 'Disque Direitos Humanos', description: 'Denúncias violações direitos', icon: 'scale' },
  { number: '188', name: 'CVV', description: 'Centro de Valorização da Vida — apoio emocional', icon: 'phone' },
  { number: '199', name: 'Defesa Civil', description: 'Desastres naturais, prevenção', icon: 'alert' },
];
