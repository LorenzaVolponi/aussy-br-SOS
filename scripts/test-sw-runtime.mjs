import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'

const ORIGIN = 'https://aussy.test'
const swSource = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
const normalize = (input) => {
  if (typeof input === 'string') return new URL(input, ORIGIN).href
  if (input?.url) return new URL(input.url, ORIGIN).href
  throw new Error('unsupported request key')
}

class MockCache {
  constructor() { this.map = new Map() }
  async put(request, response) { this.map.set(normalize(request), response.clone()) }
  async match(request) { const hit = this.map.get(normalize(request)); return hit?.clone() }
  async keys() { return [...this.map.keys()].map((url) => new Request(url)) }
}

class MockCaches {
  constructor() { this.map = new Map() }
  async open(name) { if (!this.map.has(name)) this.map.set(name, new MockCache()); return this.map.get(name) }
  async match(request) {
    for (const cache of this.map.values()) {
      const hit = await cache.match(request)
      if (hit) return hit
    }
  }
  async keys() { return [...this.map.keys()] }
  async delete(name) { return this.map.delete(name) }
}

const listeners = new Map()
const caches = new MockCaches()
const customFetch = new Map()
let online = true
let skipWaitingCount = 0
let claimCount = 0

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

async function mockFetch(input) {
  if (!online) throw new TypeError('network offline')
  const href = normalize(input)
  const url = new URL(href)
  const custom = customFetch.get(href) || customFetch.get(url.pathname + url.search) || customFetch.get(url.pathname)
  if (custom) return typeof custom === 'function' ? custom(url) : custom.clone()

  if (url.pathname === '/') {
    return new Response(
      '<!doctype html><script src="/_next/static/chunks/app.js"></script><link href="/_next/static/css/app.css" rel="stylesheet">',
      { headers: { 'Content-Type': 'text/html' } },
    )
  }
  if (url.pathname.startsWith('/_next/static/')) return new Response(`asset:${url.pathname}`)
  if (url.pathname.startsWith('/api/')) return json({ online: true, source: 'mock-live', value: url.pathname })
  return new Response(`asset:${url.pathname}`)
}

const self = {
  location: { origin: ORIGIN },
  addEventListener(type, callback) {
    if (!listeners.has(type)) listeners.set(type, [])
    listeners.get(type).push(callback)
  },
  skipWaiting: async () => { skipWaitingCount += 1 },
  clients: { claim: async () => { claimCount += 1 } },
}

const context = vm.createContext({
  self,
  caches,
  fetch: mockFetch,
  console,
  URL,
  Request,
  Response,
  Headers,
  Set,
  Map,
  Date,
  Number,
  Object,
  Promise,
})
vm.runInContext(swSource, context, { filename: 'public/sw.js' })

async function dispatchWait(type, extra = {}) {
  const waits = []
  const event = { ...extra, waitUntil(promise) { waits.push(Promise.resolve(promise)) } }
  for (const callback of listeners.get(type) || []) callback(event)
  await Promise.all(waits)
}

async function dispatchFetch(url, init = {}) {
  let responsePromise
  const request = new Request(new URL(url, ORIGIN), init)
  const event = { request, respondWith(promise) { responsePromise = Promise.resolve(promise) } }
  for (const callback of listeners.get('fetch') || []) callback(event)
  return responsePromise
}

async function dispatchMessage(data) {
  const waits = []
  let reply
  const event = {
    data,
    ports: [{ postMessage(payload) { reply = payload } }],
    waitUntil(promise) { waits.push(Promise.resolve(promise)) },
  }
  for (const callback of listeners.get('message') || []) callback(event)
  await Promise.all(waits)
  return reply
}

const tests = []
async function test(name, fn) {
  try {
    await fn()
    tests.push({ name, ok: true })
    console.log('PASS', name)
  } catch (error) {
    tests.push({ name, ok: false })
    console.error('FAIL', name, error)
  }
}

await test('install precaches shell, Next chunks and emergency contacts', async () => {
  await dispatchWait('install')
  assert.equal(skipWaitingCount, 1)
  const staticCache = await caches.open('aussy-v8-static')
  assert.ok(await staticCache.match('/'))
  assert.ok(await staticCache.match('/_next/static/chunks/app.js'))
  assert.ok(await staticCache.match('/_next/static/css/app.css'))
  assert.ok(await (await caches.open('aussy-v8-emergency')).match('/api/emergency/contacts'))
})

await test('activate removes legacy caches and preserves stable OSM tiles', async () => {
  await (await caches.open('aussy-v7-static')).put('/old', new Response('old'))
  await (await caches.open('aussy-v2-osm-tiles')).put('https://tile.openstreetmap.org/1/2/3.png', new Response('tile-old'))
  await dispatchWait('activate')
  assert.equal(claimCount, 1)
  const keys = await caches.keys()
  assert.ok(!keys.includes('aussy-v7-static'))
  assert.ok(keys.includes('aussy-v2-osm-tiles'))
})

await test('cold boot navigation returns cached app shell', async () => {
  online = false
  const response = await dispatchFetch('/', { headers: { accept: 'text/html' } })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('X-Aussy-Offline'), 'true')
  assert.match(await response.text(), /_next\/static\/chunks\/app\.js/)
  online = true
})

await test('last-known-good survives degraded upstream', async () => {
  const url = '/api/cptec/forecast?lat=-25.4&lon=-49.2'
  customFetch.set(url, json({ online: true, dataQuality: 'live', days: [{ max: 25 }] }))
  let response = await dispatchFetch(url)
  assert.equal((await response.json()).days[0].max, 25)

  customFetch.set(url, json({ online: false, dataQuality: 'unavailable', days: [] }))
  response = await dispatchFetch(url)
  assert.equal((await response.json()).days[0].max, 25)
  assert.equal(response.headers.get('X-Aussy-Cached'), 'true')
  assert.equal(response.headers.get('X-Aussy-Upstream-Degraded'), 'true')
})

await test('offline forecast without cache returns shape-safe fallback', async () => {
  const url = '/api/cptec/forecast?lat=-22.1&lon=-43.1'
  customFetch.delete(url)
  online = false
  const response = await dispatchFetch(url)
  const body = await response.json()
  assert.equal(response.status, 503)
  assert.equal(Array.isArray(body.days), true)
  assert.equal(body.days.length, 0)
  assert.equal(body.dataQuality, 'unavailable')
  assert.equal(body.offline, true)
  online = true
})

await test('offline emergency fallback retains national numbers', async () => {
  online = false
  const response = await dispatchFetch('/api/emergency/unknown')
  const body = await response.json()
  assert.equal(response.status, 503)
  assert.equal(body.emergencyNumbers.map((item) => item.number).join(','), '192,190,193,199')
  online = true
})

await test('OSM tile is cached online and reused offline', async () => {
  const tileUrl = 'https://tile.openstreetmap.org/4/5/6.png'
  customFetch.set(tileUrl, new Response('tile-456', { headers: { 'Content-Type': 'image/png' } }))
  let response = await dispatchFetch(tileUrl)
  assert.equal(await response.text(), 'tile-456')
  online = false
  response = await dispatchFetch(tileUrl)
  assert.equal(await response.text(), 'tile-456')
  online = true
})

await test('PRECACHE_LOCATION rejects invalid coordinates', async () => {
  const reply = await dispatchMessage({ type: 'PRECACHE_LOCATION', lat: 999, lon: -49 })
  assert.equal(reply.ok, false)
  assert.equal(Array.from(reply.failed).join(','), 'invalid-location')
})

await test('PRECACHE_LOCATION warms all location endpoints with real coordinates', async () => {
  const reply = await dispatchMessage({ type: 'PRECACHE_LOCATION', lat: -25.4284, lon: -49.2733 })
  assert.equal(reply.ok, true)
  assert.equal(reply.total, 9)
  assert.equal(reply.succeeded, 9)
  const runtime = await caches.open('aussy-v8-runtime')
  assert.ok(await runtime.match('/api/cptec/forecast?lat=-25.42840&lon=-49.27330'))
  assert.ok(await runtime.match('/api/geocode?lat=-25.42840&lon=-49.27330'))
})

await test('CLEAR_CACHE explicitly clears all Aussy caches', async () => {
  const reply = await dispatchMessage({ type: 'CLEAR_CACHE' })
  assert.equal(reply.ok, true)
  assert.equal((await caches.keys()).filter((key) => key.startsWith('aussy-')).length, 0)
})

const failed = tests.filter((item) => !item.ok)
console.log(`\n${tests.length - failed.length}/${tests.length} behavioral Service Worker tests passed`)
if (failed.length) process.exit(1)
