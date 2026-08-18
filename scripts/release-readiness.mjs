import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const blockers = []
const warnings = []
const passes = []

function pass(message) {
  passes.push(message)
}

function block(message) {
  blockers.push(message)
}

function warn(message) {
  warnings.push(message)
}

function read(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

function hasZoneIdentifier(dir = '.') {
  const ignored = new Set(['.git', '.next', 'node_modules', 'coverage', '.vercel'])
  const stack = [dir]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue
      const full = join(current, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.name.endsWith(':Zone.Identifier')) return full
    }
  }
  return null
}

console.log('Aussy release-readiness check')
console.log('=============================')

// 1) Dependency reproducibility
const bunLock = existsSync('bun.lock')
if (bunLock) pass('bun.lock exists')
else block('bun.lock is missing — dependency graph is not frozen')

const vercelRaw = read('vercel.json')
if (!vercelRaw) {
  block('vercel.json is missing or unreadable')
} else {
  try {
    const vercel = JSON.parse(vercelRaw)
    const installCommand = String(vercel.installCommand || '')
    if (bunLock) {
      if (/bun\s+(install\s+--frozen-lockfile|ci)(\s|$)/.test(installCommand)) {
        pass(`Vercel install is frozen: ${installCommand}`)
      } else {
        block(`bun.lock exists but Vercel install is not frozen: ${installCommand || '(unset)'}`)
      }
    } else if (/--frozen-lockfile|\bbun\s+ci\b/.test(installCommand)) {
      warn(`Vercel requests frozen install but bun.lock is missing: ${installCommand}`)
    } else {
      warn(`Vercel install remains non-frozen until bun.lock is generated: ${installCommand || '(unset)'}`)
    }
  } catch {
    block('vercel.json is not valid JSON')
  }
}

// 2) Safety suite availability
for (const path of [
  'scripts/run-safety-suite.mjs',
  '.github/workflows/safety-suite.yml',
  '.github/workflows/quality.yml',
]) {
  if (existsSync(path)) pass(`${path} present`)
  else block(`${path} missing`)
}

// 3) Service Worker safety-content epoch
const sw = read('public/sw.js')
if (!sw) {
  block('public/sw.js is missing')
} else {
  const match = sw.match(/const CACHE_VERSION = '([^']+)'/)
  const version = match?.[1] || 'unknown'
  if (version === 'aussy-v8') {
    block('Service Worker still uses aussy-v8 after safety-critical content rewrites; bump and validate a new cache epoch before release')
  } else if (version === 'unknown') {
    block('Service Worker cache epoch could not be identified')
  } else {
    pass(`Service Worker cache epoch is ${version}`)
  }

  if (sw.includes("const OSM_TILES_CACHE = 'aussy-v2-osm-tiles'")) {
    pass('Persistent OSM tile cache name is preserved')
  } else {
    block('Persistent OSM tile cache contract changed; review OSM policy before release')
  }
}

// 4) Temporary CEMADEN safety boundary while legacy endpoints remain
const cemadenRoute = read('src/app/api/cemaden/alerts/route.ts') || ''
const proxy = read('src/proxy.ts') || ''
const legacyCemaden = [
  'cemaden.gov.br/api/v1/monitoramento/alertas',
  'cemaden.gov.br/api/alerta/municipios.json',
].some((needle) => cemadenRoute.includes(needle))

if (legacyCemaden) {
  if (
    proxy.includes("matcher: ['/api/cemaden/alerts']") &&
    proxy.includes("'X-Aussy-Safety-Block': 'cemaden-undocumented-api'") &&
    proxy.includes('status: 503')
  ) {
    warn('Legacy CEMADEN endpoints still exist, but the temporary 503 safety boundary is active')
  } else {
    block('Legacy CEMADEN endpoints exist without the required safety boundary')
  }
} else {
  pass('Legacy undocumented CEMADEN endpoints are no longer present')
}

// 5) Repository hygiene
const zoneFile = hasZoneIdentifier('.')
if (zoneFile) block(`Windows metadata file tracked/present: ${zoneFile}`)
else pass('No :Zone.Identifier files found')

// 6) Explicitly state checks this script cannot replace
warn('Release still requires successful Safety Suite + type-check + lint + next build on a real runner')
warn('Release still requires browser/PWA acceptance: cold boot offline, reconnect, geolocation, emergency cache, iOS/mobile behavior')

console.log('\nPASS')
for (const item of passes) console.log(`  ✓ ${item}`)

if (warnings.length) {
  console.log('\nWARN')
  for (const item of warnings) console.log(`  ! ${item}`)
}

if (blockers.length) {
  console.error('\nBLOCK')
  for (const item of blockers) console.error(`  ✗ ${item}`)
  console.error(`\nNOT RELEASE READY — ${blockers.length} blocker(s), ${warnings.length} warning(s)`)
  process.exit(1)
}

console.log(`\nRELEASE-CHECK PASS — 0 blockers, ${warnings.length} warning(s)`)
