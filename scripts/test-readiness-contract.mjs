import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const state = await readFile(new URL('../src/lib/readiness-state.ts', import.meta.url), 'utf8')
const route = await readFile(new URL('../src/app/api/readiness/route.ts', import.meta.url), 'utf8')
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
const cemadenRoute = await readFile(new URL('../src/app/api/cemaden/alerts/route.ts', import.meta.url), 'utf8')
const vercel = await readFile(new URL('../vercel.json', import.meta.url), 'utf8')
const quality = await readFile(new URL('../.github/workflows/quality.yml', import.meta.url), 'utf8')
const mobile = await readFile(new URL('../.github/workflows/mobile-v1.yml', import.meta.url), 'utf8')
const liveSmoke = await readFile(new URL('../.github/workflows/live-functional-smoke.yml', import.meta.url), 'utf8')
const dependencyFreeze = await readFile(new URL('../.github/workflows/dependency-freeze.yml', import.meta.url), 'utf8')
const releaseReadiness = await readFile(new URL('../.github/workflows/release-readiness.yml', import.meta.url), 'utf8')

for (const required of [
  "verifiedAt: '2026-08-25'",
  'releaseReady: false',
  "id: 'functional-audit-pr-pending'",
  "id: 'dependency-graph-frozen'",
  "dependencyLock: 'bun-1.3.14-frozen'",
  "firstAid: 'clinically-curated-static'",
  "satelliteCatalog: 'unverified-static'",
  "satelliteOrbit: 'celestrak-omm-sgp4-live-or-last-known-good'",
  "weather: 'met-norway-live-model-or-last-known-good'",
  "cemaden: 'official-portal-only'",
  "serviceWorkerSafetyEpoch: 'aussy-v9'",
  "zeroDependencySafetySuite: 'required-by-ci'",
  "nextBuild: 'required-by-quality-gate'",
  "liveDataSmoke: 'required-by-live-functional-smoke'",
  "browserPwaAcceptance: 'required-by-mobile-v1'",
]) {
  assert.equal(state.includes(required), true, `readiness snapshot missing invariant: ${required}`)
}

for (const removed of [
  "id: 'dependency-lock-missing'",
  "id: 'full-build-not-executed'",
  "id: 'service-worker-safety-epoch-v8'",
  "id: 'cemaden-undocumented-api-blocked'",
  "implemented-not-run-on-functional-github-runner",
  "not-run-after-hardening",
]) {
  assert.equal(state.includes(removed), false, `resolved/stale readiness blocker returned: ${removed}`)
}

assert.equal(route.includes("import { READINESS_SNAPSHOT } from '@/lib/readiness-state'"), true)
assert.equal(route.includes("'Cache-Control': 'no-store'"), true)
assert.equal(route.includes('process.env.VERCEL_GIT_COMMIT_SHA || null'), true)

assert.equal(existsSync(new URL('../bun.lock', import.meta.url)), true, 'bun.lock must be versioned')
assert.equal(JSON.parse(vercel).installCommand, 'bun install --frozen-lockfile', 'Vercel must use the frozen Bun graph')

for (const [name, workflow] of [
  ['quality', quality],
  ['mobile', mobile],
  ['live smoke', liveSmoke],
  ['dependency freeze', dependencyFreeze],
  ['release readiness', releaseReadiness],
]) {
  assert.equal(workflow.includes('bun install --frozen-lockfile'), true, `${name} workflow must use frozen install`)
}
assert.equal(dependencyFreeze.includes('run: bun install\n'), false, 'dependency certification must never resolve a new graph on main')
assert.equal(releaseReadiness.includes('bun run type-check'), true, 'release readiness must execute type-check')
assert.equal(releaseReadiness.includes('bun run lint:critical'), true, 'release readiness must execute critical lint')
assert.equal(releaseReadiness.includes('bun run build'), true, 'release readiness must execute production build')
assert.equal(releaseReadiness.includes('bun run test:mobile'), true, 'release readiness must execute mobile browser acceptance')

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

console.log('Readiness contract OK — dependency graph is frozen; PR #56 remains explicitly pending until all functional gates pass on one head')
