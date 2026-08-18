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

const mapPath = 'src/components/aussy/offline-map.tsx'
const swPath = 'public/sw.js'
const docsPath = 'docs/OFFLINE_TEST.md'

const map = await read(mapPath)
requireFragments(mapPath, map, [
  'https://tile.openstreetmap.org/${z}/${x}/${y}.png',
  'initialLat: number',
  'initialLon: number',
  '© OpenStreetMap contributors',
  'https://www.openstreetmap.org/copyright',
  'O Aussy não pré-baixa áreas nem pilhas de zoom',
  'tiles efetivamente vistos',
])
forbidFragments(mapPath, map, [
  'handleDownloadOffline',
  'Baixar offline',
  'Baixando tiles OpenStreetMap',
  "fetch(url, { cache: 'no-store' })",
  'initialLat = -15.7801',
  'initialLon = -47.9292',
  'CC-BY-SA',
  'Funciona 100% offline após download',
])

const sw = await read(swPath)
requireFragments(swPath, sw, [
  "const OSM_TILES_CACHE = 'aussy-v2-osm-tiles'",
  "const OSM_TILE_META_CACHE = 'aussy-osm-tile-meta-v1'",
  'const OSM_MIN_TTL_MS = 7 * 24 * 60 * 60 * 1000',
  'async function osmTileCache(request)',
  "if (url.hostname === 'tile.openstreetmap.org')",
  'event.respondWith(osmTileCache(request))',
  'const response = await fetch(request)',
  'if (cached) return cached',
])
forbidFragments(swPath, sw, [
  "url.hostname === 'a.tile.openstreetmap.org'",
  "url.hostname === 'b.tile.openstreetmap.org'",
  "url.hostname === 'c.tile.openstreetmap.org'",
  'cacheFirst(request, OSM_TILES_CACHE)',
  "fetch(request, { cache: 'no-store' })",
])

const docs = await read(docsPath)
requireFragments(docsPath, docs, [
  'Não existe pré-download de região no servidor padrão do OpenStreetMap',
  'Tiles OpenStreetMap previamente **visualizados**',
  'Pacotes completos de mapas offline exigem um provedor que autorize prefetch/offline',
])
forbidFragments(docsPath, docs, [
  'baixe os tiles da região',
  'Tiles previamente baixados',
  'mapas OSM baixados',
])

if (failures.length) {
  console.error('\nOSM tile policy gate failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('OSM tile policy gate OK — interactive-only requests, visible attribution and passive cache semantics are protected')
