import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const ignoredDirs = new Set(['.git', '.next', 'node_modules', 'coverage', '.vercel'])
const failures = []

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue
    const absolute = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(absolute)
      continue
    }
    if (entry.name.endsWith(':Zone.Identifier')) {
      failures.push(`Windows metadata tracked: ${relative(root, absolute)}`)
    }
  }
}

async function assertFileContains(path, fragments) {
  const content = await readFile(join(root, path), 'utf8')
  for (const fragment of fragments) {
    if (!content.includes(fragment)) failures.push(`${path} missing invariant: ${fragment}`)
  }
  return content
}

function forbid(path, content, fragments) {
  for (const fragment of fragments) {
    if (content.includes(fragment)) failures.push(`${path} contains forbidden pattern: ${fragment}`)
  }
}

await walk(root)

const sw = await assertFileContains('public/sw.js', [
  "const CACHE_VERSION = 'aussy-v8'",
  "const OSM_TILES_CACHE = 'aussy-v2-osm-tiles'",
  'k !== OSM_TILES_CACHE',
  '/_next/static/',
  'PRECACHE_SHELL',
  'PRECACHE_EMERGENCY',
  "response.type === 'opaque'",
  'currentCachesReady',
])
forbid('public/sw.js', sw, ["'User-Agent'", 'aussy-v2-emergency', 'aussy-v2-statics'])
try {
  // Compila sem executar: pega erros de sintaxe no service worker antes do deploy.
  new Function(sw)
} catch (error) {
  failures.push(`public/sw.js syntax error: ${error instanceof Error ? error.message : String(error)}`)
}

const offlineManager = await assertFileContains('src/components/aussy/offline-manager.tsx', [
  "sendWorkerCommand('PRECACHE_SHELL')",
  "sendWorkerCommand('PRECACHE_EMERGENCY')",
  'MessageChannel',
  'App shell + JS/CSS em cache',
])
forbid('src/components/aussy/offline-manager.tsx', offlineManager, ['aussy-v2-emergency', 'aussy-v2-statics'])

const geolocation = await assertFileContains('src/hooks/use-geolocation.ts', [
  "const STORAGE_KEY = 'aussy_last_location_v1'",
  'source: \'cached\'',
  'const detect = useCallback',
  "fetch('/api/network/status'",
])
forbid('src/hooks/use-geolocation.ts', geolocation, ['https://ipapi.co/json/'])

const networkStatus = await assertFileContains('src/app/api/network/status/route.ts', [
  "const CONNECTIVITY_TARGET = 'https://www.google.com/generate_204'",
  'geo: latitude !== null && longitude !== null',
  'Nenhuma URL fornecida pelo cliente é buscada pelo servidor',
])
forbid('src/app/api/network/status/route.ts', networkStatus, ["searchParams.get('url')"])

await assertFileContains('src/app/layout.tsx', [
  "window.addEventListener('online'",
  "worker.postMessage({ type: 'PRECACHE_SHELL' })",
  "worker.postMessage({ type: 'PRECACHE_EMERGENCY' })",
])

await assertFileContains('src/app/api/coverage/towers/route.ts', [
  "towers: 'synthetic'",
  "wifiPoints: 'sample'",
  'não devem ser usadas para decisão operacional',
])

await assertFileContains('src/components/aussy/coverage-map.tsx', [
  'quality="synthetic"',
  'quality="sample"',
  'não devem orientar deslocamento, segurança ou decisão operacional',
])

const coverageData = await assertFileContains('src/lib/data/coverage.ts', [
  "const UNVERIFIED = 'não verificado nesta build'",
  "referenceStatus: 'unverified-static'",
  'verificar em fonte oficial antes de uso operacional',
])

for (const forbidden of ['~52.000 torres', '~48.000 torres', '~45.000 torres', "marketShare: '32%'", "marketShare: '30%'", "marketShare: '28%'"]) {
  if (coverageData.includes(forbidden)) failures.push(`Coverage data contains unversioned statistic: ${forbidden}`)
}

const regulatory = await assertFileContains('src/components/aussy/regulatory-info.tsx', [
  'quality="static"',
  'confirme diretamente nas fontes oficiais',
])

for (const forbidden of ['Previsão realista:', 'prováveis pioneiros']) {
  if (regulatory.includes(forbidden)) failures.push(`Regulatory UI contains unverified forecast language: ${forbidden}`)
}

if (failures.length) {
  console.error('\nAussy repository verification failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Aussy repository invariants OK — online/offline resilience checks passed')
