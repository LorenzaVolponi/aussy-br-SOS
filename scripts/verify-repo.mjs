import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const failures = []
const root = process.cwd()

function read(path) {
  try {
    return readFileSync(join(root, path), 'utf8')
  } catch {
    failures.push(`${path} missing or unreadable`)
    return ''
  }
}

function requireFragments(path, fragments) {
  const content = read(path)
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

function findZoneIdentifier(dir = root) {
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

const packageJson = requireFragments('package.json', [
  '"verify:repo": "node scripts/verify-repo.mjs"',
  '"test:sw": "node scripts/test-sw-runtime.mjs"',
  '"test:inmet": "node scripts/test-inmet-integrity.mjs"',
  '"test:api": "node scripts/test-api-trust.mjs"',
  '"test:osm": "node scripts/test-osm-policy.mjs"',
  '"next": "16.3.2"',
  '"satellite.js": "7.1.0"',
])
forbid('package.json', packageJson, ['npm install --force', '--legacy-peer-deps'])
if (!existsSync(join(root, 'bun.lock'))) failures.push('bun.lock must be versioned')

const quality = requireFragments('.github/workflows/quality.yml', [
  "bun-version: '1.3.14'",
  'node scripts/test-sw-runtime.mjs',
  'node scripts/test-inmet-integrity.mjs',
  'node scripts/test-api-trust.mjs',
  'node scripts/test-osm-policy.mjs',
  'bun install --frozen-lockfile',
  'bun run verify:repo',
  'bun run type-check',
  'bun run lint',
  'bun run build',
])
const installIndex = quality.indexOf('bun install --frozen-lockfile')
for (const command of [
  'node scripts/test-sw-runtime.mjs',
  'node scripts/test-inmet-integrity.mjs',
  'node scripts/test-api-trust.mjs',
  'node scripts/test-osm-policy.mjs',
]) {
  const index = quality.indexOf(command)
  if (index < 0 || installIndex < 0 || index > installIndex) failures.push(`quality workflow must run ${command} before dependency installation`)
}

const vercel = requireFragments('vercel.json', ['"installCommand": "bun install --frozen-lockfile"', '"buildCommand": "bun run build"'])
forbid('vercel.json', vercel, ['"installCommand": "bun install"'])

for (const path of [
  'scripts/run-safety-suite.mjs',
  '.github/workflows/safety-suite.yml',
  'scripts/release-readiness.mjs',
  '.github/workflows/release-readiness.yml',
  'scripts/test-readiness-contract.mjs',
  '.github/workflows/readiness-contract.yml',
  'scripts/test-cemaden-safety.mjs',
  '.github/workflows/cemaden-safety.yml',
  'scripts/test-satellite-catalog-trust.mjs',
  'scripts/test-first-aid-safety.mjs',
  'scripts/test-survival-safety.mjs',
  'scripts/test-survival-ui-safety.mjs',
  'scripts/test-fauna-safety.mjs',
  'scripts/test-offline-fallback-contracts.mjs',
  'scripts/test-orbital-integrity.mjs',
  'scripts/test-emergency-precache.mjs',
  'scripts/test-client-surface.mjs',
  'scripts/test-location-integrity.mjs',
  'scripts/test-live-functional-smoke.mjs',
]) {
  if (!existsSync(join(root, path))) failures.push(`${path} missing`)
}

const sw = requireFragments('public/sw.js', [
  "const CACHE_VERSION = 'aussy-v9'",
  "const OSM_TILES_CACHE = 'aussy-v2-osm-tiles'",
  "const OSM_TILE_META_CACHE = 'aussy-osm-tile-meta-v1'",
  'const OSM_MIN_TTL_MS = 7 * 24 * 60 * 60 * 1000',
  "const firstAid = await emergencyCache.match('/api/emergency/first-aid')",
  'Boolean(emergencyContacts) && Boolean(firstAid)',
  'k !== OSM_TILES_CACHE',
  'PRECACHE_SHELL',
  'PRECACHE_EMERGENCY',
  'PRECACHE_LOCATION',
  "if (url.hostname === 'tile.openstreetmap.org')",
  "dataQuality: 'official-portal'",
  'Lista vazia NÃO significa ausência de alertas ativos',
  "console.log('[SW] Install v9'",
])
forbid('public/sw.js', sw, [
  "const CACHE_VERSION = 'aussy-v8'",
  "url.hostname === 'a.tile.openstreetmap.org'",
  "url.hostname === 'b.tile.openstreetmap.org'",
  "url.hostname === 'c.tile.openstreetmap.org'",
  '/api/queimadas/focos?lat=-15.7801',
  '/api/cptec/forecast?lat=-15.7801',
  "'User-Agent'",
])
try { new Function(sw) } catch (error) { failures.push(`public/sw.js syntax error: ${error instanceof Error ? error.message : String(error)}`) }

const swRuntime = requireFragments('scripts/test-sw-runtime.mjs', [
  "caches.open('aussy-v9-static')",
  "caches.open('aussy-v9-emergency')",
  "caches.open('aussy-v9-runtime')",
  'current emergency safety content',
  'offline CEMADEN fallback remains portal-only',
  'OSM tile cache avoids refetch inside 7-day window and revalidates after it',
  'PRECACHE_LOCATION warms all location endpoints with real coordinates',
])
forbid('scripts/test-sw-runtime.mjs', swRuntime, ["caches.open('aussy-v8-runtime')"])

const cemaden = requireFragments('src/app/api/cemaden/alerts/route.ts', [
  "automationAvailable: false",
  "dataQuality: 'official-portal'",
  "verifiedAt: VERIFIED_AT",
  'Lista vazia NÃO significa ausência de alertas ativos',
  'alertas-em-tempo-real',
  'previsao-de-riscos',
  'georisk.cemaden.gov.br',
])
forbid('src/app/api/cemaden/alerts/route.ts', cemaden, ['cemaden.gov.br/api/v1/monitoramento/alertas', 'cemaden.gov.br/api/alerta/municipios.json', "dataQuality: 'live'"])
if (existsSync(join(root, 'src/proxy.ts'))) failures.push('temporary src/proxy.ts must be removed after final CEMADEN migration')

const cemadenUi = requireFragments('src/components/aussy/cemaden-alerts.tsx', ['PORTAL OFICIAL', 'CEMADEN / MCTI — canais oficiais', 'cemaden.portals.map', 'Aguardando localização válida', 'Nenhuma cidade padrão é assumida'])
forbid('src/components/aussy/cemaden-alerts.tsx', cemadenUi, ['Nenhum monitoramento ativo no momento', 'alerta(s) CEMADEN ativos', 'const lat = point?.lat ?? -15.7801', 'const lon = point?.lon ?? -47.9292', 'else fetchQueimadas()'])

const rivers = requireFragments('src/app/api/ana/rios/route.ts', [
  "dataQuality: 'official-portals-only'",
  "automationAvailable: false",
  'https://www.sgb.gov.br/sace/',
  'monitoramento-hidrologico',
  'https://www.gov.br/ana/pt-br/sala-de-situacao',
  "error: 'invalid-location'",
  'O Aussy não publica nível, vazão, tendência ou alerta de rio como dado ao vivo',
])
forbid('src/app/api/ana/rios/route.ts', rivers, ['ESTACOES_REFERENCIA', 'nivel_atual: 0', '-15.7801', '-47.9292'])

const riversUi = requireFragments('src/components/aussy/ana-rios.tsx', ['Rios e cheias · fontes oficiais', 'SGB/SACE e ANA', 'Sem telemetria inventada', 'data.sources.map'])
forbid('src/components/aussy/ana-rios.tsx', riversUi, ['Nenhuma estação de referência no raio de 500 km', 'nivel_atual'])

const networkUi = requireFragments('src/components/aussy/network-monitor.tsx', [
  "useLatencyProbe('/api/health', 10000)",
  'Rede e conectividade',
  'Latência aparelho → Aussy',
  'navegadores não expõem uma lista confiável de SSIDs próximos',
  'O Aussy não simula redes disponíveis',
])
forbid('src/components/aussy/network-monitor.tsx', networkUi, ['IP externo detectado'])

const localChannel = requireFragments('src/components/aussy/mesh-network.tsx', [
  'Canal local experimental',
  'isto não é uma rede mesh celular‑para‑celular',
  'o teste de Bluetooth abaixo apenas abre o seletor de dispositivo',
])
forbid('src/components/aussy/mesh-network.tsx', localChannel, ['Cada celular vira um nó da rede', 'retransmitindo mensagens para outros próximos'])

const satellites = requireFragments('src/lib/data/satellites.ts', ["number: '188', name: 'CVV — Centro de Valorização da Vida'", "verifiedAt: '2026-08-18'", "dataQuality: 'unverified-static'", 'operatorsInNegotiation: []'])
forbid('src/lib/data/satellites.ts', satellites, ["name: 'Linha da Vida'"])

const contacts = requireFragments('src/app/api/emergency/contacts/route.ts', ["dataQuality: 'verified-static'", "verifiedAt: '2026-08-18'", "number: '40199'", 'Defesa Civil Alerta'])
forbid('src/app/api/emergency/contacts/route.ts', contacts, ["verifiedAt: '2026-08-17'", 'Não disponível oficialmente no Brasil em 17/08/2026'])

const readiness = requireFragments('src/lib/readiness-state.ts', [
  "verifiedAt: '2026-08-27'",
  'releaseReady: false',
  'webReleaseReady: true',
  'pwaInstalledReleaseReady: false',
  "id: 'installed-pwa-real-device-acceptance'",
  "id: 'dependency-graph-frozen'",
  "weather: 'met-norway-live-model-or-last-known-good'",
  "storms: 'inmet-live-alerts-plus-met-norway-model-context'",
  "rivers: 'sgb-sace-and-ana-official-portals'",
  "network: 'browser-network-api-plus-aussy-health-probe'",
  "satelliteOrbit: 'celestrak-omm-sgp4-live-or-last-known-good'",
  "cemaden: 'official-portal-only'",
  "serviceWorkerSafetyEpoch: 'aussy-v9'",
])
forbid('src/lib/readiness-state.ts', readiness, ["id: 'functional-audit-pr-pending'", "id: 'dependency-lock-missing'", "id: 'full-build-not-executed'", "id: 'service-worker-safety-epoch-v8'", "id: 'cemaden-undocumented-api-blocked'"])

const layout = requireFragments('src/app/layout.tsx', ['className="light"', 'defaultTheme="light"', 'statusBarStyle: "default"', 'applicationName: "AUSSY.SOS"'])
forbid('src/app/layout.tsx', layout, ['defaultTheme="dark"', '"WiFi grátis"'])

const manifest = requireFragments('public/manifest.json', ['"name": "AUSSY.SOS — Segurança e Resiliência"', '"short_name": "AUSSY.SOS"', '"background_color": "#f7f8fa"', 'Tiles realmente visualizados podem permanecer no cache local'])
forbid('public/manifest.json', manifest, ['"screenshots"', 'download de tiles', 'Operadora de Resiliência Orbital'])

const page = requireFragments('src/app/page.tsx', [
  '<HomeCommandDashboard',
  'onOpenQr={() => setQrLocOpen(true)}',
  'aria-label="SOS"',
  'Menu rápido AUSSY',
  'Essencial',
  'Explorar',
  'Mapa e rede',
  'Rios e natureza',
  'Aguardando localização válida',
  'O Aussy não assume uma cidade padrão',
  "<EmergencySOS observerLat={point?.lat} observerLon={point?.lon} />",
  '<QuickShare initialPoint={point} />',
  '<QrLocation open={qrLocOpen} onOpenChange={setQrLocOpen} initialPoint={point} />',
  'Aussy Ontech combina recursos locais, fontes externas e cache de última resposta válida',
  'Não substitui serviços oficiais de emergência',
  'AIX8C - Uma tecnologia do grupo volponi.tech !',
])
forbid('src/app/page.tsx', page, ['const observerLat = point?.lat ?? -15.7801', 'const observerLon = point?.lon ?? -47.9292', 'point?.lat ?? 0', 'point?.lon ?? 0', '100% offline', '98.7%', '4.897', '+2.4M'])

const commandHome = requireFragments('src/components/aussy/home-command-dashboard.tsx', [
  "const STORAGE_KEY = 'aussy_quick_actions_v2'",
  "const DEFAULT_QUICK: QuickKey[] = ['emergency', 'alerts', 'map', 'contacts']",
  'Ações rápidas',
  'O essencial em até dois toques.',
  'Ver todos os recursos',
  'Compartilhar localização',
  "fetch('/api/inmet/alerts'",
  '/api/cptec/forecast?lat=',
  "response.headers.get('X-Aussy-Cached')",
  'INMET indisponível nesta consulta',
  'Sem cidade padrão, sem coordenada inventada e com cache identificado.',
])
forbid('src/components/aussy/home-command-dashboard.tsx', commandHome, ['São Paulo, SP', '2 ALERTAS ATIVOS', '100% online', '24°', 'const lat = -15.7801', 'const lon = -47.9292'])

const globals = requireFragments('src/app/globals.css', ['--background: oklch(0.985', 'html.dark', '.glass-card', 'min-height: 44px', ':focus-visible', '@media (prefers-reduced-motion: reduce)'])
forbid('src/app/globals.css', globals, ['mantemos dark-only por enquanto'])

const zoneFile = findZoneIdentifier()
if (zoneFile) failures.push(`Windows metadata present: ${zoneFile}`)

if (failures.length) {
  console.error('Aussy repository invariants FAILED')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Aussy repository invariants OK — frozen dependencies, simplified release UI, official source boundaries, SW v9 and web-release gates are aligned')
