import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const path = new URL('../src/components/aussy/survival-tools.tsx', import.meta.url)
const source = await readFile(path, 'utf8')

for (const required of [
  '12 ferramentas · capacidades offline variam',
  'O Aussy não envia SMS para 192',
  'Ligar para SAMU 192',
  'O app não assume Brasília',
  'Planejamento, não necessidade clínica',
  'Riscos com Plantas',
  'não classifica planta silvestre como segura para comer ou usar como medicamento',
  'O app não concede licença nem autorização de transmissão',
  'fotossensíveis',
  'sourceUrls?.map',
  'Medical ID/Ficha Médica',
  'não aparece automaticamente na tela bloqueada',
]) {
  assert.equal(source.includes(required), true, `missing survival UI invariant: ${required}`)
}

for (const forbidden of [
  'sms:192',
  'Enviar SMS de emergência para 192',
  'Socorristas podem acessar seu celular mesmo com tela bloqueada',
  '12 ferramentas · 100% offline',
  'point?.lat ?? -15.7801',
  '-47.9292',
  '2000 * people * days',
  '3 * people * days',
  'ajuda pode demorar até 72h',
  'Comestíveis, tóxicas e medicinais',
  'Mesmo sem licença, qualquer pessoa pode transmitir',
  'A lei internacional permite isso',
  'alta frequência alcança mais longe',
  'padrão reconhecido de emergência',
  'Calorias',
  'Clima quente',
  'Caminhando',
]) {
  assert.equal(source.includes(forbidden), false, `unsafe hardcoded survival UI claim returned: ${forbidden}`)
}

const toolIds = [...source.matchAll(/\{ id: '([^']+)', icon:/g)].map((match) => match[1])
assert.equal(toolIds.length, 12, `expected 12 tools, found ${toolIds.length}`)
assert.deepEqual(toolIds.sort(), [
  'battery', 'calc', 'card', 'compass', 'gps', 'guide', 'lantern', 'morse', 'plants', 'radio', 'sunmoon', 'whistle',
].sort())

for (const component of [
  'LanternTool',
  'WhistleTool',
  'CompassTool',
  'GpsTool',
  'SunMoonTool',
  'MorseTool',
  'KitPlanner',
  'EmergencyCard',
  'SurvivalGuide',
  'PlantsGuide',
  'RadioGuide',
  'BatteryGuide',
]) {
  assert.equal(source.includes(`function ${component}`), true, `tool component missing: ${component}`)
}

assert.equal(source.includes("window.location.href = 'tel:192'"), true, 'SAMU action must remain a phone call')
assert.equal(source.includes('WATER_PER_PERSON_PER_DAY_LITERS * people * days'), true, 'kit water planner formula missing')
assert.equal(source.includes('selected.verifiedAt'), true, 'survival guide verifiedAt is not visible')
assert.equal(source.includes('selected.sourceLabel'), true, 'survival guide source label is not visible')

console.log('Survival UI safety gate OK — 12 tools preserved and unsafe hardcoded claims removed')
