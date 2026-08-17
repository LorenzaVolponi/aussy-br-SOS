// Base de dados offline — sobrevivência, rádio, comunicação visual
// Tudo cacheado pelo Service Worker. Fontes: ITU-R, ANATEL, Cruz Vermelha, MARINE, protocolos militares básicos
// 100% offline após primeiro carregamento.

// ============= RÁDIO: frequências de emergência =============
// Fonte: ANATEL, ITU-R Radio Regulations Appendices 15 & 17, MARINE VHF
export interface RadioChannel {
  freq: string;
  band: string;
  name: string;
  use: string;
  range: string;
  license: 'livre' | 'restrita' | 'profissional';
}

export const EMERGENCY_RADIO_CHANNELS: RadioChannel[] = [
  // VHF Marítimo — funciona em qualquer rádio VHF marítimo, mesmo sem licença em emergência
  { freq: '156.800 MHz', band: 'VHF Marítimo', name: 'Canal 16', use: 'Emergência, chamada de socorro, escuta permanente', range: '30-50 km (linha de visada)', license: 'livre' },
  { freq: '156.525 MHz', band: 'VHF Marítimo', name: 'Canal 70', use: 'Chamada Digital Seletiva (DSC) de socorro', range: '30-50 km', license: 'livre' },

  // VHF Amador (rádio amador) — requer licença, mas rádios Baofeng podem receber
  { freq: '145.000 MHz', band: 'VHF Amador (2m)', name: 'Chamada simplex', use: 'Radioamadores monitoram para emergências', range: '5-30 km urbano, 50+ km rural', license: 'restrita' },
  { freq: '146.520 MHz', band: 'VHF Amador (2m)', name: 'Nacional simplex', use: 'Frequência de chamada nacional radioamadores', range: '5-30 km', license: 'restrita' },

  // UHF Amador
  { freq: '446.000 MHz', band: 'UHF Amador (70cm)', name: 'PMR446 simplex', use: 'PMR446 — rádios portáteis livres no Brasil (até 0.5W)', range: '1-3 km urbano', license: 'livre' },

  // CB (Cidadão) — PX, livre no Brasil
  { freq: '27.185 MHz', band: 'CB (Cidadão)', name: 'Canal 19', use: 'Canal de estrada — caminhoneiros monitoram 24h', range: '5-15 km', license: 'livre' },
  { freq: '27.065 MHz', band: 'CB (Cidadão)', name: 'Canal 9', use: 'Canal de emergência CB', range: '5-15 km', license: 'livre' },

  // Avião — emergência aérea
  { freq: '121.500 MHz', band: 'VHF Aeronáutico', name: 'Emergência aérea', use: 'Guarda aérea internacional — ELT/EPIRB', range: 'Linha de visada (até 200 km aeronave-solo)', license: 'profissional' },

  // HF Marítimo
  { freq: '2182 kHz', band: 'HF Marítimo', name: 'Socorro radiotelefonia', use: 'Chamada de socorro MF/HF internacional', range: '300-1500 km', license: 'profissional' },

  // FM Comercial — informação de emergência
  { freq: '87.5-108.0 MHz', band: 'FM Comercial', name: 'Rádios locais', use: 'Defesa Civil transmite alertas via rádios comerciais', range: '30-100 km', license: 'livre' },
  { freq: '530-1710 kHz', band: 'AM Comercial', name: 'Rádios locais AM', use: 'AM tem maior alcance que FM — boa em desastres', range: '100-500 km à noite', license: 'livre' },
];

// ============= MORSE: tabela completa =============
// Para sinalização visual (lanterna) e sonora (apito)
export const MORSE_CODE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--',
  'SOS': '...---...',
};

// ============= GUIA DE SOBREVIVÊNCIA — offline =============
export interface SurvivalSkill {
  id: string;
  category: 'agua' | 'fogo' | 'abrigo' | 'sinalizacao' | 'navegacao' | 'alimento' | 'primeiros_socorros';
  title: string;
  icon: string;
  severity: 'informativo' | 'urgente' | 'critico';
  duration: string;
  steps: string[];
  warnings?: string[];
}

export const SURVIVAL_SKILLS: SurvivalSkill[] = [
  // ÁGUA
  {
    id: 'purificar-agua',
    category: 'agua',
    title: 'Purificar água para beber',
    icon: 'droplet',
    severity: 'urgente',
    duration: '15-30 min',
    steps: [
      'Filtra grosseiramente com pano para remover partículas',
      'Método 1 — FERVER: mantenha fervura por 1 minuto (3 min em altitude >2000m)',
      'Método 2 — CLORO: 2 gotas de água sanitária (2,5%) por litro — esperar 30 min',
      'Método 3 — IODO: 5 gotas de tintura de iodo 2% por litro — esperar 30 min',
      'Método 4 — SOLAR: garrafa PET transparente no sol por 6h (SODIS — mata bactérias)',
      'Método 5 — FILTRO DIY: carvão + areia + cascalho em camadas em garrafa PET cortada',
      'Sempre armazene em recipiente limpo e fechado',
    ],
    warnings: [
      'Água barrenta/lodosa NUNCA deve ser bebida sem filtrar E purificar',
      'Cloro em excesso é tóxico — nunca mais que 4 gotas por litro',
      'SODIS não funciona em dias nublados',
      'Fervura não remove toxinas químicas — só mata micro-organismos',
    ],
  },
  {
    id: 'encontrar-agua',
    category: 'agua',
    title: 'Encontrar água na natureza',
    icon: 'droplet',
    severity: 'urgente',
    duration: 'variável',
    steps: [
      'Siga animais — trilhas convergem para água, especialmente ao amanhecer/entardecer',
      'Vales e depressões do terreno: água escorre para o ponto mais baixo',
      'Plantas indicadoras: samambaias, palmeiras, juncos crescem onde há água',
      'Coleta orvalho: amarrar pano limpo em pernas altas e torcer de manhã',
      'Coleta chuva: lona/cesto suspenso, ou diretamente de folhas grandes',
      'Plantas com água: cipó-titulo, babosa, cactos (cuidado com tóxicos)',
      'INCOMPATÍVEL com consumo: água salgada, salobra, estagnada com larvas',
    ],
    warnings: [
      'NUNCA beba urina, sangue ou água do mar — desidratam mais rápido',
      'Água clara não significa potável — sempre purifique',
    ],
  },

  // FOGO
  {
    id: 'acender-fogo',
    category: 'fogo',
    title: 'Acender fogo sem isqueiro',
    icon: 'flame',
    severity: 'informativo',
    duration: '5-30 min',
    steps: [
      'Reúna 3 níveis de material: isca (seca, fina), gravetos pequenos, lenha grossa',
      'Isca ideal: casca de árvore seca, capim seco, algodão, penas, fiapos de corda',
      'Método 1 — Fricção (arco):-madeira macia (moringa, balsa) + corda + vareta',
      'Método 2 — LENTE: óculos, lupa, fundo de garrafa PET com água + sol',
      'Método 3 — PEDRA: pederneira + aço (canivete) + estopa seca',
      'Método 4 — BATERIA + LÃ METÁLICA: pilha AA tocando lã de aço = faísca',
      'Faça pirâmide com isca no centro, acenda, sopre suavemente, adicione gravetos',
      'Sempre prepare local: afaste vegetação, cerque com pedras',
    ],
    warnings: [
      'Nunca deixe fogo sem supervisão — apague completamente com água e terra',
      'Em floresta seca, faça fogueira mínima — risco de incêndio florestal',
    ],
  },

  // ABRIGO
  {
    id: 'construir-abrigo',
    category: 'abrigo',
    title: 'Construir abrigo de emergência',
    icon: 'home',
    severity: 'informativo',
    duration: '1-2 horas',
    steps: [
      'Local: seco, elevado, longe de quedas de árvores, fora de leito de rio seco',
      'Tipo 1 — Tipi: 3 galhos longos em triângulo + folhas grandes/musgo',
      'Tipo 2 — DeUma-Árvore: galho apoiado em árvore, coberto com folhagem',
      'Tipo 3 — Buraco na neve: neve compactada isola do frio (em locais com neve)',
      'Isolamento do chão: CRÍTICO — coloque 15cm de folhas/galhos antes de deitar',
      'Tamanho: pequeno suficiente para aquecer com calor do corpo',
      'Direção: entrada de costas para o vento predominante',
    ],
    warnings: [
      'Perde mais calor pelo chão do que pelo ar — sempre isole',
      'Não durma diretamente em terra/rocha — sifão térmico causa hipotermia',
    ],
  },

  // SINALIZAÇÃO
  {
    id: 'sinalizar-resgate',
    category: 'sinalizacao',
    title: 'Sinalizar para resgate',
    icon: 'alert',
    severity: 'urgente',
    duration: 'contínuo',
    steps: [
      'Regra 3: três de qualquer coisa (fumaça, apito, fogo, som) = SOS internacional',
      'Fumaça: fogueira + vegetação verde úmida = coluna branca visível a km',
      'Espelho de sinal: CD, espelho, lata polida — reflita sol para aeronaves',
      'Sinalização solo: escrever SOS ou X grande em área aberta (rochas, roupas)',
      'Cor: laranja/magenta visível a 5+ km. Branco/azul não visível de longe',
      'À noite: 3 fogueiras em triângulo, lanterna piscando em padrão SOS',
      'Som: 3 apitos curtos, pausa, repetir. Apito ouve a 2+ km',
      'Luz: flash repetido (lanterna/câmera) em padrão SOS (3 curtos, 3 longos, 3 curtos)',
    ],
    warnings: [
      'NÃO acenda fogueira em floresta seca — pode virar incêndio',
      'Use fumaça apenas durante o dia — à noite use luz',
    ],
  },

  // NAVEGAÇÃO
  {
    id: 'navegar-sol',
    category: 'navegacao',
    title: 'Navegar pelo Sol',
    icon: 'sun',
    severity: 'informativo',
    duration: 'instantâneo',
    steps: [
      'Sol nasce a Leste (aprox.) e se põe a Oeste (aprox.)',
      'Meio-dia solar: Sol está a Norte (Brasil, hemisfério sul)',
      'Método do relógio: aponte ponteiro das horas para o Sol. Meio entre horas e 12h = Norte (hemisfério sul) ou Sul (hemisfério norte)',
      'Método da sombra: finque vareta, marque ponta da sombra. Espere 15 min, marque nova posição. Linha 1→2 = Oeste→Leste',
      'Sempre confirme com outro método se possível',
    ],
  },
  {
    id: 'navegar-estrelas',
    category: 'navegacao',
    title: 'Navegar pelo Cruzeiro do Sul',
    icon: 'star',
    severity: 'informativo',
    duration: 'instantâneo',
    steps: [
      'Localize a Constelação do Cruzeiro do Sul (4 estrelas em cruz + menor embaixo)',
      'Estenda o eixo maior da cruz 4,5 vezes para baixo',
      'Esse ponto é o Pólo Sul Celeste — sempre acima do pólo sul geográfico',
      'Desça verticalmente até o horizonte: esse é o Sul verdadeiro',
      'Útil no hemisfério sul — Brasil inteiro',
    ],
  },

  // ALIMENTO
  {
    id: 'alimento-selvagem',
    category: 'alimento',
    title: 'Regras de alimentação selvagem',
    icon: 'leaf',
    severity: 'urgente',
    duration: 'variável',
    steps: [
      'Regra de ouro: NÃO coma se não tem 100% de certeza da identificação',
      'Plantas seguras (Brasil): palmito, coquinho-azedo, jabuticaba, araçá, pitanga',
      'Plantas PERIGOSAS: mandioca brava (cianeto), mamona, comigo-ninguém-pode',
      'Insetos comestíveis: gafanhotos (cozinhe), larvas de palmeira, formigas tanajuras',
      'Pesca: peixes de água doce são seguros, exceto em águas poluídas',
      'Regra universal de teste (último recurso): esfregue na pele → espere 15 min → lábio → espere → língua → espere → mastigue NÃO engula → cuspa → se nada após 3h, coma pequena porção',
      'Lembre: humano vive 3 semanas sem comida, 3 DIAS sem água — priorize água',
    ],
    warnings: [
      'O teste universal é arriscado — alguns venenos agem horas depois',
      'Cogumelos: NUNCA teste — alguns parecem comestíveis mas são letais',
    ],
  },

  // PRIMEIROS SOCORROS EXTRAS
  {
    id: 'hipotermia',
    category: 'primeiros_socorros',
    title: 'Hipotermia',
    icon: 'snow',
    severity: 'critico',
    duration: 'imediato',
    steps: [
      'Reconheça: tremores, confusão, fala arrastada, sonolência, mãos pálidas',
      'Tremores PARADOS = caso grave — emergência',
      'Remova roupas molhadas com cuidado',
      'Aqueça GRADUALMENTE — nunca mergulhar em água quente (choque térmico)',
      'Cubra com cobertor, principalmente cabeça (40% do calor sai pela cabeça)',
      'Beba líquido morno e adoçado se consciente',
      'Contato pele-a-pele: pessoa saudável sob cobertor compartilha calor',
      'Sempre busque atendimento médico',
    ],
    warnings: [
      'NÃO aqueça membros primeiro — sangue frio volta ao coração e piora',
      'NÃO dê álcool — vasodilatação piora perda de calor',
    ],
  },
  {
    id: 'insolacao',
    category: 'primeiros_socorros',
    title: 'Insolação / Hipertermia',
    icon: 'sun',
    severity: 'critico',
    duration: 'imediato',
    steps: [
      'Reconheça: pele quente e SECA, confusão, temperatura > 40°C, sem suor',
      'É EMERGÊNCIA — pode ser fatal em 30 min',
      'Mova para local fresco e sombreado imediatamente',
      'Remova roupas, refresque com água morna (não gelada) e ventile',
      'Aplicar compressas nas axilas, virilha, pescoço (vasos grandes)',
      'NÃO dê líquidos se inconsciente ou confuso — risco de aspiração',
      'Se consciente: oferecer água com sal (1 colher de chá por litro)',
      'Chame 192 imediatamente',
    ],
    warnings: [
      'NÃO use gelo diretamente — causa vasoconstrição que piora resfriamento',
      'NÃO dê medicamentos sem orientação médica',
    ],
  },
];

// ============= PLANTAS: tóxicas e comestíveis comuns no Brasil =============
export interface PlantInfo {
  name: string;
  scientific: string;
  type: 'comestivel' | 'toxica' | 'medicinal';
  description: string;
  warning?: string;
}

export const COMMON_PLANTS: PlantInfo[] = [
  { name: 'Palmito Pupunha', scientific: 'Bactris gasipaes', type: 'comestivel', description: 'Palmeira nativa. Palmito doce, comestível cru ou cozido.' },
  { name: 'Pitanga', scientific: 'Eugenia uniflora', type: 'comestivel', description: 'Fruta vermelha doce-ácida, rica em vitamina C. Folhas fazem chá digestivo.' },
  { name: 'Araçá', scientific: 'Psidium cattleianum', type: 'comestivel', description: 'Parente da goiaba, fruta amarela/vermelha comestível.' },
  { name: 'Jabuticaba', scientific: 'Plinia cauliflora', type: 'comestivel', description: 'Fruta roxa direto no tronco. Comestível in natura.' },
  { name: 'Coco', scientific: 'Cocos nucifera', type: 'comestivel', description: 'Água de coco verde hidrata. Polpa nutritiva. Casca fibrosa acende fogo.' },
  { name: 'Babosa/Aloe', scientific: 'Aloe vera', type: 'medicinal', description: 'Gel da folha trata queimaduras, feridas. NÃO ingerir — laxante forte.' },

  { name: 'Mandioca Brava', scientific: 'Manihot esculenta (amarga)', type: 'toxica', description: 'Raiz contém cianeto. FOUNDAÇÃO — precisa descascar, ralar, espremer, secar, torrar para ser comestível (farinha). NUNCA comer crua.', warning: 'Cianeto — pode matar em minutos se ingerida crua' },
  { name: 'Mamona', scientific: 'Ricinus communis', type: 'toxica', description: 'Sementes contêm ricina — uma das toxinas mais letais conhecidas. 4 sementes matam adulto. Folhas menos tóxicas mas ainda perigosas.', warning: 'Ricina — sem antídoto' },
  { name: 'Comigo-ninguém-pode', scientific: 'Dieffenbachia spp.', type: 'toxica', description: 'Planta ornamental comum. Seiva causa edema de glote, asfixia se ingerida. Suco na pele causa queimadura.', warning: 'Edema de glote pode ser fatal' },
  { name: 'Trombeteira', scientific: 'Brugmansia suaveolens', type: 'toxica', description: 'Flor ornamental (trombeta). Todas as partes contêm alcaloides alucinógenos. Pode causar morte por depressão respiratória.', warning: 'Alucinógeno perigoso' },
  { name: 'Mamão-de-Espinho', scientific: 'Solanum mauritianum', type: 'toxica', description: 'Frutos verdes tóxicos. Apenas frutos totalmente maduros (amarelos) podem ser consumidos em pequenas quantidades.', warning: 'Solanina — distúrbios gastrointestinais e neurológicos' },
];

// ============= DICAS DE ECONOMIA DE BATERIA =============
export const BATTERY_TIPS = [
  { title: 'Modo avião + GPS', desc: 'Ative modo avião mas ligue só o GPS. Localização ainda funciona e economia é enorme.' },
  { title: 'Brilho mínimo', desc: 'Reduza brilho a 30% ou menos. Tela é o maior consumidor de bateria.' },
  { title: 'Fechar apps em background', desc: 'Apps como WhatsApp, Instagram, TikTok drenam bateria em background. Feche todos.' },
  { title: 'Desligar vibração', desc: 'Motor de vibração consome mais que toque sonoro em many situations.' },
  { title: 'Power bank de emergência', desc: 'Mantenha sempre um power bank carregado no kit de emergência.' },
  { title: 'Carregador solar', desc: 'Pequenos painéis solares portáteis carregam celular em dia de sol.' },
  { title: 'Carregar em pontos públicos', desc: 'Rodoviárias, aeroportos, bibliotecas, shoppings — sempre há tomadas.' },
  { title: 'Modo economia de bateria', desc: 'Ative no celular — desliga processamentos em background.' },
];

// ============= CALCULADORA DE SOBREVIVÊNCIA =============
// Regra: 3 minutos sem ar, 3 horas sem abrigo (extremos), 3 dias sem água, 3 semanas sem comida
export const SURVIVAL_RULE_OF_3 = [
  { label: 'Ar', time: '3 minutos', icon: 'wind', desc: 'Sem oxigênio (afogamento, soterramento)' },
  { label: 'Abrigo', time: '3 horas', icon: 'home', desc: 'Em extremos de temperatura (hipotermia/insolação)' },
  { label: 'Água', time: '3 dias', icon: 'droplet', desc: 'Sem hidratação — máximo crítico' },
  { label: 'Comida', time: '3 semanas', icon: 'utensils', desc: 'Sem alimento — corpo entra em economia' },
];

// Cálculo de água por pessoa
// 2L/dia para hidratação mínima
// +1L/dia em clima quente
// +0.5L/dia se caminhando
export const WATER_PER_PERSON_PER_DAY_LITERS = 3;

// ============= INFORMAÇÕES DO MODO SEM SINAL — para mostrar no painel =============
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
    title: 'SMS funciona com 1 barra',
    description: 'SMS é protocolo 2G de baixa potência. Funciona onde dados 3G/4G não chegam.',
    icon: 'message-square',
    availability: 'qualquer-celular',
    worksOffline: false,
    steps: [
      'Ative modo avião, depois ative apenas sinal celular',
      'Desative dados móveis (deixa só 2G/GSM)',
      'Aguarde até ver 1 barra de sinal',
      'Envie SMS curto (até 160 caracteres)',
      'SMS pode chegar em 1-30 minutos se rede congestionada',
    ],
  },
  {
    id: 'ligacao-emergencia',
    title: 'Ligações 190/192/193 funcionam sem SIM',
    description: 'Por lei internacional, qualquer celular conecta a emergências mesmo sem chip operadora.',
    icon: 'phone',
    availability: 'qualquer-celular',
    worksOffline: false,
    steps: [
      'Mesmo sem chip, disque 192 (SAMU), 190 (Polícia), 193 (Bombeiros)',
      'Aparelho conecta à operadora disponível na área',
      'Use quando seu chip não tem sinal mas outra operadora tem',
    ],
  },
  {
    id: 'wifi-publico',
    title: 'WiFi público mais próximo',
    description: 'WiFi Grátis Brasil tem 87 mil pontos em praças, escolas, rodoviárias.',
    icon: 'wifi',
    availability: 'qualquer-celular',
    worksOffline: false,
    steps: [
      'Ative WiFi no celular',
      'Procure rede "WiFi Brasil" ou "Brasil WiFi"',
      'Conecte — geralmente sem senha',
      'Abra navegador — pode haver portal cativo',
      'Aceite termos e use',
    ],
  },
  {
    id: 'sos-satelite',
    title: 'SOS via Satélite (iPhone 14+)',
    description: 'Apple/Globalstar — sem chip, sem WiFi, sem nada. Só céu aberto.',
    icon: 'satellite',
    availability: 'celular-topo',
    worksOffline: true,
    steps: [
      'Apenas iPhone 14 ou superior',
      'Em área sem cobertura, tente ligar para emergência',
      'Aparelho oferece "SOS via Satélite"',
      'Siga interface guiada — aponte celular para satélite',
      'Responda questionário de emergência',
      'Conecta via Globalstar, mensagem chega em 15s-3min',
    ],
  },
  {
    id: 'mesh-bluetooth',
    title: 'Mesh Bluetooth',
    description: 'Apps como Bridgefy/Briar criam rede mesh via Bluetooth entre celulares próximos.',
    icon: 'bluetooth',
    availability: 'apenas-com-app',
    worksOffline: true,
    steps: [
      'Instale Bridgefy (offline-ready) antes de precisar',
      'Ative Bluetooth e localização',
      'Mensagens saltam de celular em celular',
      'Alcance: 100m entre cada par',
      'Em manifestações/desastres funciona sem internet',
    ],
  },
];
