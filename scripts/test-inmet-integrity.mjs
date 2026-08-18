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

const stationsRoutePath = 'src/app/api/inmet/stations/route.ts'
const stationsUiPath = 'src/components/aussy/inmet-stations.tsx'
const alertsRoutePath = 'src/app/api/inmet/alerts/route.ts'
const alertsUiPath = 'src/components/aussy/inmet-alerts.tsx'

const stationsRoute = await read(stationsRoutePath)
requireFragments(stationsRoutePath, stationsRoute, [
  "error: 'invalid-location'",
  'Nenhuma cidade padrão é assumida',
  "dataQuality: 'unavailable'",
  "dataQuality: observationsLive ? 'live-observations' : 'live-catalog'",
  "status === 'operante' || status === 'operativa'",
  "normalized.toLowerCase() === 'null'",
  'parsed === 9999',
  'observationsLive = Object.keys(leituras).length > 0',
  'chuva_24h: null',
  'Vento e rajada em m/s',
  'Chuva em 24h não é inferida a partir de 1h',
])
forbidFragments(stationsRoutePath, stationsRoute, [
  'ESTACOES_FALLBACK',
  "url.searchParams.get('lat') || '-15.7801'",
  "url.searchParams.get('lon') || '-47.9292'",
  "status.includes('operat')",
  'observationsLive = true',
  'chuva_24h: l.chuva_1h',
  "fonte: online ? 'INMET (tempo real)'",
])

const stationsUi = await read(stationsUiPath)
requireFragments(stationsUiPath, stationsUi, [
  "res.headers.get('X-Aussy-Cached')",
  "res.headers.get('X-Aussy-Offline')",
  "? 'CACHE'",
  "? 'LIVE'",
  "? 'CATÁLOGO'",
  '>M/S<',
  '>MM · 1H<',
  '24h não é inferido',
  'DataProvenance',
])
forbidFragments(stationsUiPath, stationsUi, [
  "text-muted-foreground text-[8px]'>KM/H<",
  'estações automáticas em tempo real · fallback offline',
])

const alertsRoute = await read(alertsRoutePath)
requireFragments(alertsRoutePath, alertsRoute, [
  "dataQuality: 'live-alerts'",
  "dataQuality: 'unavailable'",
  "error: 'upstream-unavailable'",
  '{ status: 503 }',
  'Nenhum estado "sem alertas" é inferido quando a fonte falha',
])
forbidFragments(alertsRoutePath, alertsRoute, [
  '{ status: 200 } // 200 mesmo offline',
  "error: 'offline'",
])

const alertsUi = await read(alertsUiPath)
requireFragments(alertsUiPath, alertsUi, [
  "res.headers.get('X-Aussy-Cached')",
  "res.headers.get('X-Aussy-Offline')",
  'Última resposta válida preservada pelo Service Worker',
  'Esta não é uma consulta ao vivo',
  'O Aussy não interpreta falha da fonte como ausência de alertas',
  'DataProvenance',
])
forbidFragments(alertsUiPath, alertsUi, [
  "if (!res.ok) throw new Error('Falha')",
  '<strong>Offline.</strong>',
])

if (failures.length) {
  console.error('\nINMET integrity gate failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('INMET integrity gate OK — live catalog states, null sentinels, provenance, cache semantics and units are protected')
