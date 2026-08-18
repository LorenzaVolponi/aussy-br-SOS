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

const configPath = 'next.config.ts'
const swPath = 'public/sw.js'
const swTestPath = 'scripts/test-sw-runtime.mjs'

const config = await read(configPath)
requireFragments(configPath, config, [
  "const OSM_TILE_ORIGIN = 'https://tile.openstreetmap.org'",
  '`img-src \'self\' data: blob: ${OSM_TILE_ORIGIN}`',
  '`connect-src \'self\' ${OSM_TILE_ORIGIN}`',
  '"style-src \'self\' \'unsafe-inline\'"',
  '"font-src \'self\' data:"',
  '"frame-src \'self\'"',
  "{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }",
])
forbidFragments(configPath, config, [
  'TRUSTED_API_ORIGINS',
  'remotePatterns',
  'satellite1.cptec.inpe.br',
  'api.openweathermap.org',
  'basemaps.cartocdn.com',
  'gatewayapi.cnpt.em.brapa.gov.br',
  'gateway.brapa.cnpt.embrapa.br',
  'servicodados.ibge.gov.br',
  'apitempo.inmet.gov.br',
  'earthquake.usgs.gov',
  'eonet.gsfc.nasa.gov',
  'nominatim.openstreetmap.org',
  'api.whatsapp.com',
  'wa.me',
  'wss:',
  'ws:',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'https://www.openstreetmap.org',
])

const sw = await read(swPath)
requireFragments(swPath, sw, [
  "if (url.hostname === 'tile.openstreetmap.org')",
  '`/api/geocode?lat=${qLat}&lon=${qLon}`',
])
forbidFragments(swPath, sw, [
  '`/api/ibge/municipios?lat=${qLat}&lon=${qLon}`',
  "url.hostname.includes('cptec.inpe.br')",
  "url.hostname.includes('satellite1.cptec')",
])

const swTest = await read(swTestPath)
requireFragments(swTestPath, swTest, [
  'PRECACHE_LOCATION warms eight useful location endpoints with real coordinates',
  'assert.equal(reply.total, 8)',
  'assert.equal(reply.succeeded, 8)',
  "assert.equal(await runtime.match('/api/ibge/municipios?lat=-25.42840&lon=-49.27330&raio=100&limit=15'), undefined)",
])
forbidFragments(swTestPath, swTest, [
  'assert.equal(reply.total, 9)',
  'assert.equal(reply.succeeded, 9)',
])

if (failures.length) {
  console.error('\nClient surface gate failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Client surface gate OK — browser CSP, location precache and external client origins are least-privilege')
