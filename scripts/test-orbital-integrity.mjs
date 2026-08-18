import { readFile } from 'node:fs/promises'
import process from 'node:process'

const failures = []

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

function requireFragments(path, content, fragments) {
  for (const fragment of fragments) {
    if (!content.includes(fragment)) failures.push(`${path} missing invariant: ${fragment}`)
  }
}

function forbidFragments(path, content, fragments) {
  for (const fragment of fragments) {
    if (content.includes(fragment)) failures.push(`${path} contains forbidden pattern: ${fragment}`)
  }
}

const routePath = 'src/app/api/satellites/tle/route.ts'
const uiPath = 'src/components/aussy/satellite-tracker.tsx'
const swPath = 'public/sw.js'

const route = await read(routePath)
requireFragments(routePath, route, [
  "dataQuality: 'observer-required'",
  'Nenhuma posição orbital foi calculada',
  'nenhuma cidade padrão é assumida',
  "dataQuality: 'live-tle-approx-position'",
  "propagation: 'aproximação visual — não SGP4'",
  'tleAgeHours',
  'Sem TLE real confirmado nesta resposta',
  '{ status: 503 }',
])
forbidFragments(routePath, route, [
  "searchParams.get('lat') || '-15.7801'",
  "searchParams.get('lon') || '-47.9292'",
  'HARDCODED_TLES',
  'CONSTELLATION_COUNTS',
  'newRaan',
  'Math.random',
])

const observerBlock = route.indexOf('if (obsLat === null || obsLon === null)')
const upstreamFetch = route.indexOf('const response = await fetch(url')
if (observerBlock < 0 || upstreamFetch < 0 || observerBlock > upstreamFetch) {
  failures.push(`${routePath} must short-circuit observer-less requests before the CelesTrak fetch`)
}

const ui = await read(uiPath)
requireFragments(uiPath, ui, [
  "res.headers.get('X-Aussy-Cached')",
  "res.headers.get('X-Aussy-Offline')",
  "cached ? 'CACHE'",
  'Snapshot em cache',
  'a posição não é recalculada offline',
  'TLE mais antigo no feed',
  'idade do TLE na consulta',
  'if (!autoRefresh || !network.online) return',
  'DataProvenance',
])
forbidFragments(uiPath, ui, [
  'Rastreador Orbital em Tempo Real',
  'Visíveis agora',
  'setInterval(fetchSats, 30000)',
  'D2C LEO (banda larga)',
  "count: '~6500'",
])

const sw = await read(swPath)
requireFragments(swPath, sw, [
  "const SATELLITE_CACHE = `${CACHE_VERSION}-satellites`",
  "url.pathname.startsWith('/api/satellites')",
  'networkFirst(request, SATELLITE_CACHE',
])

if (failures.length) {
  console.error('\nOrbital integrity gate failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Orbital integrity gate OK — observer gating, cache provenance, TLE age and offline refresh semantics are protected')
