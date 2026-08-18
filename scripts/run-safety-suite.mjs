import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'

const gates = [
  ['Repository invariants', 'scripts/verify-repo.mjs'],
  ['Service Worker runtime', 'scripts/test-sw-runtime.mjs'],
  ['INMET integrity', 'scripts/test-inmet-integrity.mjs'],
  ['API trust', 'scripts/test-api-trust.mjs'],
  ['OSM policy', 'scripts/test-osm-policy.mjs'],
  ['Client surface', 'scripts/test-client-surface.mjs'],
  ['Orbital integrity', 'scripts/test-orbital-integrity.mjs'],
  ['Emergency precache', 'scripts/test-emergency-precache.mjs'],
  ['First-aid clinical safety', 'scripts/test-first-aid-safety.mjs'],
  ['Offline fallback contracts', 'scripts/test-offline-fallback-contracts.mjs'],
  ['Survival data safety', 'scripts/test-survival-safety.mjs'],
  ['Survival UI safety', 'scripts/test-survival-ui-safety.mjs'],
  ['Fauna safety', 'scripts/test-fauna-safety.mjs'],
  ['Satellite catalog trust', 'scripts/test-satellite-catalog-trust.mjs'],
  ['CEMADEN safety', 'scripts/test-cemaden-safety.mjs'],
]

let failures = 0
const startedAt = Date.now()

console.log(`Aussy zero-dependency safety suite — ${gates.length} gates`)
console.log('Node', process.version)
console.log('')

for (const [label, script] of gates) {
  if (!existsSync(script)) {
    failures += 1
    console.error(`FAIL ${label}: missing ${script}`)
    continue
  }

  const started = Date.now()
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
    env: process.env,
  })

  const elapsed = Date.now() - started
  const stdout = (result.stdout || '').trim()
  const stderr = (result.stderr || '').trim()

  if (result.status === 0) {
    console.log(`PASS ${label} (${elapsed}ms)`)
    if (stdout) console.log(stdout.split('\n').map((line) => `  ${line}`).join('\n'))
    continue
  }

  failures += 1
  console.error(`FAIL ${label} (${elapsed}ms, exit ${result.status ?? 'null'})`)
  if (stdout) console.error(stdout.split('\n').map((line) => `  ${line}`).join('\n'))
  if (stderr) console.error(stderr.split('\n').map((line) => `  ${line}`).join('\n'))
  if (result.error) console.error(`  ${result.error.message}`)
}

const totalMs = Date.now() - startedAt
console.log('')
if (failures > 0) {
  console.error(`Safety suite FAILED — ${failures}/${gates.length} gate(s) failed in ${totalMs}ms`)
  process.exit(1)
}

console.log(`Safety suite OK — ${gates.length}/${gates.length} gates passed in ${totalMs}ms`)
