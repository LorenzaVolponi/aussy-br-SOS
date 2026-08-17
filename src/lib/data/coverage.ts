// Dados de cobertura de infraestrutura pública brasileira
// Fontes: WiFi Grátis Brasil (gov.br), ANATEL ERB-Web, dados abertos

export interface WifiPublicPoint {
  id: string;
  name: string;
  city: string;
  state: string;
  type: 'praca' | 'escola' | 'biblioteca' | 'ubs' | 'equipamento_publico';
  lat: number;
  lng: number;
  source: string;
}

// Amostra representativa de WiFi Grátis Brasil (87 mil pontos total)
// Para o protótipo, capitais + cidades polo de cada estado
export const WIFI_PUBLIC_POINTS: WifiPublicPoint[] = [
  // São Paulo
  { id: 'wifi-1', name: 'Praça da Sé', city: 'São Paulo', state: 'SP', type: 'praca', lat: -23.5536, lng: -46.6336, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-2', name: 'Parque Ibirapuera', city: 'São Paulo', state: 'SP', type: 'praca', lat: -23.5874, lng: -46.6576, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-3', name: 'Estação da Luz', city: 'São Paulo', state: 'SP', type: 'equipamento_publico', lat: -23.5353, lng: -46.6332, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-4', name: 'Biblioteca Mário de Andrade', city: 'São Paulo', state: 'SP', type: 'biblioteca', lat: -23.5477, lng: -46.6424, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-5', name: 'USP - Cidade Universitária', city: 'São Paulo', state: 'SP', type: 'escola', lat: -23.5596, lng: -46.7313, source: 'WiFi Grátis Brasil' },
  // Rio de Janeiro
  { id: 'wifi-6', name: 'Praia de Copacabana', city: 'Rio de Janeiro', state: 'RJ', type: 'praca', lat: -22.9711, lng: -43.1822, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-7', name: 'Praça XV', city: 'Rio de Janeiro', state: 'RJ', type: 'praca', lat: -22.9035, lng: -43.1733, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-8', name: 'Estação Central do Brasil', city: 'Rio de Janeiro', state: 'RJ', type: 'equipamento_publico', lat: -22.9010, lng: -43.1947, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-9', name: 'UFRJ - Ilha do Fundão', city: 'Rio de Janeiro', state: 'RJ', type: 'escola', lat: -22.8619, lng: -43.2306, source: 'WiFi Grátis Brasil' },
  // Brasília
  { id: 'wifi-10', name: 'Esplanada dos Ministérios', city: 'Brasília', state: 'DF', type: 'praca', lat: -15.7951, lng: -47.8826, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-11', name: 'Rodoviária do Plano Piloto', city: 'Brasília', state: 'DF', type: 'equipamento_publico', lat: -15.7917, lng: -47.8876, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-12', name: 'UnB - Campus Darcy Ribeiro', city: 'Brasília', state: 'DF', type: 'escola', lat: -15.7621, lng: -47.8696, source: 'WiFi Grátis Brasil' },
  // Belo Horizonte
  { id: 'wifi-13', name: 'Praça da Liberdade', city: 'Belo Horizonte', state: 'MG', type: 'praca', lat: -19.9322, lng: -43.9385, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-14', name: 'Estação Central', city: 'Belo Horizonte', state: 'MG', type: 'equipamento_publico', lat: -19.9209, lng: -43.9386, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-15', name: 'UFMG - Campus Pampulha', city: 'Belo Horizonte', state: 'MG', type: 'escola', lat: -19.8695, lng: -43.9632, source: 'WiFi Grátis Brasil' },
  // Salvador
  { id: 'wifi-16', name: 'Pelourinho', city: 'Salvador', state: 'BA', type: 'praca', lat: -12.9714, lng: -38.5119, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-17', name: 'Farol da Barra', city: 'Salvador', state: 'BA', type: 'praca', lat: -13.0111, lng: -38.5322, source: 'WiFi Grátis Brasil' },
  // Recife
  { id: 'wifi-18', name: 'Marco Zero', city: 'Recife', state: 'PE', type: 'praca', lat: -8.0622, lng: -34.8711, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-19', name: 'Praia de Boa Viagem', city: 'Recife', state: 'PE', type: 'praca', lat: -8.1222, lng: -34.9056, source: 'WiFi Grátis Brasil' },
  // Fortaleza
  { id: 'wifi-20', name: 'Praia de Iracema', city: 'Fortaleza', state: 'CE', type: 'praca', lat: -3.1190, lng: -38.4781, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-21', name: 'Dragão do Mar', city: 'Fortaleza', state: 'CE', type: 'equipamento_publico', lat: -3.1190, lng: -38.4822, source: 'WiFi Grátis Brasil' },
  // Porto Alegre
  { id: 'wifi-22', name: 'Mercado Público', city: 'Porto Alegre', state: 'RS', type: 'equipamento_publico', lat: -30.0277, lng: -51.2287, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-23', name: 'Parque Farroupilha', city: 'Porto Alegre', state: 'RS', type: 'praca', lat: -30.0361, lng: -51.2086, source: 'WiFi Grátis Brasil' },
  // Curitiba
  { id: 'wifi-24', name: 'Rua XV de Novembro', city: 'Curitiba', state: 'PR', type: 'praca', lat: -25.4284, lng: -49.2733, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-25', name: 'Parque Tanguá', city: 'Curitiba', state: 'PR', type: 'praca', lat: -25.3711, lng: -49.2233, source: 'WiFi Grátis Brasil' },
  // Manaus
  { id: 'wifi-26', name: 'Teatro Amazonas', city: 'Manaus', state: 'AM', type: 'equipamento_publico', lat: -3.1314, lng: -60.0236, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-27', name: 'Praça São Sebastião', city: 'Manaus', state: 'AM', type: 'praca', lat: -3.1314, lng: -60.0236, source: 'WiFi Grátis Brasil' },
  // Belém
  { id: 'wifi-28', name: 'Estação das Docas', city: 'Belém', state: 'PA', type: 'equipamento_publico', lat: -1.4558, lng: -48.5039, source: 'WiFi Grátis Brasil' },
  // Goiânia
  { id: 'wifi-29', name: 'Praça do Sol', city: 'Goiânia', state: 'GO', type: 'praca', lat: -16.6974, lng: -49.2569, source: 'WiFi Grátis Brasil' },
  { id: 'wifi-30', name: 'Parque Flamboyant', city: 'Goiânia', state: 'GO', type: 'praca', lat: -16.7058, lng: -49.2636, source: 'WiFi Grátis Brasil' },
];

// Operadoras brasileiras e suas frequências (dados públicos ANATEL)
export const BRAZIL_OPERATORS = [
  {
    name: 'Vivo',
    owner: 'Telefônica Brasil',
    tech: ['2G GSM', '3G UMTS', '4G LTE', '5G NR'],
    frequencies: ['850 MHz', '900 MHz', '1800 MHz', '1900 MHz', '2100 MHz', '2600 MHz', '3500 MHz (5G)'],
    coverage: 'Nacional (todos os estados)',
    towers: '~52.000 torres',
    marketShare: '32%',
    color: '#6A2982',
  },
  {
    name: 'Claro',
    owner: 'América Móvil',
    tech: ['2G GSM', '3G UMTS', '4G LTE', '5G NR'],
    frequencies: ['850 MHz', '900 MHz', '1800 MHz', '1900 MHz', '2100 MHz', '2600 MHz', '3500 MHz (5G)'],
    coverage: 'Nacional',
    towers: '~48.000 torres',
    marketShare: '30%',
    color: '#E10600',
  },
  {
    name: 'TIM',
    owner: 'TIM Brasil (Iliad/Telecom Italia)',
    tech: ['2G GSM', '3G UMTS', '4G LTE', '5G NR'],
    frequencies: ['850 MHz', '900 MHz', '1800 MHz', '2100 MHz', '2600 MHz', '3500 MHz (5G)'],
    coverage: 'Nacional',
    towers: '~45.000 torres',
    marketShare: '28%',
    color: '#0033A0',
  },
  {
    name: 'Algar Telecom',
    owner: 'Algar',
    tech: ['2G GSM', '3G UMTS', '4G LTE'],
    frequencies: ['850 MHz', '1800 MHz', '1900 MHz', '2100 MHz'],
    coverage: 'Interior de SP/MG/GO/MS',
    towers: '~3.500 torres',
    marketShare: '4%',
    color: '#00A651',
  },
  {
    name: 'Sercomtel',
    owner: 'Algar',
    tech: ['2G GSM', '3G UMTS', '4G LTE'],
    frequencies: ['850 MHz', '1900 MHz', '2100 MHz'],
    coverage: 'Norte do Paraná',
    towers: '~400 torres',
    marketShare: '<1%',
    color: '#FF6900',
  },
];
