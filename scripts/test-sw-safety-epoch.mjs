import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
const warmer = await readFile(new URL('../src/components/aussy/offline-chunk-warmer.tsx', import.meta.url), 'utf8')
const docs = await readFile(new URL('../docs/OFFLINE_TEST.md', import.meta.url), 'utf8')

for (const required of [
  "const CACHE_VERSION = 'aussy-v9'",
  "const OSM_TILES_CACHE = 'aussy-v2-osm-tiles'",
  "const OSM_TILE_META_CACHE = 'aussy-osm-tile-meta-v1'",
  "const emergencyContacts = await emergencyCache.match('/api/emergency/contacts')",
  "const firstAid = await emergencyCache.match('/api/emergency/first-aid')",
  'Boolean(emergencyContacts) && Boolean(firstAid)',
  "console.log('[SW] Install v9'",
  "console.warn('[SW] v9 parcial; caches anteriores preservados'",
]) {
  assert.equal(sw.includes(required), true, `SW v9 safety invariant missing: ${required}`)
}

assert.equal(warmer.includes("const WARM_VERSION = 'aussy-offline-modules-v9'"), true, 'lazy offline modules must rewarm under v9')
assert.equal(docs.includes('**SW v9**'), true, 'offline acceptance docs must describe SW v9')
assert.equal(docs.includes('aussy-offline-modules-v9'), true, 'offline acceptance docs must cover v9 lazy-module warmer')

for (const [label, content, forbidden] of [
  ['public/sw.js', sw, "const CACHE_VERSION = 'aussy-v8'"],
  ['offline chunk warmer', warmer, "const WARM_VERSION = 'aussy-offline-modules-v8'"],
  ['offline docs', docs, 'SW v8 e app shell'],
]) {
  assert.equal(content.includes(forbidden), false, `${label} still references stale safety epoch: ${forbidden}`)
}

console.log('Service Worker safety epoch gate OK — v9 is coherent across caches, lazy warmer and offline acceptance docs')
