import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message)
}

const resilience = read('src/lib/api-resilience.ts')
const inmet = read('src/app/api/inmet/alerts/route.ts')
const geocode = read('src/app/api/geocode/route.ts')
const lite = read('src/app/emergency-lite/page.tsx')
const manifest = read('public/manifest.json')

requireMatch(resilience, /status:\s*429/, 'rate limiter must return HTTP 429')
requireMatch(resilience, /Retry-After/, 'rate limiter/circuit breaker must publish Retry-After')
requireMatch(resilience, /failureThreshold/, 'circuit breaker threshold contract missing')
requireMatch(resilience, /cooldownMs/, 'circuit breaker cooldown contract missing')
requireMatch(resilience, /rateBuckets = new Map/, 'rate buckets must remain process-local and ephemeral')
requireMatch(resilience, /circuits = new Map/, 'circuit state must remain process-local and ephemeral')

for (const [name, source] of [['INMET', inmet], ['Nominatim', geocode]]) {
  requireMatch(source, /enforceRateLimit\(/, `${name} must enforce rate limiting`)
  requireMatch(source, /isCircuitOpen\(/, `${name} must check circuit state`)
  requireMatch(source, /recordProviderFailure\(/, `${name} must record upstream failures`)
  requireMatch(source, /recordProviderSuccess\(/, `${name} must reset circuit after success`)
  requireMatch(source, /freshness:\s*'live'/, `${name} must label live freshness`)
  requireMatch(source, /freshness:\s*'unavailable'/, `${name} must label unavailable freshness`)
}

requireMatch(lite, /force-static/, 'emergency-lite must remain static')
requireMatch(lite, /tel:192/, 'emergency-lite must expose SAMU')
requireMatch(lite, /tel:193/, 'emergency-lite must expose Bombeiros')
requireMatch(lite, /tel:190/, 'emergency-lite must expose Polícia Militar')
requireMatch(lite, /tel:199/, 'emergency-lite must expose Defesa Civil')
requireMatch(lite, /Não interprete ausência de dados como ausência de risco/, 'emergency-lite safety language missing')
requireMatch(manifest, /\/emergency-lite/, 'PWA manifest must expose emergency-lite shortcut')

console.log('Field resilience gate: PASS')
