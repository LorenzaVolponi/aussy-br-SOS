import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const data = await readFile(new URL('../src/lib/data/satellites.ts', import.meta.url), 'utf8')
const regulatoryUi = await readFile(new URL('../src/components/aussy/regulatory-info.tsx', import.meta.url), 'utf8')
const contacts = await readFile(new URL('../src/app/api/emergency/contacts/route.ts', import.meta.url), 'utf8')
const emergencyUi = await readFile(new URL('../src/components/aussy/emergency-sos.tsx', import.meta.url), 'utf8')

for (const required of [
  "const MUTABLE_NOTICE =",
  "const MUTABLE_SHORT = 'não verificado nesta build'",
  'constellationSize: null',
  'activeSatellites: null',
  "status: 'unknown'",
  'launchYear: MUTABLE_SHORT',
  'd2cCompatible: false',
  'partners: []',
  'services: []',
  "dataQuality: 'unverified-static'",
  'mutableFieldsVerifiedAt: null',
  "verifiedAt: '2026-08-18'",
  'operatorsInNegotiation: []',
  'Ato Anatel nº 5.322/2024',
  'Resolução Anatel nº 748/2021',
  'satelites-autorizados',
  'sandbox-autorizacao-para-sistemas-satelitais-em-aplicacoes-direct-to-device',
  "number: '188', name: 'CVV — Centro de Valorização da Vida'",
  'Apoio emocional e prevenção do suicídio; ligação gratuita pelo 188',
]) {
  assert.equal(data.includes(required), true, `missing satellite/emergency catalog invariant: ${required}`)
}

const constellationBlock = data.slice(
  data.indexOf('export const SATELLITE_CONSTELLATIONS'),
  data.indexOf('export interface BrazilianRegulatoryInfo'),
)
const ids = [...constellationBlock.matchAll(/id: '([^']+)'/g)].map((match) => match[1])
assert.deepEqual(ids, [
  'starlink-d2c',
  'ast-spacemobile',
  'lynk-global',
  'iridium',
  'globalstar',
  'inmarsat',
  'swarm',
  'othernet',
])

for (const forbidden of [
  'R$ ',
  'US$ ',
  'Mbps',
  'mensagem/dia',
  'Vivo (em negociação)',
  'Claro (testes',
  'Vivo Brasil',
  'T-Mobile (EUA)',
  'Vodafone',
  'AT&T',
  'Rakuten',
  'Bell Canada',
  'Telstra',
  '32% market',
  'cobertura global incluindo Brasil',
  'Opera no Brasil via',
  "status: 'operational',",
  "status: 'testing',",
  "status: 'planned',",
  "status: 'limited',",
  "name: 'Linha da Vida'",
]) {
  assert.equal(data.includes(forbidden), false, `mutable/stale satellite or emergency claim returned: ${forbidden}`)
}

const emergencyStart = data.indexOf('export const BRAZIL_EMERGENCY_NUMBERS')
const operatorsStart = data.indexOf('export const BRAZILIAN_OPERATORS')
assert.notEqual(emergencyStart, -1)
assert.notEqual(operatorsStart, -1)
const emergencyBlock = data.slice(emergencyStart, operatorsStart)
const numbers = [...emergencyBlock.matchAll(/number: '([^']+)'/g)].map((match) => match[1])
assert.deepEqual(numbers.slice(0, 4), ['192', '190', '193', '199'])
assert.equal(emergencyUi.includes('BRAZIL_EMERGENCY_NUMBERS.slice(0, 4)'), true, 'quick-call UI contract changed; review emergency ordering')

for (const required of [
  'Status verificado',
  'BRAZIL_REGULATORY.verifiedAt',
  'BRAZIL_REGULATORY.sourceUrl',
  'Abrir fonte ANATEL do status',
  'não afirma nenhuma lista de negociações comerciais em andamento',
  'Governança:',
]) {
  assert.equal(regulatoryUi.includes(required), true, `missing regulatory UI invariant: ${required}`)
}

for (const forbidden of [
  'Operadoras em negociação',
  'prováveis pioneiros',
  'Previsão realista:',
]) {
  assert.equal(regulatoryUi.includes(forbidden), false, `unverified regulatory claim returned: ${forbidden}`)
}

for (const required of [
  "dataQuality: 'verified-static'",
  "verifiedAt: '2026-08-18'",
  'Não disponível oficialmente no Brasil em 18/08/2026',
  'Defesa Civil Alerta',
  "number: '40199'",
]) {
  assert.equal(contacts.includes(required), true, `missing verified emergency capability invariant: ${required}`)
}

for (const forbidden of [
  "verifiedAt: '2026-08-17'",
  'Não disponível oficialmente no Brasil em 17/08/2026',
  'SOS via satélite disponível no Brasil',
]) {
  assert.equal(contacts.includes(forbidden), false, `stale emergency capability claim returned: ${forbidden}`)
}

console.log('Satellite catalog trust gate OK — mutable claims neutralized and emergency code 188 uses official CVV label')
