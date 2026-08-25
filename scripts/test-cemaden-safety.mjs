import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const route = await readFile(new URL('../src/app/api/cemaden/alerts/route.ts', import.meta.url), 'utf8')
const ui = await readFile(new URL('../src/components/aussy/cemaden-alerts.tsx', import.meta.url), 'utf8')

for (const forbidden of [
  'cemaden.gov.br/api/v1/monitoramento/alertas',
  'cemaden.gov.br/api/alerta/municipios.json',
  "dataQuality: 'live'",
  'rawAlerts',
  'mapSeveridade',
  'normalize(data',
]) {
  assert.equal(route.includes(forbidden), false, `legacy/unsafe CEMADEN automation returned: ${forbidden}`)
}

for (const required of [
  "automationAvailable: false",
  "dataQuality: 'official-portal'",
  "verifiedAt: VERIFIED_AT",
  'Lista vazia NÃO significa ausência de alertas ativos',
  'alertas-em-tempo-real',
  'previsao-de-riscos',
  'georisk.cemaden.gov.br',
  "'X-Aussy-Data-Quality': 'official-portal'",
  'status: 200',
]) {
  assert.equal(route.includes(required), true, `missing final CEMADEN portal invariant: ${required}`)
}

assert.equal(existsSync(new URL('../src/proxy.ts', import.meta.url)), false, 'temporary CEMADEN proxy must be removed after final portal migration')

for (const required of [
  'PORTAL OFICIAL',
  'CEMADEN / MCTI — canais oficiais',
  'cemaden.portals.map',
  'cemaden.note',
  'Aguardando localização válida',
  'Nenhuma cidade padrão é assumida',
]) {
  assert.equal(ui.includes(required), true, `missing CEMADEN UI trust invariant: ${required}`)
}

for (const forbidden of [
  'Nenhum monitoramento ativo no momento',
  'alerta(s) CEMADEN ativos',
  'monitoramento(s) CEMADEN',
  'const lat = point?.lat ?? -15.7801',
  'const lon = point?.lon ?? -47.9292',
  'else fetchQueimadas()',
]) {
  assert.equal(ui.includes(forbidden), false, `unsafe CEMADEN/queimadas UI behavior returned: ${forbidden}`)
}

console.log('CEMADEN safety gate OK — official portal contract is explicit, UI renders the API warning and no Brasilia fallback exists')
