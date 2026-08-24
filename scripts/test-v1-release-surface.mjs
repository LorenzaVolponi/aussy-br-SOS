import { readFile } from 'node:fs/promises'
import process from 'node:process'

const failures = []

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

function requireFragments(path, content, fragments) {
  for (const fragment of fragments) {
    if (!content.includes(fragment)) failures.push(`${path} missing V1 invariant: ${fragment}`)
  }
}

function forbidFragments(path, content, fragments) {
  for (const fragment of fragments) {
    if (content.includes(fragment)) failures.push(`${path} contains forbidden V1 pattern: ${fragment}`)
  }
}

const pagePath = 'src/app/page.tsx'
const quickSharePath = 'src/components/aussy/quick-share.tsx'
const geoPath = 'src/hooks/use-geolocation.ts'
const coveragePath = 'src/app/api/coverage/towers/route.ts'

const page = await read(pagePath)
requireFragments(pagePath, page, [
  'AUSSY · S.O.S. BRASIL',
  'AUSSY <span className="text-red-500">ESTÁ</span> COM VOCÊ.',
  'S.O.S. IMEDIATO',
  'Aguardando localização válida',
  "<EmergencySOS observerLat={point?.lat} observerLon={point?.lon} />",
  '<QuickShare initialPoint={point} />',
  '<QrLocation open={qrLocOpen} onOpenChange={setQrLocOpen} initialPoint={point} />',
  'AIX8C - Uma tecnologia do grupo volponi.tech !',
  'Não substitui serviços oficiais de emergência',
])
forbidFragments(pagePath, page, [
  'point?.lat ?? 0',
  'point?.lon ?? 0',
  "point?.lat ?? -15.7801",
  "point?.lon ?? -47.9292",
  '98.7%',
  '4.897',
  '+2.4M',
  '100% offline',
])

const quickShare = await read(quickSharePath)
requireFragments(quickSharePath, quickShare, [
  'const nextPoint = await detect(true)',
  'if (!nextPoint)',
  "point.source === 'cached'",
  "'última posição conhecida'",
  'Esta é a última posição conhecida, não uma leitura GPS atual',
  "window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')",
])
forbidFragments(quickSharePath, quickShare, [
  "import { Share2, MessageCircle, Copy, X, MapPin, Phone",
  "point.source === 'ip' ? 'IP aprox.' : 'manual'",
  '100% funcional offline',
])

const geo = await read(geoPath)
requireFragments(geoPath, geo, [
  'function isValidCoordinate',
  "source: 'cached'",
  'A última posição conhecida ainda é preferível a um default arbitrário',
  "throw gpsError || new Error('Não foi possível determinar a localização')",
])
forbidFragments(geoPath, geo, [
  '-15.7801',
  '-47.9292',
])

const coverage = await read(coveragePath)
requireFragments(coveragePath, coverage, [
  "towers: 'unavailable'",
  'O Aussy não fabrica posições de ERB',
  "error: 'invalid-location'",
])
forbidFragments(coveragePath, coverage, [
  'Math.random()',
  'sim-erb-',
  "towers: 'synthetic'",
])

if (failures.length) {
  console.error('\nV1 release surface gate failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('V1 release surface OK — home, SOS location provenance, geolocation and coverage contracts are protected')
