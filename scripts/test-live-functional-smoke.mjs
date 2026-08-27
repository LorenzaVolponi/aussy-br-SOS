const BASE_URL = process.env.AUSSY_BASE_URL || 'http://127.0.0.1:3000'
const LAT = '-25.4284'
const LON = '-49.2733'
const LIVE_RETRIES = 2
const failures = []

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function request(path, timeoutMs = 12000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    let body = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    return { response, body }
  } finally {
    clearTimeout(timeout)
  }
}

async function check(name, path, validate, timeoutMs, retries = 0) {
  let lastProblem = 'unknown failure'

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await request(path, timeoutMs)
      const problem = validate(result)

      if (!problem) {
        console.log(`OK   ${name} (${result.response.status})`)
        return
      }

      lastProblem = problem
      const retryable = result.response.status === 429 || result.response.status >= 500
      if (!retryable || attempt >= retries) break

      const waitMs = 1500 * (attempt + 1)
      console.warn(`RETRY ${name}: ${problem}; waiting ${waitMs}ms (${attempt + 1}/${retries})`)
      await sleep(waitMs)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      lastProblem = `request error: ${message}`
      if (attempt >= retries) break

      const waitMs = 1500 * (attempt + 1)
      console.warn(`RETRY ${name}: ${lastProblem}; waiting ${waitMs}ms (${attempt + 1}/${retries})`)
      await sleep(waitMs)
    }
  }

  failures.push(`${name}: ${lastProblem}`)
  console.error(`FAIL ${name}: ${lastProblem}`)
}

await check('health', '/api/health', ({ response, body }) => {
  if (response.status !== 200) return `HTTP ${response.status}`
  if (!body || typeof body !== 'object') return 'invalid JSON body'
  return null
})

for (const [name, path] of [
  ['weather invalid location', '/api/cptec/forecast'],
  ['INMET invalid location', '/api/inmet/stations'],
  ['USGS invalid location', '/api/earthquakes'],
  ['EONET invalid location', '/api/eonet'],
  ['fires invalid location', '/api/queimadas/focos'],
  ['ANA invalid location', '/api/ana/rios'],
]) {
  await check(name, path, ({ response, body }) => {
    if (response.status !== 400) return `expected HTTP 400, got ${response.status}`
    if (body?.error !== 'invalid-location') return `expected invalid-location, got ${String(body?.error)}`
    const serialized = JSON.stringify(body)
    if (serialized.includes('-15.7801') || serialized.includes('-47.9292')) return 'default Brasília coordinates leaked into response'
    return null
  })
}

await check('weather live', `/api/cptec/forecast?lat=${LAT}&lon=${LON}`, ({ response, body }) => {
  if (response.status !== 200) return `HTTP ${response.status}: ${body?.error || body?.note || 'unknown error'}`
  if (body?.dataQuality !== 'live-model-forecast') return `unexpected dataQuality ${String(body?.dataQuality)}`
  if (!String(body?.source || '').includes('MET Norway')) return `unexpected source ${String(body?.source)}`
  if (!Array.isArray(body?.days) || body.days.length < 1) return 'forecast has no periods'
  const hasMeasuredTemperature = body.days.some((day) => Number.isFinite(day?.min) || Number.isFinite(day?.max))
  if (!hasMeasuredTemperature) return 'forecast has no numeric temperature range'
  if (body?.center?.lat !== Number(LAT) || body?.center?.lon !== Number(LON)) return 'response center does not match requested coordinates'
  return null
}, 15000, LIVE_RETRIES)

await check('reverse geocode live', `/api/geocode?lat=${LAT}&lon=${LON}`, ({ response, body }) => {
  if (response.status !== 200) return `HTTP ${response.status}: ${body?.error || body?.note || 'unknown error'}`
  if (!body?.city && !body?.displayName) return 'no place label returned'
  return null
}, 15000, LIVE_RETRIES)

await check('INMET stations live', `/api/inmet/stations?lat=${LAT}&lon=${LON}&raio=500`, ({ response, body }) => {
  if (response.status !== 200) return `HTTP ${response.status}: ${body?.error || body?.note || 'unknown error'}`
  if (body?.catalogLive !== true) return 'official station catalog was not confirmed live'
  if (!Array.isArray(body?.proximas)) return 'proximas is not an array'
  if (!['live-observations', 'live-catalog'].includes(body?.dataQuality)) return `unexpected dataQuality ${String(body?.dataQuality)}`
  return null
}, 18000, LIVE_RETRIES)

await check('USGS earthquakes live', `/api/earthquakes?lat=${LAT}&lon=${LON}&raio=20000&mag=4&dias=7`, ({ response, body }) => {
  if (response.status !== 200) return `HTTP ${response.status}: ${body?.error || body?.note || 'unknown error'}`
  if (body?.dataQuality !== 'live') return `unexpected dataQuality ${String(body?.dataQuality)}`
  if (!Array.isArray(body?.events)) return 'events is not an array'
  return null
}, 15000, LIVE_RETRIES)

await check('NASA EONET live', `/api/eonet?lat=${LAT}&lon=${LON}&raio=10000&dias=30&status=all`, ({ response, body }) => {
  if (response.status !== 200) return `HTTP ${response.status}: ${body?.error || body?.note || 'unknown error'}`
  if (body?.dataQuality !== 'live-eonet') return `unexpected dataQuality ${String(body?.dataQuality)}`
  if (!Array.isArray(body?.events)) return 'events is not an array'
  return null
}, 15000, LIVE_RETRIES)

await check('INPE fire hotspots live', `/api/queimadas/focos?lat=${LAT}&lon=${LON}&raio=500`, ({ response, body }) => {
  if (response.status !== 200) return `HTTP ${response.status}: ${body?.error || body?.message || 'unknown error'}`
  if (body?.dataQuality !== 'live-open-data') return `unexpected dataQuality ${String(body?.dataQuality)}`
  if (!Array.isArray(body?.focos)) return 'focos is not an array'
  if (!Number.isInteger(body?.filesUsed) || body.filesUsed < 1) return 'no official recent CSV file was consumed'
  return null
}, 20000, LIVE_RETRIES)

await check('CelesTrak TLE live or explicit unavailable', `/api/satellites/tle?lat=${LAT}&lon=${LON}&group=weather&limit=10`, ({ response, body }) => {
  if (body?.observer?.lat !== Number(LAT) || body?.observer?.lon !== Number(LON)) {
    return 'observer does not match requested coordinates'
  }

  if (response.status === 200) {
    if (body?.dataQuality !== 'live-tle-approx-position') return `unexpected live dataQuality ${String(body?.dataQuality)}`
    if (!Array.isArray(body?.satellites) || body.satellites.length < 1) return 'no TLE-backed satellite returned'
    if (body?.fallback !== false) return 'live orbital response must not claim fallback data'
    return null
  }

  if (response.status === 503) {
    if (body?.dataQuality !== 'unavailable') return `unexpected unavailable dataQuality ${String(body?.dataQuality)}`
    if (body?.error !== 'unavailable') return `unexpected unavailable error ${String(body?.error)}`
    if (!Array.isArray(body?.satellites) || body.satellites.length !== 0) return 'unavailable response exposed satellite positions'
    if (body?.total !== 0 || body?.visible !== 0) return 'unavailable response exposed non-zero orbital counts'
    if (body?.fallback !== false || body?.cached !== false) return 'unavailable response incorrectly claims fallback or cache'
    if (!String(body?.note || '').includes('Nenhuma posição sintética é criada')) return 'unavailable response omits synthetic-position safety guarantee'
    return null
  }

  return `HTTP ${response.status}: ${body?.error || body?.note || 'unknown error'}`
}, 15000, LIVE_RETRIES)

await check('network status no server-location leak', '/api/network/status', ({ response, body }) => {
  if (response.status !== 200) return `HTTP ${response.status}`
  if (!['network-only', 'client-network-estimate'].includes(body?.dataQuality)) return `unexpected dataQuality ${String(body?.dataQuality)}`
  if (body?.geoSource === null && body?.geo !== null) return 'geo returned without a client geo source'
  return null
}, 12000)

await check('CPTEC satellite portal honesty', '/api/cptec/satellite', ({ response, body }) => {
  if (response.status !== 200) return `HTTP ${response.status}`
  if (body?.online !== false || body?.automationAvailable !== false) return 'portal reference incorrectly labelled as live automated feed'
  if (body?.dataQuality !== 'official-portal') return `unexpected dataQuality ${String(body?.dataQuality)}`
  if (!Array.isArray(body?.imagens) || body.imagens.length !== 0) return 'unverified image URLs exposed'
  return null
})

if (failures.length) {
  console.error('\nAussy live functional smoke FAILED')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('\nAussy live functional smoke OK — core live-data routes responded with explicit provenance, honest degradation and no default city')
