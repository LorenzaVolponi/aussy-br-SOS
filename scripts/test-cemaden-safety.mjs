import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const proxy = await readFile(new URL('../src/proxy.ts', import.meta.url), 'utf8')
const route = await readFile(new URL('../src/app/api/cemaden/alerts/route.ts', import.meta.url), 'utf8')
const ui = await readFile(new URL('../src/components/aussy/cemaden-alerts.tsx', import.meta.url), 'utf8')

for (const required of [
  "matcher: ['/api/cemaden/alerts']",
  "error: 'automation-unavailable'",
  "dataQuality: 'unavailable'",
  "status: 503",
  "'Cache-Control': 'no-store'",
  "'X-Aussy-Safety-Block': 'cemaden-undocumented-api'",
  "verifiedAt: VERIFIED_AT",
  'Lista vazia NÃO significa ausência de alertas ativos',
  'alertas-em-tempo-real',
  'previsao-de-riscos',
  'georisk.cemaden.gov.br',
]) {
  assert.equal(proxy.includes(required), true, `missing CEMADEN proxy invariant: ${required}`)
}

assert.equal(proxy.includes('export function proxy()'), true, 'Next 16 proxy export missing')
assert.equal(proxy.includes("matcher: ['/api/cemaden/alerts']"), true, 'proxy must not broaden beyond CEMADEN alerts route')

const legacyEndpoints = [
  'cemaden.gov.br/api/v1/monitoramento/alertas',
  'cemaden.gov.br/api/alerta/municipios.json',
]
const legacyStillPresent = legacyEndpoints.some((endpoint) => route.includes(endpoint))
if (legacyStillPresent) {
  assert.equal(proxy.includes("'X-Aussy-Safety-Block': 'cemaden-undocumented-api'"), true, 'legacy CEMADEN endpoint exists without active safety block')
  assert.equal(proxy.includes('status: 503'), true, 'legacy CEMADEN endpoint must be blocked with 503')
}

for (const forbidden of [
  "online: true",
  "dataQuality: 'live'",
  "status: 200",
]) {
  assert.equal(proxy.includes(forbidden), false, `unsafe CEMADEN proxy claim: ${forbidden}`)
}

assert.equal(ui.includes("if (!res.ok) throw new Error('CEMADEN indisponível')"), true, 'CEMADEN UI must reject safety-blocked 503 response')
assert.equal(ui.includes('Dados CEMADEN não disponíveis agora.'), true, 'CEMADEN UI must expose unavailable state')
assert.equal(ui.includes('!loading && !error && data && data.alerts.length === 0'), true, 'empty-alert state must be suppressed when upstream is unavailable')

console.log('CEMADEN safety gate OK — undocumented automation is blocked and empty data cannot masquerade as no active alerts')
