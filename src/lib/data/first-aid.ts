// Conteúdo offline de emergência — baseado em protocolos SAMU/Microsoft/Red Cross
// Funciona 100% offline (pré-cacheado pelo Service Worker)

export interface FirstAidGuide {
  id: string;
  title: string;
  category: 'trauma' | 'cardio' | 'ambiental' | 'afogamento' | 'queimadura' | 'intoxicacao' | 'parto';
  icon: string;
  severity: 'critico' | 'urgente' | 'moderado';
  summary: string;
  steps: string[];
  warnings: string[];
  whenToCall: string[];
}

export const FIRST_AID_GUIDES: FirstAidGuide[] = [
  {
    id: 'rcp-adulto',
    title: 'RCP — Adulto (Parada Cardíaca)',
    category: 'cardio',
    icon: 'heart',
    severity: 'critico',
    summary: 'Pessoa não responde e não respira normalmente. Inicie compressões imediatamente.',
    steps: [
      'Verifique segurança do local antes de se aproximar',
      'Sacuda a pessoa pelos ombros e grite: "Você está bem?"',
      'Se não responde, chame 192 (SAMU) ou peça para alguém chamar',
      'Abra as vias aéreas: incline a cabeça para trás e levante o queixo',
      'Verifique respiração por até 10 segundos (peito sobe/desce)',
      'Se não respira normalmente, inicie compressões',
      'Coloque as duas mãos sobrepostas no centro do peito (entre os mamilos)',
      'Comprima firme e rápido: 5-6cm de profundidade, 100-120 compressões/min',
      'Após 30 compressões, dê 2 ventilações (boca-a-boca) se treinado',
      'Continue 30:2 até chegada do SAMU ou AED disponível',
    ],
    warnings: [
      'NÃO pare as compressões por mais de 10 segundos',
      'NÃO faça ventilações se não foi treinado — faça apenas compressões contínuas',
      'Se houver AED (desfibrilador), use imediatamente seguindo as instruções',
    ],
    whenToCall: ['Sempre chame 192', 'Se sozinho, ligue antes de iniciar compressões'],
  },
  {
    id: 'engasgo',
    title: 'Engasgo / Sufocamento — Adulto',
    category: 'trauma',
    icon: 'wind',
    severity: 'critico',
    summary: 'Pessoa não consegue falar, tossir ou respirar. Use a Manobra de Heimlich.',
    steps: [
      'Pergunte: "Está engasgado?" — se não consegue responder, age imediatamente',
      'Posicione-se atrás da pessoa e abrace-a pela cintura',
      'Feche uma mão em punho e coloque-a entre o umbigo e o esterno',
      'Cubra o punho com a outra mão',
      'Faça 5 compressões abdominais para dentro e para cima (Manobra de Heimlich)',
      'Repita até desobstruir ou a pessoa perder a consciência',
      'Se inconsciente: inicie RCP (ver guia RCP-adulto)',
    ],
    warnings: [
      'NÃO faça a manobra em crianças menores de 1 ano (use tapas nas costas)',
      'NÃO introduza dedos na garganta às cegas — pode empurrar o objeto mais fundo',
    ],
    whenToCall: ['Chame 192 imediatamente se a pessoa para de respirar'],
  },
  {
    id: 'hemorragia',
    title: 'Hemorragia — Sangramento Grave',
    category: 'trauma',
    icon: 'droplet',
    severity: 'critico',
    summary: 'Sangramento abundante que não para com pressão direta.',
    steps: [
      'Use luvas se disponível (proteção contra doenças)',
      'Aplique compressão direta sobre o ferimento com pano limpo',
      'Mantenha pressão firme por pelo menos 10 minutos sem interromper',
      'Se pano encharcar, coloque outro por cima — NÃO remova o original',
      'Eleve o membro ferido acima do nível do coração se possível',
      'Se não para: use torniquete apenas em membros, 5-7cm acima do ferimento',
      'Marque a hora da aplicação do torniquete na testa da vítima',
      'Mantenha a vítima aquecida e deitada (evita choque hipovolêmico)',
    ],
    warnings: [
      'NÃO remova objetos perfurantes (facas, vidros) — estabilize ao redor',
      'NÃO use torniquete em sangramentos de cabeça, pescoço ou tronco',
      'Torniquete é última opção — pode causar perda do membro',
    ],
    whenToCall: ['Sempre 192 em hemorragia grave'],
  },
  {
    id: 'queimadura',
    title: 'Queimaduras',
    category: 'queimadura',
    icon: 'flame',
    severity: 'urgente',
    summary: 'Resfrie com água corrente por 20 minutos. Nunca use gelo ou pasta de dente.',
    steps: [
      'Remova a fonte de calor/eletricidade/químico com segurança',
      'Resfrie a área com água corrente temperatura ambiente por 20 minutos',
      'Remova roupas/adornos NÃO grudados na queimadura',
      'Cubra com pano limpo úmido ou gaze estéril',
      'Mantenha a vítima aquecida (queimaduras grandes causam hipotermia)',
      'Dê água para beber em pequenos goles se consciente',
    ],
    warnings: [
      'NÃO use gelo (causa lesão por frio)',
      'NÃO use pasta de dente, manteiga, óleo, café, urina',
      'NÃO fure bolhas',
      'NÃO arranque roupas grudadas — corte ao redor',
    ],
    whenToCall: ['192 se: queimadura > 10% corpo, face, mãos, genitália, vias aéreas, elétrica, química'],
  },
  {
    id: 'afogamento',
    title: 'Afogamento',
    category: 'afogamento',
    icon: 'waves',
    severity: 'critico',
    summary: 'Retire da água com segurança. Inicie RCP se não respira.',
    steps: [
      'NÃO entre na água se não for nadador treinado — jogue boia/corda',
      'Após retirar, verifique consciência e respiração',
      'Se não respira: inicie RCP (ver guia RCP-adulto)',
      'Em afogamento, dê 5 ventilações iniciais antes das compressões',
      'Mantenha a vítima de lado (posição lateral de segurança) se respira',
      'Remova roupas molhadas, seque e agasalhe (hipotermia é comum)',
      'Mesmo se recuperada, leve ao hospital (edema pulmonar tardio)',
    ],
    warnings: [
      'NÃO tente compressões abdominais rotineiramente — só se obstrução visível',
      'NÃO dê comida ou bebida',
      'Todo afogado precisa de avaliação médica, mesmo se aparenta bem',
    ],
    whenToCall: ['192 sempre, mesmo após recuperação'],
  },
  {
    id: 'convulsao',
    title: 'Convulsão',
    category: 'cardio',
    icon: 'zap',
    severity: 'urgente',
    summary: 'Proteja a pessoa de lesões. NÃO coloque nada na boca.',
    steps: [
      'Mantenha a calma e cronometre a duração da convulsão',
      'Afaste objetos perigosos do redor',
      'Coloque algo macio (casaco) sob a cabeça',
      'Vire a pessoa de lado após a convulsão (evita aspiração)',
      'Afrouxe roupas apertadas no pescoço',
      'Permaneça até recuperação completa da consciência',
    ],
    warnings: [
      'NÃO segure a pessoa (causa fraturas)',
      'NÃO coloque nada na boca (não engolem língua — é mito)',
      'NÃO dê água ou comida até estar totalmente consciente',
    ],
    whenToCall: ['192 se: primeira convulsão, > 5 min, grávida, lesão, não recupera consciência'],
  },
  {
    id: 'choque-eletrico',
    title: 'Choque Elétrico',
    category: 'trauma',
    icon: 'zap',
    severity: 'critico',
    summary: 'Desligue a fonte de energia ANTES de tocar na vítima.',
    steps: [
      'NÃO toque na vítima enquanto estiver energizada',
      'Desligue a fonte: disjuntor, fusível, ou use objeto seco não condutor (madeira)',
      'Se alta tensão (poste, fios), afaste-se 10m e chame bombeiros 193',
      'Após desligar: verifique respiração e inicie RCP se necessário',
      'Trate queimaduras de entrada e saída (ver guia queimaduras)',
      'Mantenha deitado com pernas elevadas (choque elétrico causa hipotensão)',
    ],
    warnings: [
      'NÃO use objetos molhados ou metálicos para afastar fios',
      'NÃO se aproxime de fios caídos no chão (arco elétrico)',
    ],
    whenToCall: ['192 + 193 (Bombeiros) sempre'],
  },
  {
    id: 'desmaio',
    title: 'Desmaio (Síncope)',
    category: 'cardio',
    icon: 'moon',
    severity: 'moderado',
    summary: 'Deite a pessoa e eleve as pernas. Verifique respiração.',
    steps: [
      'Deite a pessoa de costas em local seguro',
      'Eleve as pernas 30cm (melhora fluxo cerebral)',
      'Afrouxe roupas apertadas (gola, cinto, gravata)',
      'Verifique respiração',
      'Mantenha vias aéreas abertas (inclinação da cabeça)',
      'Quando acordar, mantenha deitada por mais 10 minutos',
      'Ofereça água após recuperação completa',
    ],
    warnings: [
      'NÃO dê tapas no rosto',
      'NÃO dê cheiro de álcool (pode causar broncoaspiração)',
      'NÃO levante a pessoa rapidamente',
    ],
    whenToCall: ['192 se: não recupera em 1 min, convulsionou, dor no peito, grávida, idoso'],
  },
  {
    id: 'hemorragia-nasal',
    title: 'Sangramento Nasal (Epistaxe)',
    category: 'trauma',
    icon: 'droplet',
    severity: 'moderado',
    summary: 'Comprima as narinas por 10-15 min. Incline a cabeça PARA FRENTE.',
    steps: [
      'Sente a pessoa e incline a cabeça LEVEMENTE para frente (não para trás!)',
      'Comprima as narinas (parte mole) firmemente com dedos por 10-15 min',
      'Respire pela boca',
      'Aplique compressa fria na testa e nariz',
      'Após parar: não assoe o nariz por 4 horas',
    ],
    warnings: [
      'NÃO incline a cabeça para trás (sangue vai para o estômago → vômito)',
      'NÃO deite a pessoa',
      'NÃO tampe com algodão/papel (remover pode reabrir sangramento)',
    ],
    whenToCall: ['192 se: > 20 min, PRESSÃO ALTA, pós-trauma (suspeita fratura), uso de anticoagulante'],
  },
  {
    id: 'picada-cobra',
    title: 'Picada de Cobra',
    category: 'ambiental',
    icon: 'bug',
    severity: 'urgente',
    summary: 'Mantenha calma, imobilize o membro, NÃO faça torniquete.',
    steps: [
      'Acalme a vítima (ansiedade acelera veneno)',
      'Imobilize o membro picado (tipo tala) — movimento acelera absorção',
      'Mantenha o membro em nível do coração',
      'Remova anéis, relógios, roupas apertadas (vai inchar)',
      'Lave o local com água e sabão',
      'Anote o horário da picada e transporte IMEDIATAMENTE para hospital',
      'Se possível, fotografe a cobra à distância (não perca tempo caçando)',
    ],
    warnings: [
      'NÃO faça torniquete',
      'NÃO corte o local nem chupe o veneno',
      'NÃO dê álcool ou cafeína',
      'NÃO coloque gelo',
    ],
    whenToCall: ['192 — TODA picada de cobra é emergência médica'],
  },
];

// Frases úteis em emergência (PT/EN/ES) — para estrangeiros no Brasil
export const EMERGENCY_PHRASES = [
  { pt: 'Preciso de ajuda médica', en: 'I need medical help', es: 'Necesito ayuda médica' },
  { pt: 'Onde fica o hospital mais próximo?', en: 'Where is the nearest hospital?', es: '¿Dónde está el hospital más cercano?' },
  { pt: 'Estou perdido', en: 'I am lost', es: 'Estoy perdido' },
  { pt: 'Ligue para a polícia', en: 'Call the police', es: 'Llame a la policía' },
  { pt: 'Tive um acidente', en: 'I had an accident', es: 'Tuve un accidente' },
  { pt: 'Minha localização é', en: 'My location is', es: 'Mi ubicación es' },
];

// Checklist de kit de emergência (recomendado ANATEL/Defesa Civil)
export const EMERGENCY_KIT_CHECKLIST = [
  { category: 'Água', items: ['4 litros por pessoa/dia', 'Para 3 dias mínimo', 'Purificação: cloro/hipoclorito'] },
  { category: 'Alimento', items: ['Não perecíveis', 'Barras de cereal', 'Conservas com abridor manual'] },
  { category: 'Primeiros socorros', items: ['Ataduras', 'Soro fisiológico', 'Antisséptico', 'Analgésicos', 'Luvas descartáveis'] },
  { category: 'Ferramentas', items: ['Canivete suíço', 'Lanterna (manual ou solar)', 'Rádio AM/FM a pilha', 'Pilhas reservas'] },
  { category: 'Documentos', items: ['Cópia RG/CPF', 'Cópia cartão SUS', 'Lista telefônica', 'Mapa local impresso'] },
  { category: 'Comunicação', items: ['Power bank carregado', 'Carregador solar', 'Apito', 'Papel e caneta'] },
];
