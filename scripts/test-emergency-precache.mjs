import { readFile } from 'node:fs/promises'
import process from 'node:process'

const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
const failures = []

const match = sw.match(/const EMERGENCY_PRECACHE = \[([\s\S]*?)\];/)
if (!match) {
  failures.push('public/sw.js does not expose EMERGENCY_PRECACHE')
} else {
  const block = match[1]
  for (const required of [
    '/api/emergency/contacts',
    '/api/emergency/first-aid',
    '/api/inmet/alerts',
    '/api/cemaden/alerts',
    '/api/cptec/satellite',
    '/api/defesacivil/alertas',
  ]) {
    if (!block.includes(required)) failures.push(`EMERGENCY_PRECACHE missing required resource: ${required}`)
  }

  for (const forbidden of [
    '/api/satellites/tle?',
    'group=starlink',
    'group=iridium',
    'group=weather',
    'group=gnss',
  ]) {
    if (block.includes(forbidden)) failures.push(`EMERGENCY_PRECACHE contains observer-dependent orbital request: ${forbidden}`)
  }
}

if (!sw.includes("url.pathname.startsWith('/api/satellites')")) {
  failures.push('satellite requests must still use the dedicated SATELLITE_CACHE when explicitly requested')
}

if (!sw.includes('networkFirst(request, SATELLITE_CACHE')) {
  failures.push('satellite requests must remain last-known-good cached when opened with valid observer context')
}

if (failures.length) {
  console.error('\nEmergency precache gate failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Emergency precache gate OK — observer-dependent orbital requests are not warmed as emergency content')
