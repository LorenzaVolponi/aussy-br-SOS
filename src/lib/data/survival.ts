// Base local de preparação e sobrevivência — conteúdo estático para apoio offline.
// Revisão de segurança: 2026-08-18. Não substitui orientação de autoridade pública,
// serviço de emergência, profissional de saúde, autoridade marítima/aeronáutica ou Anatel.

export interface RadioChannel {
  freq: string;
  band: string;
  name: string;
  use: string;
  range: string;
  license: 'livre' | 'restrita' | 'profissional';
}

/**
 * Referências de rádio deliberadamente conservadoras.
 * A classificação `license` é usada apenas pela UI legada para indicar que
 * TRANSMISSÃO não deve ser tratada como livre. Recepção de radiodifusão local
 * continua sendo uma ferramenta útil em desastres.
 */
export const EMERGENCY_RADIO_CHANNELS: RadioChannel[] = [
  {
    freq: '156.800 MHz',
    band: 'VHF Marítimo',
    name: 'Canal 16 — socorro e segurança',
    use: 'Frequência internacional de socorro e segurança por radiotelefonia marítima. Para transmitir, use equipamento/serviço adequado e siga as regras e orientações da autoridade competente.',
    range: 'Depende de antena, potência, relevo e linha de visada; não há alcance garantido.',
    license: 'profissional',
  },
  {
    freq: 'FM/AM local',
    band: 'Radiodifusão',
    name: 'Escuta de emissoras locais',
    use: 'Use um rádio receptor para acompanhar comunicados oficiais e notícias locais durante interrupções de internet. Confirme instruções críticas em canais oficiais quando possível.',
    range: 'Varia conforme emissora, terreno, propagação e equipamento.',
    license: 'livre',
  },
];

// Morse para sinalização visual/sonora. SOS em Morse é ...---...
export const MORSE_CODE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--',
  SOS: '...---...',
};

export interface SurvivalSkill {
  id: string;
  category: 'agua' | 'fogo' | 'abrigo' | 'sinalizacao' | 'navegacao' | 'alimento' | 'primeiros_socorros';
  title: string;
  icon: string;
  severity: 'informativo' | 'urgente' | 'critico';
  duration: string;
  steps: string[];
  warnings?: string[];
  verifiedAt?: string;
  sourceLabel?: string;
  sourceUrls?: string[];
}

const VERIFIED_AT = '2026-08-18';
const MS_WATER = 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/e/enchentes/cuidados-com-a-agua';
const AHA_FIRST_AID = 'https://cpr.heart.org/en/resuscitation-science/2024-first-aid-guidelines';
const DEFESA_CIVIL_PR = 'https://www.defesacivil.pr.gov.br/Pagina/Kit-de-Emergencia-pessoal';

export const SURVIVAL_SKILLS: SurvivalSkill[] = [
  {
    id: 'purificar-agua',
    category: 'agua',
    title: 'Tornar água mais segura para beber',
    icon: 'droplet',
    severity: 'urgente',
    duration: 'seguir método oficial',
    steps: [
      'Prefira água fornecida por serviço público, Defesa Civil ou fonte engarrafada íntegra quando disponível',
      'Se a água estiver turva, filtre/co-e primeiro com filtro doméstico, coador de papel ou pano limpo',
      'Para tratamento domiciliar em emergência, siga a orientação atual do Ministério da Saúde para o produto e a situação local',
      'Se usar hipoclorito de sódio, confirme no rótulo que a concentração e a composição correspondem exatamente à orientação oficial antes de dosar',
      'Na ausência do produto correto, use a alternativa de fervura conforme a orientação oficial vigente e armazene a água tratada em recipiente limpo e tampado',
      'Se houver suspeita de combustível, produto químico, agrotóxico ou material radioativo, NÃO tente tornar a água potável por fervura ou cloração; procure outra fonte',
    ],
    warnings: [
      'NÃO improvise dose de água sanitária de concentração desconhecida',
      'NÃO use filtro caseiro de areia/carvão como substituto de desinfecção microbiológica',
      'NÃO confie em cor, cheiro ou transparência para concluir que uma água é potável',
      'Orientações locais podem mudar conforme o desastre; priorize Ministério da Saúde, vigilância sanitária e Defesa Civil',
    ],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'Ministério da Saúde — Cuidados com a água em emergências',
    sourceUrls: [MS_WATER],
  },
  {
    id: 'encontrar-agua',
    category: 'agua',
    title: 'Obter água sem aumentar o risco',
    icon: 'droplet',
    severity: 'urgente',
    duration: 'variável',
    steps: [
      'Priorize água potável distribuída por autoridades, pontos de abastecimento e recipientes lacrados',
      'Em campo, água de chuva coletada diretamente em superfície limpa tende a ser opção preferível a água parada ou contaminada, mas ainda deve ser tratada quando houver dúvida',
      'Qualquer água de rio, córrego, nascente ou reservatório natural pode conter micro-organismos ou contaminantes; trate antes de beber',
      'Proteja a água coletada em recipiente limpo e fechado para evitar recontaminação',
    ],
    warnings: [
      'NÃO beba água do mar, urina ou líquidos corporais como estratégia de hidratação',
      'NÃO consuma água de enchente ou água com suspeita de esgoto, combustível ou produtos químicos',
      'NÃO use plantas, cactos, cipós ou seiva como “fonte segura” sem conhecimento especializado',
    ],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'Ministério da Saúde — segurança da água em emergências',
    sourceUrls: [MS_WATER],
  },
  {
    id: 'acender-fogo',
    category: 'fogo',
    title: 'Uso seguro de fogo em emergência',
    icon: 'flame',
    severity: 'informativo',
    duration: 'somente quando seguro e permitido',
    steps: [
      'Antes de acender qualquer fogo, verifique risco de incêndio, vento, vegetação seca e restrições da autoridade local',
      'Prefira fonte de calor controlada e equipamento próprio em vez de técnicas improvisadas',
      'Mantenha água ou meio de extinção disponível e uma área limpa ao redor',
      'Use o menor fogo necessário e mantenha supervisão contínua',
      'Apague completamente antes de sair; cinzas devem estar frias ao toque antes de abandono do local',
    ],
    warnings: [
      'NÃO faça fogueira durante proibição de fogo ou em vegetação seca com risco de propagação',
      'NÃO use bateria, combustível, solvente ou aerossol para improvisar ignição',
      'NÃO use fogo em ambiente fechado ou pouco ventilado por risco de intoxicação por monóxido de carbono',
    ],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'Princípio de prevenção de incêndio e segurança de abrigo; siga autoridade local',
    sourceUrls: [DEFESA_CIVIL_PR],
  },
  {
    id: 'construir-abrigo',
    category: 'abrigo',
    title: 'Abrigo temporário com menor risco',
    icon: 'home',
    severity: 'informativo',
    duration: 'variável',
    steps: [
      'Primeiro procure abrigo oficial, edificação segura ou ponto indicado pela Defesa Civil quando acessível',
      'Evite leito de rio, encosta instável, árvore comprometida, linha elétrica, área alagável e local exposto a vento forte',
      'Isole o corpo do solo frio ou molhado usando material seco e estável',
      'Proteja-se de chuva, vento, frio e sol sem bloquear ventilação necessária',
      'Mantenha saída livre e não use chama, carvão ou gerador em espaço fechado',
    ],
    warnings: [
      'NÃO permaneça em estrutura com risco de desabamento, deslizamento ou inundação',
      'NÃO durma próximo a gerador, motor ou fogo em ambiente fechado',
    ],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'Preparação geral — priorize orientações da Defesa Civil local',
    sourceUrls: [DEFESA_CIVIL_PR],
  },
  {
    id: 'sinalizar-resgate',
    category: 'sinalizacao',
    title: 'Sinalizar pedido de ajuda',
    icon: 'alert',
    severity: 'urgente',
    duration: 'repetir com segurança',
    steps: [
      'Se houver cobertura, tente primeiro os números oficiais de emergência e compartilhe sua localização',
      'Use apito, lanterna ou material contrastante para aumentar sua visibilidade sem se deslocar para área perigosa',
      'SOS em Morse é 3 curtos, 3 longos, 3 curtos (...---...) e pode ser repetido com luz ou som',
      'Em área aberta, marque visualmente sua posição com material contrastante sem destruir vegetação nem criar novo risco',
      'Economize bateria e energia: faça sinais em intervalos e mantenha capacidade para responder ao resgate',
    ],
    warnings: [
      'NÃO provoque incêndio ou fumaça em área de risco apenas para sinalizar',
      'NÃO caminhe para local perigoso só para tentar obter visibilidade',
      'Nenhum alcance de apito, luz ou espelho é garantido',
    ],
  },
  {
    id: 'navegar-sol',
    category: 'navegacao',
    title: 'Sol como referência aproximada',
    icon: 'sun',
    severity: 'informativo',
    duration: 'aproximação',
    steps: [
      'Use GPS, mapa e bússola quando disponíveis; referências pelo Sol são apenas auxiliares',
      'O Sol nasce aproximadamente a leste e se põe aproximadamente a oeste, com variação por data e latitude',
      'Observe a trajetória e a sombra apenas para orientação geral e confirme por outro método',
      'Se estiver perdido, muitas vezes permanecer em local seguro e sinalizar é melhor do que caminhar sem rota confirmada',
    ],
    warnings: [
      'NÃO use método de relógio/sombra como substituto de navegação precisa',
      'NÃO presuma que o Sol estará exatamente a norte ao meio-dia em qualquer local/data do Brasil',
    ],
  },
  {
    id: 'navegar-estrelas',
    category: 'navegacao',
    title: 'Cruzeiro do Sul como referência aproximada',
    icon: 'star',
    severity: 'informativo',
    duration: 'aproximação',
    steps: [
      'Use a constelação apenas como referência auxiliar quando você souber identificá-la com segurança',
      'O prolongamento do eixo maior do Cruzeiro do Sul pode ajudar a estimar a direção do polo celeste sul',
      'Confirme a direção com bússola, GPS, mapa ou outra referência independente quando possível',
    ],
    warnings: [
      'Identificação errada de estrelas produz direção errada; não use como único método em deslocamento de risco',
    ],
  },
  {
    id: 'alimento-selvagem',
    category: 'alimento',
    title: 'Segurança alimentar em situação de isolamento',
    icon: 'leaf',
    severity: 'urgente',
    duration: 'priorize alimento conhecido',
    steps: [
      'Priorize alimentos embalados íntegros, não perecíveis e que você já conhece',
      'Em enchente, descarte alimento que teve contato com água de inundação ou lama conforme orientação sanitária',
      'Não use gosto, cheiro, cor ou uma pequena prova para determinar se planta, cogumelo, fruto ou alimento desconhecido é seguro',
      'Se estiver sem alimento, preserve energia e priorize água segura, abrigo, comunicação e resgate em vez de forrageamento experimental',
    ],
    warnings: [
      'NÃO use “teste universal de comestibilidade”; algumas toxinas podem agir em pequena dose ou de forma tardia',
      'NÃO consuma cogumelos, plantas, raízes, sementes, insetos ou animais silvestres sem identificação segura por especialista',
      'NÃO presuma que peixe de água doce é sempre seguro; contaminação e toxinas dependem do local e da espécie',
    ],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'Ministério da Saúde — segurança de alimentos em emergências',
    sourceUrls: ['https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/e/enchentes/cuidados-com-os-alimentos/cuidados-com-os-alimentos/'],
  },
  {
    id: 'hipotermia',
    category: 'primeiros_socorros',
    title: 'Hipotermia — reduzir perda de calor',
    icon: 'snow',
    severity: 'critico',
    duration: 'imediato',
    steps: [
      'Leve a pessoa para ambiente protegido do frio e do vento quando isso puder ser feito com segurança',
      'Remova roupa saturada e substitua por camadas secas; isole do chão e cubra cabeça e pescoço',
      'Use cobertores e, se houver recurso adequado, aquecimento do tronco seguindo as instruções do dispositivo e com proteção entre fonte de calor e pele',
      'Se estiver alerta e conseguir engolir com segurança, bebida ou alimento calórico pode ajudar em quadro leve',
      'Acione o serviço de emergência se houver confusão, sonolência importante, fala alterada, pele muito pálida/azulada, congelamento ou piora',
    ],
    warnings: [
      'NÃO esfregue, massageie ou aplique fonte de calor diretamente nas extremidades',
      'NÃO use banho quente ou imersão em pessoa confusa ou com nível de consciência reduzido',
      'NÃO use álcool como “aquecimento”',
    ],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'AHA / American Red Cross First Aid 2024 — hypothermia',
    sourceUrls: [AHA_FIRST_AID],
  },
  {
    id: 'insolacao',
    category: 'primeiros_socorros',
    title: 'Hipertermia / suspeita de heatstroke',
    icon: 'sun',
    severity: 'critico',
    duration: 'resfriar imediatamente',
    steps: [
      'Calor intenso + alteração do estado mental (confusão, desorientação, convulsão ou perda de consciência) deve ser tratado como emergência',
      'Acione o SAMU 192 e remova a pessoa do ambiente quente; retire excesso de roupa',
      'Inicie resfriamento ativo imediatamente',
      'Quando for seguro e possível, imersão do corpo (pescoço para baixo) em água fresca a fria é um método rápido de resfriamento',
      'Se imersão não estiver disponível, use ducha fria, toalhas/lençóis frios, ventilação e outros métodos de resfriamento disponíveis',
      'Só ofereça líquido fresco se a pessoa estiver alerta e conseguir engolir normalmente',
    ],
    warnings: [
      'NÃO espere a pele ficar seca ou a pessoa parar de suar para suspeitar de emergência por calor',
      'NÃO force líquido em pessoa confusa, convulsionando ou com consciência reduzida',
      'NÃO prepare “água com sal” caseira como tratamento de heatstroke',
      'Resfriamento rápido é prioridade enquanto o atendimento é acionado',
    ],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'AHA / American Red Cross First Aid 2024 — exertional hyperthermia and heatstroke',
    sourceUrls: [AHA_FIRST_AID],
  },
];

export interface PlantInfo {
  name: string;
  scientific: string;
  type: 'comestivel' | 'toxica' | 'medicinal';
  description: string;
  warning?: string;
}

/**
 * A UI legada ainda possui filtros “comestível/medicinal”. Para segurança,
 * esta build publica apenas exemplos tóxicos/irritantes como alerta visual;
 * o app não deve ser usado para decidir se uma planta pode ser comida ou usada
 * como medicamento.
 */
export const COMMON_PLANTS: PlantInfo[] = [
  {
    name: 'Comigo-ninguém-pode',
    scientific: 'Dieffenbachia spp.',
    type: 'toxica',
    description: 'Planta ornamental irritante/tóxica. Evite ingestão e contato com olhos e mucosas; mantenha longe de crianças e animais.',
    warning: 'Em ingestão, reação importante ou dificuldade para respirar, procure atendimento e orientação toxicológica.',
  },
  {
    name: 'Mamona',
    scientific: 'Ricinus communis',
    type: 'toxica',
    description: 'As sementes são perigosas quando mastigadas/ingeridas. Não use esta planta como alimento ou preparo medicinal improvisado.',
    warning: 'Não existe “quantidade segura” que o app possa determinar. Em suspeita de ingestão, procure atendimento.',
  },
  {
    name: 'Trombeteira',
    scientific: 'Brugmansia spp.',
    type: 'toxica',
    description: 'Planta com alcaloides tóxicos. Não ingerir nem preparar chás/extratos caseiros.',
    warning: 'Pode causar intoxicação grave; procure atendimento em caso de exposição sintomática.',
  },
  {
    name: 'Mandioca de variedade desconhecida',
    scientific: 'Manihot esculenta',
    type: 'toxica',
    description: 'Variedades e processamento alteram o risco por compostos cianogênicos. Em emergência, não tente tornar raiz desconhecida segura usando instruções simplificadas do app.',
    warning: 'Consuma apenas produto de origem conhecida e preparado por método alimentar adequado.',
  },
];

export const BATTERY_TIPS = [
  { title: 'Modo economia de bateria', desc: 'Ative o modo de baixo consumo nativo do aparelho.' },
  { title: 'Reduza brilho e tempo de tela', desc: 'Diminua o brilho e apague a tela quando não estiver consultando informações essenciais.' },
  { title: 'Desative rádios que não estiver usando', desc: 'Se for seguro, desligue Wi‑Fi, Bluetooth ou dados móveis quando não forem necessários; reative periodicamente para verificar comunicação.' },
  { title: 'Evite uso não essencial', desc: 'Jogos, streaming, vídeo e câmera prolongada consomem energia que pode ser necessária para comunicação.' },
  { title: 'Power bank carregado', desc: 'Mantenha fonte de energia reserva testada e cabos compatíveis no kit.' },
  { title: 'Proteja bateria de extremos', desc: 'Calor e frio extremos prejudicam desempenho; mantenha celular e power bank protegidos quando possível.' },
];

/**
 * A “regra dos 3” é uma heurística popular, não uma previsão de tempo de
 * sobrevivência. Mantemos o formato porque a UI legada renderiza quatro cartões,
 * mas os valores são prioridades, não prazos fisiológicos.
 */
export const SURVIVAL_RULE_OF_3 = [
  { label: 'Respiração', time: 'IMEDIATO', icon: 'wind', desc: 'Via aérea e respiração são prioridade de emergência.' },
  { label: 'Temperatura', time: 'URGENTE', icon: 'home', desc: 'Proteja de calor/frio e condições ambientais perigosas.' },
  { label: 'Água', time: 'PRIORIDADE', icon: 'droplet', desc: 'Planeje água potável suficiente e preserve fontes seguras.' },
  { label: 'Alimento', time: 'DEPOIS', icon: 'utensils', desc: 'Não assuma riscos de forrageamento antes de água, abrigo e resgate.' },
];

// Base da calculadora legada. Defesa Civil do Paraná recomenda 2 L de água por
// pessoa/dia no kit pessoal. Necessidades individuais variam com clima, saúde,
// idade e atividade; o total calculado pela UI é apenas planejamento aproximado.
export const WATER_PER_PERSON_PER_DAY_LITERS = 2;

export interface SignalRecoveryMethod {
  id: string;
  title: string;
  description: string;
  icon: string;
  availability: 'qualquer-celular' | 'celular-topo' | 'com-hardware' | 'apenas-com-app';
  worksOffline: boolean;
  steps: string[];
}

export const SIGNAL_RECOVERY_METHODS: SignalRecoveryMethod[] = [
  {
    id: 'sms-basico',
    title: 'Tente SMS quando houver rede celular',
    description: 'SMS pode funcionar em condições em que dados móveis estão degradados, mas não existe garantia de entrega, prazo ou tecnologia de rede disponível.',
    icon: 'message-square',
    availability: 'qualquer-celular',
    worksOffline: false,
    steps: [
      'Mantenha o celular ligado e procure cobertura de forma segura',
      'Envie mensagem curta com nome, situação e coordenadas quando souber',
      'Não considere a mensagem entregue até receber confirmação ou resposta',
      'Preserve bateria entre tentativas',
    ],
  },
  {
    id: 'ligacao-emergencia',
    title: 'Números públicos de emergência',
    description: 'No Brasil, chamadas para serviços públicos de emergência são gratuitas. A conclusão da chamada ainda depende de aparelho, rede/cobertura e condições técnicas disponíveis.',
    icon: 'phone',
    availability: 'qualquer-celular',
    worksOffline: false,
    steps: [
      'Tente 192 para SAMU, 190 para Polícia Militar e 193 para Bombeiros conforme a situação',
      'Se a chamada completar, descreva a emergência e informe localização/endereço ou coordenadas',
      'Siga as orientações do atendente e não dependa da afirmação de que “sempre funciona sem SIM”',
    ],
  },
  {
    id: 'alerta-defesa-civil',
    title: 'Defesa Civil Alerta',
    description: 'Em celulares compatíveis conectados a redes 4G/5G, alertas severos/extremos podem chegar por Cell Broadcast sem cadastro prévio.',
    icon: 'alert-triangle',
    availability: 'qualquer-celular',
    worksOffline: false,
    steps: [
      'Mantenha o sistema do celular atualizado',
      'Ao receber alerta, leia a mensagem inteira e siga a instrução da Defesa Civil',
      'Não dependa de Wi‑Fi público ou de uma lista estática de pontos para receber o Cell Broadcast',
    ],
  },
  {
    id: 'sos-satelite',
    title: 'SOS via satélite — verifique país e aparelho',
    description: 'Compatibilidade de hardware não significa disponibilidade regional. Na verificação de 2026-08-18, o SOS de Emergência via satélite da Apple não consta como disponível no Brasil.',
    icon: 'satellite',
    availability: 'celular-topo',
    worksOffline: false,
    steps: [
      'Antes de viajar, consulte a página oficial do fabricante para disponibilidade no país/região de destino',
      'Em iPhone compatível, confira Ajustes/Central de Controle > Satélite quando o recurso estiver disponível',
      'Não planeje um resgate no Brasil presumindo que o SOS via satélite da Apple estará disponível',
      'Use primeiro redes celular/Wi‑Fi e os números públicos de emergência quando disponíveis',
    ],
  },
  {
    id: 'mesh-bluetooth',
    title: 'Apps de comunicação local',
    description: 'Alguns apps podem oferecer comunicação direta/local quando previamente instalados e configurados. Alcance, roteamento e entrega dependem do app, sistema, permissões, aparelhos próximos e ambiente.',
    icon: 'bluetooth',
    availability: 'apenas-com-app',
    worksOffline: true,
    steps: [
      'Instale e teste a ferramenta antes de uma emergência',
      'Confirme quais permissões e modos realmente funcionam sem internet no seu aparelho',
      'Não trate alcance nominal ou “mesh” como garantia de que uma mensagem chegará ao destino',
    ],
  },
];
