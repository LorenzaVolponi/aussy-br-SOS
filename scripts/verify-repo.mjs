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
    if (entry.name.endsWith(':Zone.Identifier')) failures.push(`Windows metadata tracked: ${relative(root, absolute)}`)
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
  'PRECACHE_LOCATION',
  'locationPrecacheUrls',
  'responseIsLiveAndUsable',
  'X-Aussy-Upstream-Degraded',
  "response.type === 'opaque'",
  'currentCachesReady',
])
forbid('public/sw.js', sw, [
  "'User-Agent'",
  'aussy-v2-emergency',
  'aussy-v2-statics',
  '/api/queimadas/focos?lat=-15.7801',
  '/api/cptec/forecast?lat=-15.7801',
  '/api/ana/rios?lat=-15.7801',
])
try {
  new Function(sw)
} catch (error) {
  failures.push(`public/sw.js syntax error: ${error instanceof Error ? error.message : String(error)}`)
}

const chunkWarmer = await assertFileContains('src/components/aussy/offline-chunk-warmer.tsx', [
  "const WARM_VERSION = 'aussy-offline-modules-v8'",
  "type: 'PRECACHE_LOCATION'",
  'navigator.geolocation.getCurrentPosition',
  "import('@/components/aussy/satellite-tracker')",
  "import('@/components/aussy/defesa-civil')",
])
forbid('src/components/aussy/offline-chunk-warmer.tsx', chunkWarmer, ['-15.7801', '-47.9292'])

const offlineManager = await assertFileContains('src/components/aussy/offline-manager.tsx', [
  "sendWorkerCommand('PRECACHE_SHELL')",
  "sendWorkerCommand('PRECACHE_EMERGENCY')",
  'MessageChannel',
  'App shell + JS/CSS em cache',
])
forbid('src/components/aussy/offline-manager.tsx', offlineManager, ['aussy-v2-emergency', 'aussy-v2-statics'])

const geolocation = await assertFileContains('src/hooks/use-geolocation.ts', [
  "const STORAGE_KEY = 'aussy_last_location_v1'",
  "source: 'cached'",
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

await assertFileContains('src/hooks/use-network.ts', [
  '!navigator.onLine',
  "res.headers.get('X-Aussy-Cached')",
  'new AbortController()',
])

const networkMonitor = await assertFileContains('src/components/aussy/network-monitor.tsx', [
  'if (!network.online)',
  "r.headers.get('X-Aussy-Cached')",
  'network.online && serverStatus?.externalIp',
])
forbid('src/components/aussy/network-monitor.tsx', networkMonitor, ['Recebe alertas do governo'])

await assertFileContains('src/app/layout.tsx', [
  '<OfflineChunkWarmer />',
  "window.addEventListener('online'",
  "worker.postMessage({ type: 'PRECACHE_SHELL' })",
  "worker.postMessage({ type: 'PRECACHE_EMERGENCY' })",
])

const emergencyContacts = await assertFileContains('src/app/api/emergency/contacts/route.ts', [
  "verifiedAt: '2026-08-17'",
  "channel: 'automático'",
  "number: '40199'",
  'Não disponível oficialmente no Brasil em 17/08/2026',
  'O Aussy não cria conectividade por satélite',
])
forbid('src/app/api/emergency/contacts/route.ts', emergencyContacts, [
  'US$ 14.95/mês',
  'Samsung Galaxy S22+',
  'Snapdragon Satellite',
  'channel: 4370',
])

const cemaden = await assertFileContains('src/app/api/cemaden/alerts/route.ts', [
  'Nenhum alerta sintético foi gerado',
  "dataQuality: 'unavailable'",
  'painelalertas.cemaden.gov.br',
])
forbid('src/app/api/cemaden/alerts/route.ts', cemaden, ['generateSimulatedAlerts', 'generateSimulated', 'alertasSazonais'])

const forecast = await assertFileContains('src/app/api/cptec/forecast/route.ts', [
  'Nenhuma previsão sintética foi gerada',
  "days: []",
  "dataQuality: 'unavailable'",
])
forbid('src/app/api/cptec/forecast/route.ts', forecast, ['Math.random', 'fallbackDays', 'Clima típico'])

const satelliteImages = await assertFileContains('src/app/api/cptec/satellite/route.ts', [
  "dataQuality: 'official-portal'",
  'https://sigma.cptec.inpe.br/',
  'Nenhuma URL de imagem é gerada por estimativa',
])
forbid('src/app/api/cptec/satellite/route.ts', satelliteImages, ['http://satellite1.cptec.inpe.br', 'goes16_4_br_', 'buildUrls()'])

const fires = await assertFileContains('src/app/api/queimadas/focos/route.ts', [
  'dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/',
  'Nenhum foco sintético foi gerado',
  "dataQuality: 'live-open-data'",
])
forbid('src/app/api/queimadas/focos/route.ts', fires, ['generateSimulatedFocos', 'Math.random', 'Hotspots conhecidos'])

const earthquakes = await assertFileContains('src/app/api/earthquakes/route.ts', [
  'Nenhum sismo histórico foi apresentado como evento atual',
  "dataQuality: 'unavailable'",
  'events: []',
])
forbid('src/app/api/earthquakes/route.ts', earthquakes, ['fallback-1', 'Caldas Novas, GO', 'Porto dos Gaúchos, MT'])

const defesa = await assertFileContains('src/app/api/defesacivil/alertas/route.ts', [
  "dataQuality: 'official-channels-only'",
  "number: '40199'",
  "number: '+55 61 2034-4611'",
  'Nenhum alerta sazonal ou estimado',
])
forbid('src/app/api/defesacivil/alertas/route.ts', defesa, ['alertasSazonais', 'Estação chuvosa', 'Estação de queimadas'])

const ana = await assertFileContains('src/app/api/ana/rios/route.ts', [
  "dataQuality: 'reference-location-only'",
  'nivel_atual: null',
  "tendencia: 'desconhecido'",
  'HidroWebservice',
])
forbid('src/app/api/ana/rios/route.ts', ana, [
  'nivel_atual: 21.5',
  "tendencia: 'subindo'",
  'atualizado: new Date().toISOString()',
])

const tle = await assertFileContains('src/app/api/satellites/tle/route.ts', [
  "weather: 'weather'",
  "gnss: 'gps-ops'",
  "dataQuality: 'live-tle-approx-position'",
  'Sem TLE real confirmado nesta resposta',
])
forbid('src/app/api/satellites/tle/route.ts', tle, ['HARDCODED_TLES', 'CONSTELLATION_COUNTS', 'multiplier', 'newRaan'])

const passes = await assertFileContains('src/app/api/satellites/passes/route.ts', [
  'Nenhuma passagem é simulada',
  'SGP4',
  'passes: []',
])
forbid('src/app/api/satellites/passes/route.ts', passes, ['Math.random', 'slVisible', 'irVisible'])

const orbitalUi = await assertFileContains('src/components/aussy/satellite-tracker.tsx', [
  'Posição orbital aproximada',
  'Estimativa, não rastreio operacional.',
  'Acima do horizonte (est.)',
  'Objetos no feed',
  'Catálogo local de constelações',
  'Referência local, não status em tempo real.',
  'Confirmar no site oficial',
])
forbid('src/components/aussy/satellite-tracker.tsx', orbitalUi, [
  'Rastreador Orbital em Tempo Real',
  'Visíveis agora',
  '{g.count}',
  'Ativos / Total',
  'Parceiros / Operadoras',
  'Modelo de custo',
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

console.log('Aussy repository invariants OK — online/offline resilience, orbital trust and data-safety checks passed')
