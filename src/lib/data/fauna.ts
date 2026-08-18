// Fauna brasileira — orientação inicial para leigos, não protocolo clínico.
// Revisado em 2026-08-18 com fontes institucionais. Diagnóstico, classificação,
// soroterapia, medicação, dose e monitoramento pertencem ao serviço de saúde.

export interface ProtocoloFauna {
  id: string
  categoria: 'serpente' | 'aranha' | 'escorpiao' | 'lagarta' | 'inseto' | 'aquatico' | 'mamifero'
  nomePopular: string
  nomeCientifico?: string
  genero: 'peçonhento' | 'urticante' | 'carnivoroperigoso'
  perigo: 'baixo' | 'moderado' | 'alto' | 'critico'
  frequenteEm: string[]
  descricaoIdentificacao: string
  sintomas: string[]
  gravidade: string
  primeirosSocorros: Array<{ passo: string; detalhe: string }>
  proibido: string[]
  atendimento: string
  prevencao: string[]
  verifiedAt: string
  sourceLabel: string
  sourceUrls: string[]
}

const VERIFIED_AT = '2026-08-18'
const MS_ANIMAIS = 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/animais-peconhentos'
const MS_OFIDICOS = 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/animais-peconhentos/acidentes-ofidicos/faq/faq'
const MS_ARANHAS = 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/animais-peconhentos/acidentes-por-aranhas/faq/faq'
const MS_ESCORPIOES = 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/animais-peconhentos/acidentes-por-escorpioes/faq/faq'
const MS_LAGARTAS = 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/animais-peconhentos/acidentes-por-lagartas/faq/faq'
const MS_ABELHAS = 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/animais-peconhentos/acidentes-por-abelhas/acidentes-por-abelhas'
const MS_AGUAS_VIVAS = 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/animais-peconhentos/acidentes-por-aguas-vivas-e-caravelas'
const MS_RAIVA = 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/r/raiva/raiva'
const MS_CIATOX = 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/animais-peconhentos/ciatox/'
const BUTANTAN_LONOMIA = 'https://butantan.gov.br/noticias/lonomia-saiba-reconhecer-a-lagarta-que-pode-provocar-envenenamento-grave-e-o-que-fazer-em-caso-de-acidente'

const SNAKE_FIRST_AID = [
  { passo: 'Afaste-se da serpente e mantenha a pessoa calma', detalhe: 'Não tente capturar, matar ou manipular o animal.' },
  { passo: 'Retire objetos que possam apertar o membro', detalhe: 'Remova anéis, pulseiras, sapato ou fitas antes que apareça inchaço.' },
  { passo: 'Lave com água e sabão se for possível', detalhe: 'Faça limpeza simples; não corte nem manipule a ferida.' },
  { passo: 'Mantenha o membro em posição elevada e confortável', detalhe: 'Siga a orientação do Ministério da Saúde enquanto organiza transporte.' },
  { passo: 'Procure atendimento o mais rápido possível', detalhe: 'Acione SAMU 192 ou serviço de referência. Se for seguro, uma foto à distância pode ajudar na identificação.' },
]
const SNAKE_FORBIDDEN = [
  'NÃO faça torniquete ou garrote',
  'NÃO corte, perfure, esprema ou chupe o local',
  'NÃO aplique querosene, café, ervas, álcool ou outras receitas caseiras',
  'NÃO se arrisque para capturar a serpente viva ou morta',
]
const SNAKE_PREVENTION = [
  'Use calçado fechado e luvas em atividades rurais, entulho, lenha ou mato',
  'Não coloque mãos em buracos, sob pedras, troncos ou objetos sem visualizar antes',
  'Sacuda calçados e roupas que ficaram no chão ou em locais de armazenamento',
  'Ao encontrar uma serpente, afaste-se e acione a autoridade competente quando necessário',
]

const SPIDER_FIRST_AID = [
  { passo: 'Lave o local da picada', detalhe: 'Use água e sabão e evite manipular a lesão.' },
  { passo: 'Use compressa morna para alívio da dor', detalhe: 'É a orientação geral do Ministério da Saúde para acidentes por aranhas.' },
  { passo: 'Procure o serviço de saúde', detalhe: 'A identificação clínica e a necessidade de tratamento específico são definidas por profissionais.' },
  { passo: 'Fotografe apenas se não houver risco', detalhe: 'Não tente capturar a aranha se isso puder causar novo acidente.' },
]
const SPIDER_FORBIDDEN = [
  'NÃO faça torniquete, corte ou sucção',
  'NÃO aplique pomadas, medicamentos ou receitas caseiras sem orientação profissional',
  'NÃO manipule a aranha para tentar confirmar a espécie',
]
const SPIDER_PREVENTION = [
  'Sacuda roupas, toalhas, lençóis e calçados antes de usar',
  'Use luvas ao mover caixas, telhas, madeira, entulho ou objetos armazenados',
  'Vede frestas e mantenha camas afastadas de paredes quando houver ocorrência de aranhas em casa',
]

const SCORPION_FIRST_AID = [
  { passo: 'Afaste a pessoa do escorpião e mantenha a calma', detalhe: 'Evite novo contato com o animal.' },
  { passo: 'Lave o local com água e sabão', detalhe: 'Faça limpeza simples da pele.' },
  { passo: 'Procure atendimento sem demora', detalhe: 'Crianças têm maior risco de manifestações sistêmicas graves. Acione SAMU 192 em emergência.' },
  { passo: 'Fotografe somente se for seguro', detalhe: 'A foto pode ajudar, mas não atrase o atendimento e não manipule o animal.' },
]
const SCORPION_FORBIDDEN = [
  'NÃO faça torniquete, corte ou sucção',
  'NÃO aplique ervas, café, querosene, gasolina ou outras receitas caseiras',
  'NÃO dê medicamentos por conta própria para “neutralizar” o veneno',
]
const SCORPION_PREVENTION = [
  'Vede frestas e ralos e mantenha lixo acondicionado',
  'Sacuda roupas, toalhas e calçados antes de usar',
  'Use luvas ao manusear lenha, tijolos, pedras ou entulho',
  'Reduza abrigo e alimento de escorpiões mantendo o ambiente limpo e controlando baratas',
]

const CATERPILLAR_FIRST_AID = [
  { passo: 'Lave o local com água fria ou gelada e sabão', detalhe: 'Não esfregue a área atingida.' },
  { passo: 'Procure serviço de saúde', detalhe: 'Em suspeita de Lonomia, a avaliação deve ser imediata; outros acidentes também podem precisar de controle de dor e observação.' },
  { passo: 'Fotografe a lagarta se for seguro', detalhe: 'A identificação pode ajudar, sem tocar ou coletar o animal.' },
]
const CATERPILLAR_FORBIDDEN = [
  'NÃO esfregue, aperte ou manipule cerdas na pele',
  'NÃO aplique álcool, medicamentos ou receitas caseiras',
  'NÃO toque na lagarta para tentar identificá-la',
]

const RABIES_FIRST_AID = [
  { passo: 'Lave abundantemente com água e sabão', detalhe: 'Faça isso o mais rápido possível após mordida, arranhadura ou contato relevante com saliva.' },
  { passo: 'Procure assistência médica o mais rápido possível', detalhe: 'A indicação de vacina, soro e outras medidas depende do tipo de exposição e do animal.' },
  { passo: 'Informe qual animal causou a exposição', detalhe: 'No caso de cão ou gato, o serviço de saúde orientará se e como observar o animal por 10 dias.' },
]
const RABIES_FORBIDDEN = [
  'NÃO adie avaliação por a ferida parecer pequena',
  'NÃO toque, capture ou manipule morcego ou outro animal silvestre para “levar ao hospital”',
  'NÃO decida por conta própria interromper ou dispensar profilaxia antirrábica',
]

export const PROTOCOLOS_FAUNA: ProtocoloFauna[] = [
  {
    id: 'snake-jararaca', categoria: 'serpente', nomePopular: 'Jararaca', nomeCientifico: 'Bothrops spp.', genero: 'peçonhento', perigo: 'alto',
    frequenteEm: ['Diversas regiões do Brasil'],
    descricaoIdentificacao: 'Serpentes do gênero Bothrops apresentam grande variação de cor e desenho. Não tente confirmar a espécie aproximando-se do animal.',
    sintomas: ['Dor e inchaço local podem ocorrer', 'Manchas arroxeadas ou sangramentos podem surgir', 'Quadros graves podem evoluir com complicações sistêmicas'],
    gravidade: 'Acidente potencialmente grave. O quadro e o tratamento dependem da avaliação clínica no serviço de saúde.',
    primeirosSocorros: SNAKE_FIRST_AID, proibido: SNAKE_FORBIDDEN,
    atendimento: 'Encaminhe o mais rápido possível para serviço de referência. Soroterapia e classificação do acidente são decisões do SUS.',
    prevencao: SNAKE_PREVENTION, verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — acidentes ofídicos', sourceUrls: [MS_OFIDICOS, MS_ANIMAIS, MS_CIATOX],
  },
  {
    id: 'snake-cascavel', categoria: 'serpente', nomePopular: 'Cascavel', nomeCientifico: 'Crotalus durissus', genero: 'peçonhento', perigo: 'critico',
    frequenteEm: ['Áreas abertas, cerrado e regiões secas de diferentes estados'],
    descricaoIdentificacao: 'Pode apresentar guizo na extremidade da cauda. Não dependa do som para confirmar presença e não se aproxime para verificar.',
    sintomas: ['A picada pode ter pouca alteração local', 'Fraqueza, visão alterada e dores musculares podem ocorrer', 'Urina escura ou piora geral exigem atendimento urgente'],
    gravidade: 'Acidente potencialmente grave, com manifestações neurológicas e musculares possíveis.',
    primeirosSocorros: SNAKE_FIRST_AID, proibido: SNAKE_FORBIDDEN,
    atendimento: 'Atendimento hospitalar deve ser iniciado o quanto antes. O serviço define exames, observação e soroterapia.',
    prevencao: SNAKE_PREVENTION, verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — acidentes ofídicos', sourceUrls: [MS_OFIDICOS, MS_ANIMAIS, MS_CIATOX],
  },
  {
    id: 'snake-coral', categoria: 'serpente', nomePopular: 'Coral-verdadeira', nomeCientifico: 'Micrurus spp.', genero: 'peçonhento', perigo: 'critico',
    frequenteEm: ['Diversas regiões do Brasil'],
    descricaoIdentificacao: 'Corais verdadeiras e falsas podem ter padrões semelhantes. Não tente diferenciá-las manipulando ou aproximando-se.',
    sintomas: ['Pode haver alterações neurológicas progressivas', 'Fraqueza muscular e dificuldade respiratória são sinais de emergência'],
    gravidade: 'Potencialmente grave por comprometimento neuromuscular. Dificuldade para respirar exige SAMU 192 imediatamente.',
    primeirosSocorros: SNAKE_FIRST_AID, proibido: [...SNAKE_FORBIDDEN, 'NÃO tente realizar procedimentos invasivos; em parada respiratória/cardiaca siga orientação do SAMU e protocolo de RCP'],
    atendimento: 'Encaminhamento imediato. Antiveneno e suporte respiratório são decisões hospitalares.',
    prevencao: SNAKE_PREVENTION, verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — acidentes ofídicos', sourceUrls: [MS_OFIDICOS, MS_ANIMAIS, MS_CIATOX],
  },
  {
    id: 'snake-surucucu', categoria: 'serpente', nomePopular: 'Surucucu-pico-de-jaca', nomeCientifico: 'Lachesis muta', genero: 'peçonhento', perigo: 'critico',
    frequenteEm: ['Amazônia e áreas de Mata Atlântica preservada'],
    descricaoIdentificacao: 'Serpente grande de áreas florestais. Identificação leiga pode falhar; mantenha distância e fotografe apenas se isso não aumentar o risco.',
    sintomas: ['Dor, inchaço e sangramento local podem ocorrer', 'Náuseas, vômitos, diarreia, alteração de pressão e piora geral podem aparecer'],
    gravidade: 'Acidente potencialmente grave que exige avaliação hospitalar rápida.',
    primeirosSocorros: SNAKE_FIRST_AID, proibido: SNAKE_FORBIDDEN,
    atendimento: 'Atendimento hospitalar imediato. Não tente iniciar acesso venoso, administrar soro ou medicar a vítima fora do serviço de saúde.',
    prevencao: SNAKE_PREVENTION, verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — acidentes ofídicos', sourceUrls: [MS_OFIDICOS, MS_ANIMAIS, MS_CIATOX],
  },
  {
    id: 'spider-armadeira', categoria: 'aranha', nomePopular: 'Aranha-armadeira', nomeCientifico: 'Phoneutria spp.', genero: 'peçonhento', perigo: 'alto',
    frequenteEm: ['Diversas regiões do Brasil'],
    descricaoIdentificacao: 'Aranha de interesse em saúde pública que pode assumir postura defensiva. Não provoque nem tente capturar para identificação.',
    sintomas: ['Dor local pode ser intensa', 'Inchaço, sudorese e alterações sistêmicas podem ocorrer', 'Crianças e pessoas com sintomas sistêmicos exigem avaliação rápida'],
    gravidade: 'Pode causar envenenamento relevante. A gravidade é definida clinicamente.',
    primeirosSocorros: SPIDER_FIRST_AID, proibido: SPIDER_FORBIDDEN,
    atendimento: 'Procure serviço de saúde. Analgesia, observação e eventual soroterapia dependem da avaliação profissional.',
    prevencao: SPIDER_PREVENTION, verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — acidentes por aranhas', sourceUrls: [MS_ARANHAS, MS_ANIMAIS, MS_CIATOX],
  },
  {
    id: 'spider-marrom', categoria: 'aranha', nomePopular: 'Aranha-marrom', nomeCientifico: 'Loxosceles spp.', genero: 'peçonhento', perigo: 'alto',
    frequenteEm: ['Diversas regiões, inclusive ambientes urbanos'],
    descricaoIdentificacao: 'Aranha pequena de hábito geralmente noturno que se abriga em locais pouco movimentados. O nome popular “viagra” não é usado neste catálogo.',
    sintomas: ['A picada pode ser pouco percebida inicialmente', 'Dor, vermelhidão e lesão cutânea podem evoluir ao longo das horas/dias', 'Mal-estar, urina escura ou icterícia são sinais de alarme'],
    gravidade: 'Pode causar quadro cutâneo importante e, menos frequentemente, manifestações sistêmicas.',
    primeirosSocorros: SPIDER_FIRST_AID, proibido: SPIDER_FORBIDDEN,
    atendimento: 'Procure avaliação médica, mesmo quando a lesão inicial parecer pequena e estiver evoluindo.',
    prevencao: SPIDER_PREVENTION, verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — acidentes por aranhas', sourceUrls: [MS_ARANHAS, MS_ANIMAIS, MS_CIATOX],
  },
  {
    id: 'spider-caranguejeira', categoria: 'aranha', nomePopular: 'Caranguejeira / tarântula', nomeCientifico: 'Theraphosidae spp.', genero: 'peçonhento', perigo: 'baixo',
    frequenteEm: ['Diversas regiões do Brasil'],
    descricaoIdentificacao: 'Aranhas grandes e pilosas. Não estão entre os três gêneros de maior importância médica listados pelo Ministério da Saúde no Brasil.',
    sintomas: ['Mordida pode causar dor local', 'Pelos urticantes podem irritar pele e olhos'],
    gravidade: 'Em geral menor que Phoneutria/Loxosceles, mas sintomas importantes ou exposição ocular precisam de avaliação.',
    primeirosSocorros: [
      { passo: 'Lave pele exposta sem esfregar', detalhe: 'Evite espalhar pelos urticantes.' },
      { passo: 'Se houver contato ocular, lave com água limpa', detalhe: 'Não esfregue os olhos e procure avaliação se a irritação persistir ou houver alteração visual.' },
      { passo: 'Procure serviço de saúde se houver sintomas importantes', detalhe: 'Não se automedique com anti-histamínico ou outra medicação por orientação do app.' },
    ],
    proibido: ['NÃO esfregue olhos ou pele com pelos urticantes', 'NÃO manipule aranha selvagem para identificação', 'NÃO use medicamento por conta própria'],
    atendimento: 'Avaliação é indicada em exposição ocular, reação importante, dor intensa, falta de ar ou piora clínica.',
    prevencao: ['Não manuseie aranhas selvagens', 'Use luvas ao movimentar solo, madeira ou materiais onde possam estar escondidas'],
    verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — referência de aranhas de interesse em saúde pública', sourceUrls: [MS_ARANHAS, MS_ANIMAIS],
  },
  {
    id: 'scorp-tityus', categoria: 'escorpiao', nomePopular: 'Escorpião-amarelo', nomeCientifico: 'Tityus serrulatus', genero: 'peçonhento', perigo: 'critico',
    frequenteEm: ['Ampla distribuição no Brasil, inclusive áreas urbanas'],
    descricaoIdentificacao: 'Espécie de grande importância em saúde pública e ampla distribuição. Não manipule o animal para confirmar espécie.',
    sintomas: ['Dor local costuma surgir rapidamente', 'Náuseas, vômitos, sudorese, agitação ou alterações cardiorrespiratórias podem indicar quadro sistêmico', 'Crianças têm maior risco de gravidade'],
    gravidade: 'Crianças são especialmente vulneráveis a formas graves; qualquer manifestação sistêmica exige atendimento urgente.',
    primeirosSocorros: SCORPION_FIRST_AID, proibido: SCORPION_FORBIDDEN,
    atendimento: 'Encaminhe sem demora para unidade de referência; em sintomas sistêmicos ou criança sintomática, trate como urgência/emergência.',
    prevencao: SCORPION_PREVENTION, verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — acidentes por escorpiões', sourceUrls: [MS_ESCORPIOES, MS_ANIMAIS, MS_CIATOX],
  },
  {
    id: 'scorp-tityus-bahiensis', categoria: 'escorpiao', nomePopular: 'Escorpião-marrom', nomeCientifico: 'Tityus bahiensis', genero: 'peçonhento', perigo: 'alto',
    frequenteEm: ['Centro-Oeste, Sudeste e Sul'],
    descricaoIdentificacao: 'Espécie de interesse em saúde pública. Cor e tamanho variam; não dependa de identificação visual para decidir se procura atendimento.',
    sintomas: ['Dor local e alterações sensitivas podem ocorrer', 'Sintomas sistêmicos são possíveis, sobretudo em crianças'],
    gravidade: 'A gravidade depende da clínica, idade e manifestações; não deve ser estimada apenas pela espécie presumida.',
    primeirosSocorros: SCORPION_FIRST_AID, proibido: SCORPION_FORBIDDEN,
    atendimento: 'Procure unidade de saúde sem demora; profissionais definem observação e necessidade de tratamento específico.',
    prevencao: SCORPION_PREVENTION, verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — acidentes por escorpiões', sourceUrls: [MS_ESCORPIOES, MS_ANIMAIS, MS_CIATOX],
  },
  {
    id: 'lagarta-lonomia', categoria: 'lagarta', nomePopular: 'Lonomia / taturana', nomeCientifico: 'Lonomia spp.', genero: 'urticante', perigo: 'critico',
    frequenteEm: ['Especialmente Sul e partes do Sudeste, com registros em outras áreas'],
    descricaoIdentificacao: 'Lagartas do gênero Lonomia possuem estruturas urticantes e podem ficar agrupadas em troncos. Não toque para identificar.',
    sintomas: ['Dor/ardor e vermelhidão local podem ocorrer', 'Horas depois podem surgir mal-estar, náusea e alterações de coagulação', 'Sangramentos em gengiva, nariz, urina ou manchas roxas são sinais de alarme'],
    gravidade: 'Lonomia pode causar distúrbio de coagulação e hemorragia grave. Avaliação rápida é essencial.',
    primeirosSocorros: CATERPILLAR_FIRST_AID, proibido: CATERPILLAR_FORBIDDEN,
    atendimento: 'Em suspeita de Lonomia, procure imediatamente unidade de saúde. O serviço define exames, observação e eventual soro antilonômico.',
    prevencao: ['Não encoste em troncos sem observar a superfície', 'Use luvas em jardinagem e manejo de árvores', 'Oriente crianças a não tocar em lagartas'],
    verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde + Instituto Butantan — acidentes por Lonomia', sourceUrls: [MS_LAGARTAS, BUTANTAN_LONOMIA, MS_CIATOX],
  },
  {
    id: 'lagarta-premolis', categoria: 'lagarta', nomePopular: 'Pararama', nomeCientifico: 'Premolis semirufa', genero: 'urticante', perigo: 'moderado',
    frequenteEm: ['Amazônia, associada principalmente à seringueira'],
    descricaoIdentificacao: 'Lagarta urticante associada a acidentes ocupacionais na Amazônia. Não toque para confirmação.',
    sintomas: ['Dor/ardor local e inflamação podem ocorrer', 'Exposições repetidas podem estar associadas a problemas articulares persistentes'],
    gravidade: 'O risco depende da exposição; sintomas persistentes ou importantes precisam de avaliação profissional.',
    primeirosSocorros: CATERPILLAR_FIRST_AID, proibido: CATERPILLAR_FORBIDDEN,
    atendimento: 'Procure serviço de saúde se dor for intensa, houver reação importante ou sintomas persistirem. O app não prescreve anti-histamínicos ou analgésicos.',
    prevencao: ['Use proteção ao trabalhar com seringueiras', 'Evite contato direto com lagartas e superfícies onde estejam agrupadas'],
    verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — orientação geral para acidentes por lagartas', sourceUrls: [MS_LAGARTAS, MS_ANIMAIS],
  },
  {
    id: 'inseto-marimbondo', categoria: 'inseto', nomePopular: 'Abelha / marimbondo / vespa', nomeCientifico: 'Hymenoptera', genero: 'peçonhento', perigo: 'alto',
    frequenteEm: ['Todo Brasil'],
    descricaoIdentificacao: 'Insetos sociais podem defender ninhos em grupo. A gravidade depende do número de ferroadas e da reação alérgica da pessoa.',
    sintomas: ['Dor, vermelhidão e inchaço local', 'Urticária disseminada, inchaço de língua/garganta, falta de ar, tontura ou desmaio sugerem reação alérgica grave', 'Múltiplas ferroadas aumentam risco de toxicidade sistêmica'],
    gravidade: 'Anafilaxia ou múltiplas ferroadas são emergências. A espécie não deve atrasar a busca por ajuda.',
    primeirosSocorros: [
      { passo: 'Afaste-se da área do ninho/enxame', detalhe: 'Priorize sair do risco de novas ferroadas.' },
      { passo: 'Se houver ferrão de abelha visível, remova por raspagem', detalhe: 'Não perca tempo tentando identificar o inseto.' },
      { passo: 'Use compressa fria para desconforto local', detalhe: 'Se houver sinais de anafilaxia, acione SAMU 192 imediatamente.' },
      { passo: 'Procure hospital em múltiplas ferroadas ou sintomas sistêmicos', detalhe: 'Tratamento de anafilaxia e toxicidade é médico.' },
    ],
    proibido: ['NÃO se aproxime novamente do ninho para capturar insetos', 'NÃO atrase o SAMU diante de falta de ar, desmaio ou inchaço de língua/garganta', 'NÃO use medicação por conta própria como substituto de avaliação'],
    atendimento: 'SAMU 192 em anafilaxia; hospital rapidamente em múltiplas ferroadas ou piora sistêmica.',
    prevencao: ['Não perturbe colmeias/ninhos', 'Remoção de colônias deve ser feita por profissionais treinados', 'Evite máquinas/vibração intensa perto de colônias conhecidas'],
    verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — acidentes por abelhas', sourceUrls: [MS_ABELHAS, MS_ANIMAIS],
  },
  {
    id: 'inseto-formiga-fogo', categoria: 'inseto', nomePopular: 'Formiga-lava-pés / formiga-de-fogo', nomeCientifico: 'Solenopsis spp.', genero: 'peçonhento', perigo: 'moderado',
    frequenteEm: ['Diversas regiões do Brasil'],
    descricaoIdentificacao: 'Formigas pequenas que podem ferroar repetidamente quando o ninho é perturbado. Identificação de espécie por leigo é imprecisa.',
    sintomas: ['Dor/ardor e vermelhidão local', 'Pústulas podem surgir posteriormente', 'Pessoas sensibilizadas podem desenvolver reação alérgica grave'],
    gravidade: 'Geralmente local, mas anafilaxia ou grande número de ferroadas exigem atendimento.',
    primeirosSocorros: [
      { passo: 'Afaste-se do formigueiro e remova insetos da pele/roupa', detalhe: 'Evite novas ferroadas.' },
      { passo: 'Lave a pele com água e sabão', detalhe: 'Não rompa bolhas ou pústulas.' },
      { passo: 'Observe sinais de reação alérgica', detalhe: 'Falta de ar, edema de língua/garganta, tontura ou desmaio exigem SAMU 192.' },
    ],
    proibido: ['NÃO rompa pústulas', 'NÃO aplique substâncias irritantes ou receitas caseiras', 'NÃO atrase emergência em reação sistêmica'],
    atendimento: 'Procure avaliação em reação importante, múltiplas ferroadas, infecção ou sintomas sistêmicos.',
    prevencao: ['Evite pisar/manipular ninhos', 'Use calçado em áreas infestadas', 'Controle de colônias deve seguir orientação local'],
    verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — referência geral de acidentes por animais peçonhentos', sourceUrls: [MS_ANIMAIS],
  },
  {
    id: 'agua-agua-viva', categoria: 'aquatico', nomePopular: 'Água-viva / caravela', nomeCientifico: 'Cnidaria', genero: 'peçonhento', perigo: 'alto',
    frequenteEm: ['Litoral brasileiro'],
    descricaoIdentificacao: 'Tentáculos podem permanecer ativos mesmo com o animal na areia ou aparentemente morto. Não toque.',
    sintomas: ['Ardência ou dor intensa', 'Marcas lineares, placas ou bolhas podem ocorrer', 'Náusea, vômito, espasmos, arritmia ou reação alérgica podem aparecer em exposições maiores'],
    gravidade: 'A maioria é local, mas reação alérgica ou sintomas sistêmicos podem ser graves.',
    primeirosSocorros: [
      { passo: 'Saia da água com segurança', detalhe: 'Evite novo contato com tentáculos.' },
      { passo: 'Use compressa gelada com água do mar ou cold pack', detalhe: 'NÃO use água doce na área atingida.' },
      { passo: 'Remova tentáculos aderidos com cuidado', detalhe: 'Prefira pinça, lâmina apropriada ou mão enluvada; não esfregue.' },
      { passo: 'Lave abundantemente com ácido acético 5% (vinagre)', detalhe: 'É a orientação do Ministério da Saúde para inativar cnidócitos remanescentes.' },
      { passo: 'Procure avaliação médica', detalhe: 'Acidentes graves ou sintomas sistêmicos exigem urgência; SAMU 192 se houver emergência.' },
    ],
    proibido: ['NÃO use água doce para lavar ou fazer compressa', 'NÃO esfregue a região', 'NÃO toque tentáculos com a mão desprotegida', 'NÃO urine sobre a lesão ou use receitas caseiras'],
    atendimento: 'Avaliação médica em dor importante, área extensa, criança, reação alérgica ou sintomas sistêmicos.',
    prevencao: ['Respeite sinalização e orientação de guarda-vidas', 'Não toque em águas-vivas/caravelas na água ou na areia, mesmo mortas', 'Considere roupa protetora ao mergulhar em área de ocorrência'],
    verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — águas-vivas e caravelas', sourceUrls: [MS_AGUAS_VIVAS],
  },
  {
    id: 'agua-arraia', categoria: 'aquatico', nomePopular: 'Arraia', nomeCientifico: 'Batoidea spp.', genero: 'peçonhento', perigo: 'alto',
    frequenteEm: ['Águas costeiras e rios, conforme a espécie'],
    descricaoIdentificacao: 'Arraias podem permanecer parcialmente enterradas. O ferrão pode causar ferimento profundo; não tente manipular o animal.',
    sintomas: ['Dor intensa e sangramento local podem ocorrer', 'Feridas profundas podem reter fragmentos e infectar', 'Tontura ou piora geral exigem atenção'],
    gravidade: 'Trauma perfurante e envenenamento podem exigir avaliação hospitalar.',
    primeirosSocorros: [
      { passo: 'Saia da água e vá para local seguro', detalhe: 'Evite novo contato.' },
      { passo: 'Controle sangramento com pressão direta quando possível', detalhe: 'Não pressione sobre objeto/ferrão profundamente encravado.' },
      { passo: 'Não remova estrutura profundamente encravada', detalhe: 'A retirada pode exigir avaliação e imagem no hospital.' },
      { passo: 'Procure serviço de saúde', detalhe: 'O app não prescreve temperatura de imersão, analgesia ou retirada de fragmentos.' },
    ],
    proibido: ['NÃO corte o ferrão de um animal para poder manuseá-lo', 'NÃO faça torniquete', 'NÃO tente retirar objeto profundamente encravado', 'NÃO use receita caseira para controlar dor'],
    atendimento: 'Hospital é indicado em ferida penetrante, dor intensa, sangramento importante, fragmento retido ou sintomas sistêmicos.',
    prevencao: ['Observe orientação local ao entrar em áreas com arraias', 'Use proteção adequada quando recomendada', 'Não toque ou manuseie arraias vivas ou mortas'],
    verifiedAt: VERIFIED_AT, sourceLabel: 'Orientação conservadora de trauma + Ministério da Saúde — animais peçonhentos', sourceUrls: [MS_ANIMAIS],
  },
  {
    id: 'agua-peixe-aranha', categoria: 'aquatico', nomePopular: 'Niquim / peixe venenoso de fundo', nomeCientifico: 'Thalassophryne spp.', genero: 'peçonhento', perigo: 'moderado',
    frequenteEm: ['Litoral, estuários e algumas regiões amazônicas'],
    descricaoIdentificacao: 'Peixes de fundo podem possuir espinhos venenosos. Não tente identificar ou remover espinhos profundamente inseridos sem assistência.',
    sintomas: ['Dor intensa, inchaço e alteração local podem ocorrer', 'Náusea ou mal-estar podem acompanhar acidentes mais importantes'],
    gravidade: 'Pode causar dor intensa e lesão local; avaliação é indicada quando a ferida é profunda ou sintomas são importantes.',
    primeirosSocorros: [
      { passo: 'Saia da água e evite novo contato', detalhe: 'Mantenha a pessoa em local seguro.' },
      { passo: 'Lave a ferida e controle sangramento', detalhe: 'Use água limpa quando disponível e pressão direta quando apropriado.' },
      { passo: 'Procure serviço de saúde', detalhe: 'Não force retirada de espinho e não aplique tratamento térmico com temperatura definida pelo app.' },
    ],
    proibido: ['NÃO esprema a ferida', 'NÃO faça torniquete', 'NÃO force retirada de espinho profundo', 'NÃO use temperatura extrema sem orientação profissional'],
    atendimento: 'Procure avaliação em dor intensa, ferida profunda, fragmento retido, infecção ou sintomas sistêmicos.',
    prevencao: ['Use calçado de proteção quando recomendado', 'Evite tocar em peixes desconhecidos ou enterrados', 'Use ferramenta e técnica adequada no manuseio de pescado'],
    verifiedAt: VERIFIED_AT, sourceLabel: 'Orientação conservadora + Ministério da Saúde — animais peçonhentos', sourceUrls: [MS_ANIMAIS],
  },
  {
    id: 'mamifero-morcego', categoria: 'mamifero', nomePopular: 'Morcego — exposição à raiva', nomeCientifico: 'Chiroptera', genero: 'carnivoroperigoso', perigo: 'critico',
    frequenteEm: ['Todo Brasil'],
    descricaoIdentificacao: 'Qualquer espécie de morcego pode estar envolvida no ciclo da raiva. Não tente definir risco pela aparência do animal.',
    sintomas: ['A ferida pode ser pequena ou pouco percebida', 'A raiva é quase sempre fatal após o início dos sintomas, por isso a prevenção pós-exposição é essencial'],
    gravidade: 'Mordida, arranhadura ou contato relevante com saliva de morcego exige avaliação rápida do serviço de saúde.',
    primeirosSocorros: RABIES_FIRST_AID, proibido: RABIES_FORBIDDEN,
    atendimento: 'Procure serviço de saúde o mais rápido possível. Profissionais definem vacina/soro conforme tipo de exposição e histórico vacinal.',
    prevencao: ['Nunca toque em morcegos vivos ou mortos', 'Mantenha vacinação de cães e gatos conforme programa local', 'Pessoas com exposição ocupacional devem seguir orientação de profilaxia pré-exposição'],
    verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — raiva', sourceUrls: [MS_RAIVA],
  },
  {
    id: 'mamifero-cachorro', categoria: 'mamifero', nomePopular: 'Cão / gato — mordida e risco de raiva', nomeCientifico: 'Canis familiaris / Felis catus', genero: 'carnivoroperigoso', perigo: 'alto',
    frequenteEm: ['Todo Brasil'],
    descricaoIdentificacao: 'Mordidas e arranhaduras podem causar lesão, infecção e exposição à raiva conforme a situação epidemiológica e o animal.',
    sintomas: ['Ferida por mordida/arranhadura', 'Dor, inchaço ou sinais de infecção podem surgir', 'O risco de raiva é avaliado pelo serviço de saúde'],
    gravidade: 'A gravidade depende da lesão, local, animal, situação vacinal e risco de raiva.',
    primeirosSocorros: RABIES_FIRST_AID, proibido: RABIES_FORBIDDEN,
    atendimento: 'Serviço de saúde deve avaliar ferida, tétano, infecção e profilaxia antirrábica. Quando aplicável, orientará observação do cão/gato por 10 dias.',
    prevencao: ['Vacine cães e gatos conforme campanha/programa local', 'Não provoque ou manipule animais desconhecidos', 'Ensine crianças a não abordar animais sem supervisão'],
    verifiedAt: VERIFIED_AT, sourceLabel: 'Ministério da Saúde — raiva', sourceUrls: [MS_RAIVA],
  },
]

export const CATEGORIAS_FAUNA = [
  { id: 'serpente', label: 'Serpentes', icon: 'Snake' },
  { id: 'aranha', label: 'Aranhas', icon: 'Bug' },
  { id: 'escorpiao', label: 'Escorpiões', icon: 'Bug' },
  { id: 'lagarta', label: 'Lagartas', icon: 'Caterpillar' },
  { id: 'inseto', label: 'Insetos', icon: 'Bug' },
  { id: 'aquatico', label: 'Aquáticos', icon: 'Fish' },
  { id: 'mamifero', label: 'Mamíferos', icon: 'PawPrint' },
] as const

export const PERIGO_LABELS: Record<ProtocoloFauna['perigo'], { label: string; color: string; bg: string }> = {
  baixo: { label: 'Menor risco potencial', color: 'text-emerald-300', bg: 'border-emerald-500/40 bg-emerald-500/10' },
  moderado: { label: 'Risco potencial', color: 'text-yellow-300', bg: 'border-yellow-500/40 bg-yellow-500/10' },
  alto: { label: 'Alto risco potencial', color: 'text-orange-300', bg: 'border-orange-500/40 bg-orange-500/10' },
  critico: { label: 'Emergência potencial', color: 'text-red-300', bg: 'border-red-500/40 bg-red-500/10' },
}

export const FAUNA_STATS = {
  total: PROTOCOLOS_FAUNA.length,
  porCategoria: PROTOCOLOS_FAUNA.reduce((acc, p) => {
    acc[p.categoria] = (acc[p.categoria] || 0) + 1
    return acc
  }, {} as Record<string, number>),
  criticos: PROTOCOLOS_FAUNA.filter((p) => p.perigo === 'critico').length,
}
