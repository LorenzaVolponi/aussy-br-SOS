import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const failures = []

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function requireFragments(path, content, fragments) {
  for (const fragment of fragments) {
    if (!content.includes(fragment)) failures.push(`${path} missing integrity contract: ${fragment}`)
  }
}

function forbidFragments(path, content, fragments) {
  for (const fragment of fragments) {
    if (content.includes(fragment)) failures.push(`${path} contains forbidden location/data fallback: ${fragment}`)
  }
}

const locationRoutes = [
  'src/app/api/cptec/forecast/route.ts',
  'src/app/api/ana/rios/route.ts',
  'src/app/api/earthquakes/route.ts',
  'src/app/api/queimadas/focos/route.ts',
  'src/app/api/satellites/passes/route.ts',
  'src/app/api/satellites/tle/route.ts',
  'src/app/api/inmet/stations/route.ts',
  'src/app/api/eonet/route.ts',
  'src/app/api/geocode/route.ts',
  'src/app/api/coverage/towers/route.ts',
]

const forbiddenDefaults = [
  "|| '-15.7801'",
  "|| '-47.9292'",
  '?? -15.7801',
  '?? -47.9292',
  '?? 0',
]

for (const path of locationRoutes) {
  const content = read(path)
  forbidFragments(path, content, forbiddenDefaults)
}

for (const path of [
  'src/app/api/cptec/forecast/route.ts',
  'src/app/api/ana/rios/route.ts',
  'src/app/api/earthquakes/route.ts',
  'src/app/api/queimadas/focos/route.ts',
]) {
  const content = read(path)
  requireFragments(path, content, [
    'parseCoordinate',
    'invalid-location',
    'Nenhuma cidade padrão é assumida',
  ])
}

const weatherPath = 'src/app/api/cptec/forecast/route.ts'
const weather = read(weatherPath)
requireFragments(weatherPath, weather, [
  'MET Norway Locationforecast 2.0',
  "'User-Agent': USER_AGENT",
  "lat.toFixed(4)",
  "lon.toFixed(4)",
  "dataQuality: 'live-model-forecast'",
  "dataQuality: 'unavailable'",
])
forbidFragments(weatherPath, weather, [
  "d.min || d.minima || '0'",
  "d.max || d.maxima || '0'",
  "d.umidade || '0'",
  "parseInt(d.chuva || '0'",
])

const weatherUiPath = 'src/components/aussy/weather-forecast.tsx'
const weatherUi = read(weatherUiPath)
requireFragments(weatherUiPath, weatherUi, [
  "res.headers.get('X-Aussy-Cached')",
  "res.headers.get('X-Aussy-Offline')",
  "{cached ? 'CACHE' : 'AO VIVO'}",
  "Fonte: {data.source",
])
forbidFragments(weatherUiPath, weatherUi, [
  'Previsão do Tempo — CPTEC/INPE',
  'CPTEC/INPE — previsão oficial brasileira',
  '>ESTIMADO<',
])

if (failures.length) {
  console.error('Location/weather integrity FAILED')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Location/weather integrity OK — no hidden city fallback, no synthetic weather zeros, cache provenance explicit')
