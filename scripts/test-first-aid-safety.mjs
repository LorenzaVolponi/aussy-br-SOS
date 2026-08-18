import { readFile } from 'node:fs/promises'
import process from 'node:process'

const failures = []

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

function requireAll(path, content, fragments) {
  for (const fragment of fragments) {
    if (!content.includes(fragment)) failures.push(`${path} missing clinical invariant: ${fragment}`)
  }
}

function forbidAll(path, content, fragments) {
  for (const fragment of fragments) {
    if (content.includes(fragment)) failures.push(`${path} contains legacy/unsafe pattern: ${fragment}`)
  }
}

const dataPath = 'src/lib/data/first-aid.ts'
const routePath = 'src/app/api/emergency/first-aid/route.ts'
const baselinePath = 'docs/FIRST_AID_SAFETY_BASELINE.md'

const [data, route, baseline] = await Promise.all([
  read(dataPath),
  read(routePath),
  read(baselinePath),
])

requireAll(dataPath, data, [
  "const VERIFIED_AT = '2026-08-18'",
  'verifiedAt: string;',
  'sourceUrls: string[];',
  '100–120 por minuto',
  '5–6 cm',
  '5 golpes firmes nas costas',
  '5 compressões abdominais',
  'NÃO faça varredura digital às cegas',
  'pressão manual firme e contínua',
  'NÃO eleve o membro como substituto',
  '5–20 minutos',
  'NÃO use gelo diretamente',
  'durar mais de 5 minutos',
  'NÃO segure ou imobilize',
  'NÃO coloque objetos, dedos, líquidos, alimentos ou medicamentos na boca',
  'NÃO faça garrote ou torniquete',
  'NÃO corte, perfure ou chupe',
  "id: 'avc-suspeita'",
  'FAST:',
])

forbidAll(dataPath, data, [
  'Microsoft',
  'Eleve o membro ferido acima do nível do coração se possível',
  'Use a Manobra de Heimlich',
  'Faça 5 compressões abdominais para dentro e para cima (Manobra de Heimlich)',
  '5 ventilações iniciais',
  'Torniquete é última opção',
  'Marque a hora da aplicação do torniquete na testa da vítima',
  '4 litros por pessoa/dia',
  'Purificação: cloro/hipoclorito',
  'Dê água para beber em pequenos goles se consciente',
])

const guideBlock = data.match(/export const FIRST_AID_GUIDES:[\s\S]*?= \[([\s\S]*?)\n\];\n\n\/\/ Frases úteis/)
if (!guideBlock) {
  failures.push(`${dataPath} guide block could not be parsed`)
} else {
  const body = guideBlock[1]
  const guideCount = (body.match(/\n    id: '/g) || []).length
  const verifiedCount = (body.match(/\n    verifiedAt: VERIFIED_AT,/g) || []).length
  const sourceLabelCount = (body.match(/\n    sourceLabel: '/g) || []).length
  const sourceUrlsCount = (body.match(/\n    sourceUrls: \[/g) || []).length

  if (guideCount < 8) failures.push(`${dataPath} unexpectedly contains only ${guideCount} guides`)
  if (verifiedCount !== guideCount) failures.push(`${dataPath} verifiedAt count ${verifiedCount} != guide count ${guideCount}`)
  if (sourceLabelCount !== guideCount) failures.push(`${dataPath} sourceLabel count ${sourceLabelCount} != guide count ${guideCount}`)
  if (sourceUrlsCount !== guideCount) failures.push(`${dataPath} sourceUrls count ${sourceUrlsCount} != guide count ${guideCount}`)
}

requireAll(routePath, route, [
  "const VERIFIED_AT = '2026-08-18'",
  "dataQuality: 'clinically-curated-static'",
  'American Heart Association',
  'American Red Cross',
  'Ministério da Saúde',
  'Não substitui avaliação profissional',
  'SAMU 192',
])
forbidAll(routePath, route, [
  "updated: '2026-07'",
  'SAMU / Cruz Vermelha / MS - protocolos públicos',
])

requireAll(baselinePath, baseline, [
  '2026-08-18',
  'American Heart Association',
  'Ministério da Saúde',
])

if (failures.length) {
  console.error('\nFirst-aid clinical safety gate failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('First-aid clinical safety gate OK — verified metadata and high-risk protocol invariants are protected')
