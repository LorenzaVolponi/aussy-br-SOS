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

const eonetRoutePath = 'src/app/api/eonet/route.ts'
const eonetUiPath = 'src/components/aussy/eonet-card.tsx'
const geocodePath = 'src/app/api/geocode/route.ts'
const ibgePath = 'src/app/api/ibge/municipios/route.ts'
const healthPath = 'src/app/api/route.ts'

const eonetRoute = await read(eonetRoutePath)
requireFragments(eonetRoutePath, eonetRoute, [
  "const EONET_EVENTS_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events'",
  "error: 'invalid-location'",
  "upstream.searchParams.set('days', String(days))",
  "['open', 'closed', 'all'].includes(requestedStatus)",
  'closed: Boolean(closedAt)',
  "dataQuality: 'live-eonet'",
  "dataQuality: 'unavailable'",
  "error: 'upstream-unavailable'",
  '{ status: 503 }',
  'não é, por si só, um sensor ou feed de satélite em tempo real',
])
forbidFragments(eonetRoutePath, eonetRoute, [
  "searchParams.get('lat') || '-15.7801'",
  "searchParams.get('lon') || '-47.9292'",
  'e.closed !== undefined',
  "source: 'fallback (offline ou API indisponível)'",
  '{ status: 200 }\n    )\n  } catch',
])

const eonetUi = await read(eonetUiPath)
requireFragments(eonetUiPath, eonetUi, [
  "res.headers.get('X-Aussy-Cached')",
  "res.headers.get('X-Aussy-Offline')",
  'Última resposta válida preservada pelo Service Worker',
  'Isso não equivale a afirmar ausência de qualquer risco natural na região',
  'não é um sensor nem garantia de risco local em tempo real',
  'DataProvenance',
])
forbidFragments(eonetUiPath, eonetUi, [
  'dados do satélite Earth Observatory da NASA',
  'Boas notícias!',
  'rastreia eventos naturais ativos globalmente\n          usando satélites',
])

const geocode = await read(geocodePath)
requireFragments(geocodePath, geocode, [
  "error: 'invalid-location'",
  "const upstream = new URL(NOMINATIM_REVERSE)",
  "upstream.searchParams.set('lat', lat.toFixed(6))",
  "upstream.searchParams.set('lon', lon.toFixed(6))",
  "'User-Agent': 'AussyOntech/1.0'",
  "dataQuality: 'live-geocode'",
  "dataQuality: 'unavailable'",
  "error: 'upstream-unavailable'",
  '{ status: 503 }',
])
forbidFragments(geocodePath, geocode, [
  'const lat = searchParams.get',
  'const lon = searchParams.get',
  'const url = `https://nominatim.openstreetmap.org/reverse?',
  "source: 'fallback'",
  '{ status: 200 }\n    )\n  } catch',
])

const ibge = await read(ibgePath)
requireFragments(ibgePath, ibge, [
  "dataQuality: 'reference-only'",
  'proximityAvailable: false',
  'deprecatedBehaviorRemoved: true',
  'não documenta `view=geo`, centroide ou latitude/longitude',
  'Nenhum município próximo é inferido ou fabricado',
])
forbidFragments(ibgePath, ibge, [
  'municipios?view=geo',
  'm?.municipio?.centroide?.coordinates',
  "url.searchParams.get('lat') || '-15.7801'",
  "url.searchParams.get('lon') || '-47.9292'",
])

const health = await read(healthPath)
requireFragments(healthPath, health, [
  "status: 'app-api-reachable'",
  'externalProvidersChecked: false',
  "offlineModel: 'service-worker-last-known-good'",
  "'Cache-Control': 'no-store, max-age=0'",
  'Não valida provedores externos',
])
forbidFragments(healthPath, health, ['Hello, world!'])

if (failures.length) {
  console.error('\nAPI trust gate failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('API trust gate OK — EONET, geocode, IBGE reference semantics and app health are protected')
