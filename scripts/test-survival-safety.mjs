import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const path = new URL('../src/lib/data/survival.ts', import.meta.url)
const source = await readFile(path, 'utf8')

for (const required of [
  "const VERIFIED_AT = '2026-08-18'",
  'Ministério da Saúde — Cuidados com a água em emergências',
  'NÃO improvise dose de água sanitária de concentração desconhecida',
  'NÃO use filtro caseiro de areia/carvão como substituto de desinfecção microbiológica',
  'NÃO use “teste universal de comestibilidade”',
  'AHA / American Red Cross First Aid 2024 — hypothermia',
  'AHA / American Red Cross First Aid 2024 — exertional hyperthermia and heatstroke',
  'imersão do corpo (pescoço para baixo) em água fresca a fria',
  'NÃO prepare “água com sal” caseira',
  '156.800 MHz',
  'TRANSMISSÃO não deve ser tratada como livre',
  'o SOS de Emergência via satélite da Apple não consta como disponível no Brasil',
  'WATER_PER_PERSON_PER_DAY_LITERS = 2',
  'Defesa Civil do Paraná recomenda 2 L de água por',
]) {
  assert.equal(source.includes(required), true, `missing survival safety invariant: ${required}`)
}

for (const forbidden of [
  'Método 2 — CLORO: 2 gotas de água sanitária (2,5%) por litro',
  'Método 3 — IODO: 5 gotas',
  'Método 4 — SOLAR',
  'FILTRO DIY',
  'cipó-titulo, babosa, cactos',
  'BATERIA + LÃ METÁLICA',
  'Regra universal de teste',
  'Insetos comestíveis',
  'peixes de água doce são seguros',
  '40% do calor sai pela cabeça',
  'pele quente e SECA',
  'água morna (não gelada)',
  '1 colher de chá por litro',
  'NÃO use gelo diretamente — causa vasoconstrição que piora resfriamento',
  '4 sementes matam adulto',
  'Gel da folha trata queimaduras',
  'WiFi Grátis Brasil tem 87 mil pontos',
  'Ligações 190/192/193 funcionam sem SIM',
  'Por lei internacional, qualquer celular conecta',
  'mensagem chega em 15s-3min',
  '145.000 MHz',
  '146.520 MHz',
  '446.000 MHz',
  "name: 'Canal 9', use: 'Canal de emergência CB'",
  '3 dias sem água',
  '3 semanas sem comida',
]) {
  assert.equal(source.includes(forbidden), false, `legacy/unsafe survival claim returned: ${forbidden}`)
}

const plantsStart = source.indexOf('export const COMMON_PLANTS')
const plantsEnd = source.indexOf('export const BATTERY_TIPS', plantsStart)
assert.notEqual(plantsStart, -1, 'COMMON_PLANTS block missing')
assert.notEqual(plantsEnd, -1, 'COMMON_PLANTS block terminator missing')
const plantsBlock = source.slice(plantsStart, plantsEnd)
const plantEntries = [...plantsBlock.matchAll(/type: '(comestivel|medicinal|toxica)'/g)].map((m) => m[1])
assert.ok(plantEntries.length > 0, 'plant warning catalogue disappeared')
assert.equal(plantEntries.includes('comestivel'), false, 'app must not classify plants as safe to eat in survival mode')
assert.equal(plantEntries.includes('medicinal'), false, 'app must not prescribe medicinal plant use in survival mode')
assert.ok(plantEntries.every((type) => type === 'toxica'), 'plant catalogue should only expose hazard references in survival mode')

const radioStart = source.indexOf('export const EMERGENCY_RADIO_CHANNELS')
const radioEnd = source.indexOf('// Morse', radioStart)
assert.notEqual(radioStart, -1, 'radio block missing')
assert.notEqual(radioEnd, -1, 'radio block terminator missing')
const radioBlock = source.slice(radioStart, radioEnd)
assert.equal(radioBlock.includes("freq: '156.800 MHz'"), true)
assert.equal(radioBlock.includes("license: 'profissional'"), true)
assert.equal(radioBlock.includes('145.000 MHz'), false)
assert.equal(radioBlock.includes('146.520 MHz'), false)
assert.equal(radioBlock.includes('446.000 MHz'), false)

console.log('Survival safety gate OK — water, heat, food, plant, radio and satellite claims are conservative and source-bounded')
