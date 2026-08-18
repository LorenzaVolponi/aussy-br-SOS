import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const state = await readFile(new URL('../src/lib/readiness-state.ts', import.meta.url), 'utf8')
const route = await readFile(new URL('../src/app/api/readiness/route.ts', import.meta.url), 'utf8')
const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
const cemadenProxy = await readFile(new URL('../src/proxy.ts', import.meta.url), 'utf8')

for (const required of [
  "verifiedAt: '2026-08-18'",
  'releaseReady: false',
  "id: 'dependency-lock-missing'",
  "id: 'full-build-not-executed'",
  "id: 'service-worker-safety-epoch-v8'",
  "trackingIssue: 4",
  "trackingIssue: 26",
  "id: 'cemaden-undocumented-api-blocked'",
  "trackingIssue: 23",
  "firstAid: 'clinically-curated-static'",
  "satelliteCatalog: 'unverified-static'",
  "cemaden: 'automation-blocked-official-portals-only'",
  "zeroDependencySafetySuite: 'implemented-not-run-on-functional-github-runner'",
  "nextBuild: 'not-run-after-hardening'",
  "browserPwaAcceptance: 'not-run-after-hardening'",
]) {
  assert.equal(state.includes(required), true, `readiness snapshot missing invariant: ${required}`)
}

assert.equal(route.includes("import { READINESS_SNAPSHOT } from '@/lib/readiness-state'"), true)
assert.equal(route.includes("'Cache-Control': 'no-store'"), true)
assert.equal(route.includes('process.env.VERCEL_GIT_COMMIT_SHA || null'), true)

if (!existsSync(new URL('../bun.lock', import.meta.url))) {
  assert.equal(state.includes("id: 'dependency-lock-missing'"), true, 'missing bun.lock must remain a release blocker')
} else {
  assert.fail('bun.lock now exists: update readiness snapshot and release workflow before merging this state')
}

const swVersion = sw.match(/const CACHE_VERSION = '([^']+)'/)?.[1]
if (swVersion === 'aussy-v8') {
  assert.equal(state.includes("id: 'service-worker-safety-epoch-v8'"), true, 'aussy-v8 must remain a release blocker')
} else {
  assert.fail(`Service Worker epoch changed to ${swVersion || 'unknown'}: update readiness snapshot before release`)
}

assert.equal(cemadenProxy.includes("'X-Aussy-Safety-Block': 'cemaden-undocumented-api'"), true, 'CEMADEN mitigation missing while readiness snapshot claims it')
assert.equal(cemadenProxy.includes("matcher: ['/api/cemaden/alerts']"), true, 'CEMADEN matcher widened or disappeared')

assert.equal(existsSync(new URL('./run-safety-suite.mjs', import.meta.url)), true, 'unified safety suite missing')
assert.equal(existsSync(new URL('../.github/workflows/safety-suite.yml', import.meta.url)), true, 'Safety Suite workflow missing')
assert.equal(existsSync(new URL('../.github/workflows/release-readiness.yml', import.meta.url)), true, 'Release Readiness workflow missing')

console.log('Readiness contract OK — public trust snapshot matches current known blockers and mitigations')
