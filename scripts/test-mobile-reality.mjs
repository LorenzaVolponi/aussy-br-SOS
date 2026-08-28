import fs from 'node:fs'

const files = {
  geolocation: fs.readFileSync('src/hooks/use-geolocation.ts', 'utf8'),
  torch: fs.readFileSync('src/components/aussy/device-torch.tsx', 'utf8'),
  quickShare: fs.readFileSync('src/components/aussy/quick-share.tsx', 'utf8'),
  offlineManager: fs.readFileSync('src/components/aussy/offline-manager.tsx', 'utf8'),
  offlineMap: fs.readFileSync('src/components/aussy/offline-map.tsx', 'utf8'),
  provenance: fs.readFileSync('src/components/aussy/data-provenance.tsx', 'utf8'),
  page: fs.readFileSync('src/app/page.tsx', 'utf8'),
  sw: fs.readFileSync('public/sw.js', 'utf8'),
  nextConfig: fs.readFileSync('next.config.ts', 'utf8'),
}

const failures = []

function expect(name, condition, detail) {
  if (!condition) failures.push(`${name}: ${detail}`)
}

expect('GPS watcher', files.geolocation.includes('watchPosition('), 'GPS precisa usar watchPosition para escolher o melhor fix')
expect('GPS freshness', files.geolocation.includes('maximumAge: 0'), 'aquisição principal não pode aceitar posição velha')
expect('GPS cleanup', files.geolocation.includes('clearWatch('), 'watcher GPS precisa ser encerrado')
expect('GPS provenance', files.geolocation.includes("source: 'gps'"), 'posição precisa carregar procedência')
expect('GPS cache fallback', files.geolocation.includes("source: 'cached'"), 'última posição conhecida precisa ser explícita')

expect('Torch capability', files.torch.includes('torch'), 'lanterna deve verificar capability torch')
expect('Torch constraints', files.torch.includes('applyConstraints'), 'LED físico deve ser acionado por MediaTrack constraints')
expect('Torch cleanup', files.torch.includes('.stop()'), 'tracks da câmera precisam ser encerradas')
expect('Camera self only', files.nextConfig.includes('camera=(self)'), 'Permissions-Policy deve permitir câmera somente no próprio origin')
expect('No blocked camera policy', !files.nextConfig.includes('camera=()'), 'camera=() quebraria o LED físico')

expect('SOS native share', files.quickShare.includes('navigator.share'), 'SOS/localização deve usar compartilhamento nativo quando disponível')
expect('SOS SMS fallback', files.quickShare.includes('sms:'), 'SOS deve possuir fallback por SMS')
expect('SOS copy fallback', files.quickShare.includes('clipboard.writeText'), 'SOS deve permitir copiar texto sem depender de app externo')
expect('SOS provenance', files.quickShare.includes("point.source === 'cached'"), 'mensagem deve distinguir posição atual de posição salva')

expect('Offline shell', files.offlineManager.includes("PRECACHE_SHELL"), 'modo offline precisa preparar o app shell')
expect('Offline emergency', files.offlineManager.includes("PRECACHE_EMERGENCY"), 'modo offline precisa preparar dados nacionais críticos')
expect('Offline location', files.offlineManager.includes("PRECACHE_LOCATION"), 'modo offline precisa preparar dados dependentes da posição real')
expect('SW location contract', files.sw.includes("data.type === 'PRECACHE_LOCATION'"), 'Service Worker precisa aceitar pré-cache por localização')
expect('SW no fake absence', files.sw.includes('dataQuality') && files.sw.includes('unavailable'), 'fallback offline deve sinalizar indisponibilidade em vez de fabricar normalidade')

expect('Map recenter', files.offlineMap.includes('LocateFixed'), 'mapa precisa oferecer retorno rápido à posição do usuário')
expect('Map attribution', files.offlineMap.includes('OpenStreetMap contributors'), 'atribuição OSM precisa permanecer visível')
expect('Map no bulk prefetch', files.offlineMap.includes('NÃO oferece pré-download/prefetch'), 'servidor OSM padrão não pode ser usado para prefetch em massa')

expect('Bottom mobile nav', files.page.includes('MOBILE_TAB_ORDER'), 'navegação mobile inferior direta precisa continuar presente')
expect('Emergency always reachable', files.page.includes('EMERGENCY_TAB'), 'SOS precisa permanecer destacado fora do menu lateral')
expect('Safe-area support', files.page.includes('safe-area-inset-bottom'), 'navegação mobile deve respeitar safe area do iPhone')

expect('Data source component', files.provenance.includes('updatedAt'), 'proveniência precisa suportar timestamp/idade da fonte')
expect('Data quality component', files.provenance.includes('quality'), 'proveniência precisa expor qualidade/indisponibilidade')

if (failures.length) {
  console.error('\nMobile Reality Gate FAILED\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Mobile Reality Gate OK')
console.log('GPS + torch + SOS/share + offline/location cache + map + bottom navigation + provenance contracts verified.')
