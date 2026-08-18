import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const data = await readFile(new URL('../src/lib/data/fauna.ts', import.meta.url), 'utf8')
const ui = await readFile(new URL('../src/components/aussy/fauna-protocols.tsx', import.meta.url), 'utf8')

for (const required of [
  "const VERIFIED_AT = '2026-08-18'",
  'verifiedAt: string',
  'sourceLabel: string',
  'sourceUrls: string[]',
  'atendimento: string',
  "id: 'snake-jararaca'",
  "id: 'snake-cascavel'",
  "id: 'snake-coral'",
  "id: 'snake-surucucu'",
  "id: 'spider-armadeira'",
  "id: 'spider-marrom'",
  "id: 'spider-caranguejeira'",
  "id: 'scorp-tityus'",
  "id: 'scorp-tityus-bahiensis'",
  "id: 'lagarta-lonomia'",
  "id: 'lagarta-premolis'",
  "id: 'inseto-marimbondo'",
  "id: 'inseto-formiga-fogo'",
  "id: 'agua-agua-viva'",
  "id: 'agua-arraia'",
  "id: 'agua-peixe-aranha'",
  "id: 'mamifero-morcego'",
  "id: 'mamifero-cachorro'",
  'NÃO faça torniquete ou garrote',
  'NÃO corte, perfure, esprema ou chupe o local',
  'Lave abundantemente com água e sabão',
  'NÃO toque, capture ou manipule morcego',
  'NÃO use água doce para lavar ou fazer compressa',
  'Lave abundantemente com ácido acético 5% (vinagre)',
]) {
  assert.equal(data.includes(required), true, `missing fauna safety invariant: ${required}`)
}

for (const forbidden of [
  'antiveneno?:',
  'sorocruz?:',
  'tempoMaximoAtendimento',
  'Manter acesso venoso',
  'acesso venoso e monitorização',
  'Soro em alta dose',
  'Loratadina 10mg',
  'loratadina 10mg',
  'Janela crítica',
  'Viagra (aranha-marrom)',
  "id: 'spider-viagra'",
  'Capturar morcego',
  'capturar morcego para teste',
  'abaixo do nível do coração',
  'BOCA-A-BOCA',
  'Dose específica',
  'ampolas',
]) {
  assert.equal(data.includes(forbidden), false, `clinical/unsafe fauna pattern returned: ${forbidden}`)
}

const ids = [...data.matchAll(/\n    id: '([^']+)'/g)].map((match) => match[1])
assert.equal(ids.length, 18, `expected 18 fauna references, found ${ids.length}`)
assert.equal(new Set(ids).size, 18, 'fauna ids must be unique')

const protocolBlock = data.slice(data.indexOf('export const PROTOCOLOS_FAUNA'), data.indexOf('export const CATEGORIAS_FAUNA'))
const atendimentoCount = (protocolBlock.match(/\n    atendimento:/g) || []).length
const verifiedCount = (protocolBlock.match(/verifiedAt: VERIFIED_AT/g) || []).length
const sourceLabelCount = (protocolBlock.match(/sourceLabel:/g) || []).length
const sourceUrlsCount = (protocolBlock.match(/sourceUrls:/g) || []).length
assert.equal(atendimentoCount, 18, `atendimento count ${atendimentoCount} != 18`)
assert.equal(verifiedCount, 18, `verifiedAt count ${verifiedCount} != 18`)
assert.equal(sourceLabelCount, 18, `sourceLabel count ${sourceLabelCount} != 18`)
assert.equal(sourceUrlsCount, 18, `sourceUrls count ${sourceUrlsCount} != 18`)

for (const required of [
  'Fauna Brasileira — orientação inicial',
  'Não decide espécie, gravidade, soro, medicamento, dose ou tratamento hospitalar',
  'SAMU 192',
  'CIATox oficial',
  'O app não indica soro, dose, medicação, acesso venoso nem “janela crítica” de tratamento',
  'protocolo.sourceLabel',
  'protocolo.verifiedAt',
  'protocolo.sourceUrls.map',
]) {
  assert.equal(ui.includes(required), true, `missing fauna UI invariant: ${required}`)
}

for (const forbidden of [
  'Tratamento Médico',
  'Janela crítica',
  'protocolo.antiveneno',
  'protocolo.sorocruz',
  'protocolo.tempoMaximoAtendimento',
  'Syringe',
  'blink-emergency',
]) {
  assert.equal(ui.includes(forbidden), false, `clinical fauna UI pattern returned: ${forbidden}`)
}

console.log('Fauna safety gate OK — 18 references preserved without layperson dosing, antivenom or treatment windows')
