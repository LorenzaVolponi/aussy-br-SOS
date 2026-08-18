import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const state = await readFile(new URL('../src/lib/readiness-state.ts', import.meta.url), 'utf8')
const route = await readFile(new URL('../src/app/api/readiness/route.ts', import.meta.url), 'utf8')
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
const cemadenRoute = await readFile(new URL('../src/app/api/cemaden/alerts/route.ts', import.meta.url), 'utf8')

for (const required of [
  "verifiedAt: '2026-08-18'",
  'releaseReady: false',
  "id: 'dependency-lock-missing'",
  "id: 'full-build-not-executed'",
  "trackingIssue: 4",
  "firstAid: 'clinically-curated-static'",
  "satelliteCatalog: 'unverified-static'",
  "cemaden: 'official-portal-only'",
  "serviceWorkerSafetyEpoch: 'aussy-v9'",
  "zeroDependencySafetySuite: 'implemented-not-run-on-functional-github-runner'",
  "serviceWorkerV9Contract: 'implemented-not-run-on-functional-github-runner'",
  "nextBuild: 'not-run-after-hardening'",
  "browserPwaAcceptance: 'not-run-after-hardening'",
]) {
  assert.equal(state.includes(required), true, `readiness snapshot missing invariant: ${required}`)
}

for (const removed of [
  "id: 'service-worker-safety-epoch-v8'",
  "id: 'cemaden-undocumented-api-blocked'",
  "cemaden: 'automation-blocked-official-portals-only'",
]) {
  assert.equal(state.includes(removed), false, `resolved readiness blocker/mitigation returned: ${removed}`)
}

assert.equal(route.includes("import { READINESS_SNAPSHOT } from '@/lib/readiness-state'"), true)
assert.equal(route.includes("'Cache-Control': 'no-store'"), true)
assert.equal(route.includes('process.env.VERCEL_GIT_COMMIT_SHA || null'), true)

if (!existsSync(new URL('../bun.lock', import.meta.url))) {
  assert.equal(state.includes("id: 'dependency-lock-missing'"), true, 'missing bun.lock must remain a release blocker')
} else {
  assert.fail('bun.lock now exists: update readiness snapshot and frozen-install release workflow before merging this state')
}

const swVersion = sw.match(/const CACHE_VERSION = '([^']+)'/)?.[1]
assert.equal(swVersion, 'aussy-v9', `expected safety cache epoch aussy-v9, got ${swVersion || 'unknown'}`)
assert.equal(state.includes("serviceWorkerSafetyEpoch: 'aussy-v9'"), true, 'readiness snapshot must expose current safety epoch')
assert.equal(sw.includes("const OSM_TILES_CACHE = 'aussy-v2-osm-tiles'"), true, 'OSM persistent cache must survive safety epoch upgrade')
assert.equal(sw.includes("const firstAid = await emergencyCache.match('/api/emergency/first-aid')"), true, 'v9 activation must require current first-aid cache before purging old epoch')

assert.equal(existsSync(new URL('../src/proxy.ts', import.meta.url)), false, 'temporary CEMADEN proxy must be removed')
assert.equal(cemadenRoute.includes("dataQuality: 'official-portal'"), true, 'CEMADEN final portal contract missing')
assert.equal(cemadenRoute.includes('cemaden.gov.br/api/v1/monitoramento/alertas'), false, 'legacy CEMADEN endpoint returned')
assert.equal(cemadenRoute.includes('cemaden.gov.br/api/alerta/municipios.json'), false, 'legacy CEMADEN endpoint returned')

assert.equal(existsSync(new URL('./run-safety-suite.mjs', import.meta.url)), true, 'unified safety suite missing')
assert.equal(existsSync(new URL('../.github/workflows/safety-suite.yml', import.meta.url)), true, 'Safety Suite workflow missing')
assert.equal(existsSync(new URL('../.github/workflows/release-readiness.yml', import.meta.url)), true, 'Release Readiness workflow missing')

console.log('Readiness contract OK — CEMADEN portal migration and SW v9 are reflected; lock/build blockers remain explicit')
