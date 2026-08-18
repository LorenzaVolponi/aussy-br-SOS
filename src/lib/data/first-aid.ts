// Conteúdo offline de primeiros socorros — curadoria estática para leigos.
// Fontes institucionais verificadas em 2026-08-18. Não substitui atendimento profissional.

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
  verifiedAt: string;
  sourceLabel: string;
  sourceUrls: string[];
}

const VERIFIED_AT = '2026-08-18';
const AHA_BLS = 'https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support';
const AHA_FIRST_AID = 'https://cpr.heart.org/en/resuscitation-science/2024-first-aid-guidelines';
const AHA_DROWNING = 'https://professional.heart.org/en/science-news/2024-aha-and-aap-focused-update-on-special-circumstances-resuscitation-following-drowning/top-things-to-know';
const SAMU_192 = 'https://www.gov.br/saude/pt-br/composicao/saes/samu-192';
const MS_OFIDICOS = 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/animais-peconhentos/acidentes-ofidicos/faq/faq';

export const FIRST_AID_GUIDES: FirstAidGuide[] = [
  {
    id: 'rcp-adulto',
    title: 'RCP — Adulto (Parada Cardíaca)',
    category: 'cardio',
    icon: 'heart',
    severity: 'critico',
    summary: 'Adulto não responde e não respira normalmente: acione o SAMU 192 e inicie RCP.',
    steps: [
      'Confirme que o local é seguro para você e para a vítima',
      'Verifique se a pessoa responde e se respira normalmente; respiração agônica/gasping não é respiração normal',
      'Acione o SAMU 192 e peça um DEA/AED, se houver; coloque o telefone no viva-voz para seguir a orientação do regulador',
      'Inicie compressões no centro do tórax, fortes e rápidas, a 100–120 por minuto',
      'Comprima cerca de 5–6 cm no adulto e permita retorno completo do tórax entre compressões',
      'Se você for treinado e estiver disposto a ventilar, use ciclos de 30 compressões para 2 ventilações',
      'Se não for treinado ou não puder ventilar, faça RCP somente com as mãos, com compressões contínuas',
      'Use o DEA/AED assim que estiver disponível e siga exatamente as instruções do aparelho',
      'Continue até a pessoa apresentar sinais de vida, a equipe de emergência assumir ou o local deixar de ser seguro',
    ],
    warnings: [
      'NÃO interrompa compressões sem necessidade',
      'NÃO atrase a RCP para procurar medicamentos ou equipamentos que não estejam imediatamente disponíveis',
      'Em afogamento ou outras causas por falta de oxigênio, ventilações têm importância especial quando o socorrista é treinado',
    ],
    whenToCall: ['SAMU 192 imediatamente em pessoa inconsciente que não respira normalmente'],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'American Heart Association 2025 + Ministério da Saúde / SAMU 192',
    sourceUrls: [AHA_BLS, SAMU_192],
  },
  {
    id: 'engasgo',
    title: 'Engasgo / Obstrução Grave — Adulto',
    category: 'trauma',
    icon: 'wind',
    severity: 'critico',
    summary: 'Se a pessoa não consegue falar, tossir de forma eficaz ou respirar, trate como obstrução grave e acione emergência.',
    steps: [
      'Se a pessoa ainda consegue tossir e falar, incentive a tosse e observe de perto',
      'Se houver sinais de obstrução grave, acione o SAMU 192',
      'Faça 5 golpes firmes nas costas, entre as escápulas',
      'Em seguida faça 5 compressões abdominais',
      'Alterne 5 golpes nas costas e 5 compressões abdominais até o objeto sair ou a pessoa ficar inconsciente',
      'Em gestação avançada ou quando não for possível envolver o abdome, use compressões torácicas em vez de abdominais',
      'Se a pessoa ficar inconsciente, inicie RCP começando por compressões e siga a orientação do SAMU',
      'Ao abrir a via aérea durante a RCP, retire somente objeto que esteja claramente visível',
    ],
    warnings: [
      'NÃO faça varredura digital às cegas dentro da boca',
      'NÃO use compressões abdominais em bebês menores de 1 ano; o protocolo infantil é diferente',
      'Dispositivos de sucção para desengasgo não substituem o protocolo recomendado',
    ],
    whenToCall: ['SAMU 192 em obstrução grave ou se a pessoa ficar inconsciente'],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'American Heart Association 2025 + Ministério da Saúde / SAMU 192',
    sourceUrls: [AHA_BLS, SAMU_192],
  },
  {
    id: 'hemorragia',
    title: 'Hemorragia — Sangramento Grave',
    category: 'trauma',
    icon: 'droplet',
    severity: 'critico',
    summary: 'Sangramento intenso pode matar em minutos. Acione o SAMU 192 e aplique pressão direta imediatamente.',
    steps: [
      'Proteja-se do contato com sangue usando luvas, se disponíveis',
      'Localize a fonte do sangramento e aplique pressão manual firme e contínua diretamente sobre o ferimento',
      'Use gaze, pano limpo ou curativo hemostático, se disponível, mantendo pressão sem ficar levantando para conferir',
      'Se houver sangramento com risco de vida em um membro e a pressão direta não controlar, use torniquete comercial se disponível e se souber utilizá-lo, seguindo as instruções do dispositivo',
      'Se a região não permitir torniquete, o tamponamento da ferida pode ser usado por pessoa treinada',
      'Mantenha a pessoa aquecida, observe respiração e nível de consciência e aguarde o atendimento de emergência',
    ],
    warnings: [
      'NÃO eleve o membro como substituto da pressão direta ou do controle definitivo da hemorragia',
      'NÃO remova objeto profundamente encravado; aplique pressão ao redor e aguarde atendimento especializado',
      'NÃO afrouxe ou retire um torniquete que controlou hemorragia grave enquanto aguarda o serviço de emergência',
    ],
    whenToCall: ['SAMU 192 imediatamente em sangramento que jorra, forma poça, não cessa com pressão ou causa alteração de consciência'],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'AHA / American Red Cross First Aid 2024 + Ministério da Saúde / SAMU 192',
    sourceUrls: [AHA_FIRST_AID, SAMU_192],
  },
  {
    id: 'queimadura',
    title: 'Queimaduras',
    category: 'queimadura',
    icon: 'flame',
    severity: 'urgente',
    summary: 'Interrompa a exposição e resfrie queimaduras térmicas com água corrente limpa e fresca.',
    steps: [
      'Afaste a pessoa da fonte de calor somente quando isso puder ser feito com segurança',
      'Resfrie a queimadura térmica com água corrente limpa e fresca por cerca de 5–20 minutos',
      'Retire anéis, relógios, cintos e itens apertados antes que o inchaço aumente, desde que não estejam grudados',
      'Depois de resfriar, cubra frouxamente com pano limpo ou curativo seco não aderente enquanto busca avaliação quando indicada',
      'Mantenha o restante do corpo aquecido para reduzir risco de hipotermia, especialmente em queimaduras extensas e em crianças',
    ],
    warnings: [
      'NÃO use gelo diretamente sobre a queimadura',
      'NÃO arranque roupa ou material grudado à pele',
      'NÃO fure bolhas',
      'NÃO aplique pasta de dente, manteiga, óleo, café ou outras receitas caseiras',
    ],
    whenToCall: [
      'SAMU 192 em queimadura grave, elétrica, química ou com dificuldade para respirar/fumaça',
      'Procure avaliação rápida para queimadura profunda, maior que a palma da mão ou envolvendo face, mãos, pés ou genitais',
    ],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'AHA / American Red Cross First Aid 2024 + Ministério da Saúde / SAMU 192',
    sourceUrls: [AHA_FIRST_AID, SAMU_192],
  },
  {
    id: 'afogamento',
    title: 'Afogamento',
    category: 'afogamento',
    icon: 'waves',
    severity: 'critico',
    summary: 'Priorize resgate seguro, acione o SAMU 192 e inicie ressuscitação imediatamente se a pessoa não respirar normalmente.',
    steps: [
      'Não entre na água se isso colocar você em risco; prefira alcançar ou lançar um objeto flutuante e peça ajuda especializada',
      'Após retirar a pessoa com segurança, avalie resposta e respiração',
      'Acione o SAMU 192',
      'Se não respirar normalmente, inicie RCP imediatamente',
      'Se você for treinado, inclua ventilações na RCP; após afogamento, a ventilação é especialmente importante por causa da falta de oxigênio',
      'Use DEA/AED assim que estiver disponível, sem atrasar RCP de qualidade',
      'Se a pessoa estiver respirando mas inconsciente, mantenha a via aérea protegida, use posição lateral de recuperação quando apropriado e monitore continuamente',
    ],
    warnings: [
      'NÃO faça compressões abdominais para tentar retirar água dos pulmões',
      'NÃO atrase a RCP para tentar drenar água',
      'A pessoa pode precisar de avaliação médica mesmo após recuperar a respiração, especialmente se houve perda de consciência, tosse persistente ou falta de ar',
    ],
    whenToCall: ['SAMU 192 em qualquer afogamento com perda de consciência, dificuldade respiratória ou necessidade de resgate'],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'AHA / AAP Drowning Focused Update 2024 + Ministério da Saúde / SAMU 192',
    sourceUrls: [AHA_DROWNING, SAMU_192],
  },
  {
    id: 'convulsao',
    title: 'Convulsão',
    category: 'cardio',
    icon: 'zap',
    severity: 'urgente',
    summary: 'Proteja a pessoa contra lesões, cronometre a crise e não coloque nada na boca.',
    steps: [
      'Ajude a pessoa a ficar no chão e afaste objetos que possam machucá-la',
      'Proteja a cabeça com algo macio se puder fazer isso sem restringir os movimentos',
      'Cronometre a convulsão',
      'Coloque a pessoa de lado em posição de recuperação quando isso puder ser feito com segurança',
      'Permaneça com ela e observe respiração e recuperação da consciência',
    ],
    warnings: [
      'NÃO segure ou imobilize a pessoa durante a convulsão',
      'NÃO coloque objetos, dedos, líquidos, alimentos ou medicamentos na boca durante a crise ou enquanto estiver com consciência reduzida',
    ],
    whenToCall: [
      'SAMU 192 se for a primeira convulsão, durar mais de 5 minutos ou houver crises repetidas sem recuperação entre elas',
      'SAMU 192 se ocorrer na água, houver trauma, dificuldade para respirar/engasgo, gravidez, bebê menor de 6 meses ou ausência de retorno ao estado habitual em 5–10 minutos',
    ],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'AHA / American Red Cross First Aid 2024 + Ministério da Saúde / SAMU 192',
    sourceUrls: [AHA_FIRST_AID, SAMU_192],
  },
  {
    id: 'choque-eletrico',
    title: 'Choque Elétrico',
    category: 'trauma',
    icon: 'zap',
    severity: 'critico',
    summary: 'Não toque na vítima até ter certeza de que a fonte elétrica foi desligada e o local está seguro.',
    steps: [
      'Afaste-se e acione ajuda se houver alta tensão, fios caídos ou risco de arco elétrico',
      'Desligue a energia pelo disjuntor ou fonte segura quando isso puder ser feito sem se expor ao risco',
      'Somente depois de o local estar seguro, verifique resposta e respiração',
      'Acione o SAMU 192; em risco elétrico, incêndio ou resgate técnico, acione também os Bombeiros 193',
      'Se a pessoa não respirar normalmente, inicie RCP e use DEA/AED assim que disponível',
      'Queimaduras elétricas podem ter lesão interna importante mesmo quando a pele parece pouco alterada',
    ],
    warnings: [
      'NÃO toque na vítima enquanto ela puder estar energizada',
      'NÃO se aproxime de fio de alta tensão ou fio caído sem liberação de equipe especializada',
    ],
    whenToCall: ['SAMU 192 em choque elétrico com vítima; Bombeiros 193 quando houver risco elétrico ativo ou necessidade de resgate'],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'Ministério da Saúde / SAMU 192 + princípios gerais de segurança em primeiros socorros AHA/Red Cross',
    sourceUrls: [SAMU_192, AHA_FIRST_AID],
  },
  {
    id: 'desmaio',
    title: 'Desmaio / Perda Transitória de Consciência',
    category: 'cardio',
    icon: 'moon',
    severity: 'moderado',
    summary: 'Proteja contra queda, verifique respiração e trate perda de consciência prolongada ou associada a sinais de alarme como emergência.',
    steps: [
      'Se a pessoa disser que vai desmaiar, ajude-a a sentar ou deitar em local seguro',
      'Se perder a consciência, verifique se respira normalmente',
      'Se estiver respirando e não houver suspeita de trauma que impeça, mantenha a via aérea protegida e considere posição lateral de recuperação',
      'Observe até recuperar completamente a consciência e evite que se levante de forma brusca',
      'Se não respirar normalmente, trate como parada cardíaca: acione o SAMU 192 e inicie RCP',
    ],
    warnings: [
      'NÃO ofereça alimento ou bebida enquanto a pessoa estiver confusa ou com consciência reduzida',
      'NÃO presuma que todo desmaio é benigno quando houver dor no peito, falta de ar, sinais neurológicos, trauma ou recuperação lenta',
    ],
    whenToCall: ['SAMU 192 se não recuperar rapidamente, não respirar normalmente ou houver dor no peito, falta de ar, trauma, convulsão ou sinais de AVC'],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'AHA / American Red Cross First Aid 2024 + Ministério da Saúde / SAMU 192',
    sourceUrls: [AHA_FIRST_AID, SAMU_192],
  },
  {
    id: 'picada-cobra',
    title: 'Acidente por Serpente',
    category: 'ambiental',
    icon: 'bug',
    severity: 'urgente',
    summary: 'Procure atendimento médico imediatamente. Não faça torniquete, corte ou sucção.',
    steps: [
      'Mantenha a pessoa em repouso e reduza movimentação desnecessária',
      'Retire anéis, relógios e itens apertados do membro atingido antes que ocorra inchaço',
      'Lave o local com água e sabão quando isso puder ser feito sem atrasar o transporte',
      'Mantenha o membro em posição confortável e, conforme orientação do Ministério da Saúde, elevado em relação ao corpo quando possível',
      'Procure imediatamente um serviço de saúde; acione o SAMU 192 quando houver gravidade, dificuldade de transporte ou orientação do serviço local',
      'Se for possível fotografar a serpente à distância e sem risco, a imagem pode ajudar na identificação; não tente capturar ou matar o animal',
    ],
    warnings: [
      'NÃO faça garrote ou torniquete',
      'NÃO corte, perfure ou chupe o local da picada',
      'NÃO aplique substâncias, ervas, café, querosene ou outras receitas caseiras',
      'NÃO perca tempo tentando capturar a serpente',
    ],
    whenToCall: ['Todo acidente por serpente exige avaliação médica rápida; SAMU 192 quando houver emergência ou transporte inseguro/demorado'],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'Ministério da Saúde — Acidentes Ofídicos + SAMU 192',
    sourceUrls: [MS_OFIDICOS, SAMU_192],
  },
  {
    id: 'avc-suspeita',
    title: 'Suspeita de AVC',
    category: 'cardio',
    icon: 'brain',
    severity: 'critico',
    summary: 'Fraqueza súbita de um lado, alteração da fala ou assimetria facial exigem atendimento imediato.',
    steps: [
      'Observe sinais súbitos usando a lógica FAST: Face (rosto assimétrico), Arm (fraqueza em um braço), Speech (fala alterada), Time (tempo é crítico)',
      'Acione o SAMU 192 imediatamente se houver qualquer sinal compatível',
      'Anote ou memorize o horário em que a pessoa foi vista bem pela última vez ou quando os sintomas começaram',
      'Mantenha a pessoa em segurança, observe respiração e nível de consciência e siga as orientações do regulador do SAMU',
      'Se ficar inconsciente e não respirar normalmente, inicie RCP',
    ],
    warnings: [
      'NÃO espere os sintomas melhorarem para buscar ajuda',
      'NÃO ofereça comida, bebida ou medicamentos a uma pessoa com suspeita de AVC enquanto aguarda avaliação profissional',
    ],
    whenToCall: ['SAMU 192 imediatamente diante de suspeita de AVC'],
    verifiedAt: VERIFIED_AT,
    sourceLabel: 'AHA / American Red Cross First Aid 2024 + Ministério da Saúde / SAMU 192',
    sourceUrls: [AHA_FIRST_AID, SAMU_192],
  },
];

// Frases úteis em emergência (PT/EN/ES) — conteúdo linguístico, não protocolo clínico.
export const EMERGENCY_PHRASES = [
  { pt: 'Preciso de ajuda médica', en: 'I need medical help', es: 'Necesito ayuda médica' },
  { pt: 'Onde fica o hospital mais próximo?', en: 'Where is the nearest hospital?', es: '¿Dónde está el hospital más cercano?' },
  { pt: 'Estou perdido', en: 'I am lost', es: 'Estoy perdido' },
  { pt: 'Ligue para a polícia', en: 'Call the police', es: 'Llame a la policía' },
  { pt: 'Tive um acidente', en: 'I had an accident', es: 'Tuve un accidente' },
  { pt: 'Minha localização é', en: 'My location is', es: 'Mi ubicación es' },
];

// Checklist local de preparação. Quantidades e tratamento de água devem seguir
// a Defesa Civil/autoridade sanitária local; este bloco não prescreve doses.
export const EMERGENCY_KIT_CHECKLIST = [
  { category: 'Água', items: ['Água potável armazenada', 'Recipientes limpos e vedados', 'Orientação oficial local para reposição/tratamento de água'] },
  { category: 'Alimento', items: ['Alimentos não perecíveis', 'Necessidades alimentares específicas', 'Abridor manual quando necessário'] },
  { category: 'Primeiros socorros', items: ['Gazes e curativos', 'Ataduras', 'Fita adesiva', 'Luvas descartáveis', 'Soro fisiológico para limpeza'] },
  { category: 'Saúde pessoal', items: ['Medicamentos pessoais prescritos', 'Lista de alergias/condições de saúde', 'Receitas e contatos médicos importantes'] },
  { category: 'Ferramentas', items: ['Lanterna', 'Rádio a pilha ou manivela', 'Pilhas reservas', 'Apito', 'Power bank carregado'] },
  { category: 'Documentos', items: ['Cópias protegidas de documentos', 'Cartão SUS/plano de saúde', 'Contatos de emergência', 'Mapa local impresso quando útil'] },
];
