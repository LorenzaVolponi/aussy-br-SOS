import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const swPath = new URL('../public/sw.js', import.meta.url)
const source = await readFile(swPath, 'utf8')

function sliceBetween(start, end) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from)
  assert.notEqual(from, -1, `missing start marker: ${start}`)
  assert.notEqual(to, -1, `missing end marker: ${end}`)
  return source.slice(from, to)
}

const executable = [
  sliceBetween('function jsonResponse', 'function fallbackCoordinate'),
  sliceBetween('function fallbackCoordinate', 'function offlineApiResponse'),
  sliceBetween('function offlineApiResponse', 'async function cacheFirst'),
].join('\n')

const context = vm.createContext({
  URL,
  Response,
  Headers,
  Date,
  console,
})
vm.runInContext(`${executable}\nglobalThis.offlineApiResponse = offlineApiResponse;\nglobalThis.fallbackCoordinate = fallbackCoordinate;`, context)

const offlineApiResponse = context.offlineApiResponse
const fallbackCoordinate = context.fallbackCoordinate

async function payload(path) {
  const response = offlineApiResponse(new URL(path, 'https://aussy.local'))
  return { response, body: await response.json() }
}

// Missing coordinates must remain missing — never silently become 0,0.
assert.equal(fallbackCoordinate(new URL('https://aussy.local/api/geocode'), 'lat', -90, 90), null)
assert.equal(fallbackCoordinate(new URL('https://aussy.local/api/geocode?lat='), 'lat', -90, 90), null)
assert.equal(fallbackCoordinate(new URL('https://aussy.local/api/geocode?lat=91'), 'lat', -90, 90), null)
assert.equal(fallbackCoordinate(new URL('https://aussy.local/api/geocode?lat=-25.43'), 'lat', -90, 90), -25.43)

{
  const { response, body } = await payload('/api/geocode')
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('X-Aussy-Offline'), 'true')
  assert.equal(body.dataQuality, 'unavailable')
  assert.equal(body.lat, null)
  assert.equal(body.lon, null)
  assert.equal(body.city, null)
  assert.equal(body.source, 'OpenStreetMap Nominatim')
}

{
  const { body } = await payload('/api/geocode?lat=-25.4284&lon=-49.2733')
  assert.equal(body.lat, -25.4284)
  assert.equal(body.lon, -49.2733)
  assert.equal(body.dataQuality, 'unavailable')
}

{
  const { body } = await payload('/api/eonet?raio=2000&dias=30')
  assert.equal(body.center, null)
  assert.equal(body.dataQuality, 'unavailable')
  assert.equal(body.total, 0)
  assert.deepEqual(body.events, [])
  assert.equal(body.source, 'NASA EONET v3')
}

{
  const { body } = await payload('/api/eonet?lat=-25.4284&lon=-49.2733&raio=2000&dias=30')
  assert.equal(body.center.lat, -25.4284)
  assert.equal(body.center.lon, -49.2733)
  assert.equal(body.center.radiusKm, 2000)
}

{
  const { body } = await payload('/api/inmet/stations?lat=-25.4284&lon=-49.2733')
  assert.equal(body.online, false)
  assert.equal(body.catalogLive, false)
  assert.equal(body.observationsLive, false)
  assert.equal(body.dataQuality, 'unavailable')
  assert.equal(body.total_estacoes, 0)
  assert.deepEqual(body.proximas, [])
  assert.ok(body.fetchedAt)
  assert.equal('atualizado_em' in body, false)
}

{
  const { body } = await payload('/api/inmet/alerts')
  assert.equal(body.online, false)
  assert.equal(body.dataQuality, 'unavailable')
  assert.equal(body.total, 0)
  assert.deepEqual(body.alerts, [])
  assert.equal(body.source, 'INMET')
  assert.match(body.note, /Nenhum estado/)
}

{
  const { body } = await payload('/api/ibge/municipios?lat=-25.4284&lon=-49.2733')
  assert.equal(body.dataQuality, 'reference-only')
  assert.equal(body.proximityAvailable, false)
  assert.equal(body.deprecatedBehaviorRemoved, true)
  assert.equal(body.requestedLocation.lat, -25.4284)
  assert.equal(body.requestedLocation.lon, -49.2733)
  assert.deepEqual(body.municipios, [])
}

{
  const { body } = await payload('/api/coverage/towers')
  assert.equal(body.observer, null)
  assert.equal(body.dataQuality.towers, 'unavailable')
  assert.equal(body.dataQuality.wifiPoints, 'unavailable')
}

for (const forbidden of [
  "Number(url.searchParams.get('lat') || 0)",
  "Number(url.searchParams.get('lon') || 0)",
  "fonte: 'offline — sem cache', total_estacoes: 0, proximas: [], atualizado_em:",
  "if (path.startsWith('/api/eonet')) return jsonResponse({ events: [], total: 0",
  "if (path.startsWith('/api/geocode')) return jsonResponse({ city: null, region: null, country: null",
]) {
  assert.equal(source.includes(forbidden), false, `legacy offline fallback returned: ${forbidden}`)
}

for (const required of [
  "dataQuality: 'unavailable'",
  "dataQuality: 'reference-only'",
  "source: 'NASA EONET v3'",
  "source: 'OpenStreetMap Nominatim'",
  "source: 'CelesTrak indisponível — offline sem cache'",
  'Nenhuma posição orbital é inferida ou fabricada',
]) {
  assert.equal(source.includes(required), true, `missing fallback invariant: ${required}`)
}

console.log('Offline fallback contracts OK — unavailable/reference states and missing coordinates are explicit')
