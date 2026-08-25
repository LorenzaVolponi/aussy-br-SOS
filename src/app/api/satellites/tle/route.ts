import { NextResponse } from 'next/server'
import {
  degreesLat,
  degreesLong,
  degreesToRadians,
  ecfToLookAngles,
  eciToEcf,
  eciToGeodetic,
  gstime,
  json2satrec,
  propagate,
  radiansToDegrees,
  type OMMJsonObject,
} from 'satellite.js'

export const runtime = 'nodejs'

const CELESTRAK_CACHE_SECONDS = 2 * 60 * 60
const CELESTRAK_TIMEOUT_MS = 15000
const SOURCE_HOME = 'https://celestrak.org/NORAD/elements/'

const CELESTRAK_GROUPS: Record<string, string> = {
  starlink: 'STARLINK',
  iridium: 'IRIDIUM-NEXT',
  globalstar: 'GLOBALSTAR',
  oneweb: 'ONEWEB',
  swarm: 'SWARM',
  geo: 'GEO',
  weather: 'WEATHER',
  gnss: 'GPS-OPS',
}

interface CelesTrakOmm extends OMMJsonObject {
  OBJECT_NAME?: string
  OBJECT_ID?: string
  NORAD_CAT_ID?: number | string
  EPOCH?: string
}

interface ComputedSatellite {
  name: string
  noradId: string | null
  objectId: string | null
  position: { lat: number; lon: number; altitude: number; valid: true }
  visibility: { above: boolean; elevation: number; azimuth: number; rangeKm: number }
  tleEpoch: string | null
  tleAgeHours: number | null
}

function groupUrl(group: string) {
  const celestrakGroup = CELESTRAK_GROUPS[group]
  return celestrakGroup
    ? `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(celestrakGroup)}&FORMAT=JSON`
    : null
}

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function boundedLimit(value: string | null): number {
  const parsed = Number.parseInt(value || '50', 10)
  if (!Number.isFinite(parsed)) return 50
  return Math.min(Math.max(parsed, 1), 200)
}

function parsedEpoch(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value.endsWith('Z') ? value : `${value}Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function fetchCelesTrakOmm(url: string): Promise<CelesTrakOmm[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CELESTRAK_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AussyOntech/1.0 (+https://github.com/LorenzaVolponi/aussy-br-SOS)',
      },
      next: { revalidate: CELESTRAK_CACHE_SECONDS },
    })

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 240).replace(/\s+/g, ' ')
      throw new Error(`CelesTrak HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
    }

    const payload = await response.json()
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new Error('CelesTrak retornou conjunto OMM vazio')
    }
    return payload as CelesTrakOmm[]
  } finally {
    clearTimeout(timeout)
  }
}

function computeSatellite(
  omm: CelesTrakOmm,
  date: Date,
  observerLat: number,
  observerLon: number,
): ComputedSatellite | null {
  try {
    const satrec = json2satrec(omm)
    const state = propagate(satrec, date)
    if (!state?.position) return null

    const gmst = gstime(date)
    const positionEcf = eciToEcf(state.position, gmst)
    const positionGd = eciToGeodetic(state.position, gmst)
    const observerGeodetic = {
      latitude: degreesToRadians(observerLat),
      longitude: degreesToRadians(observerLon),
      height: 0,
    }
    const lookAngles = ecfToLookAngles(observerGeodetic, positionEcf)

    const lat = degreesLat(positionGd.latitude)
    const lon = degreesLong(positionGd.longitude)
    const altitude = Number(positionGd.height)
    const elevation = radiansToDegrees(lookAngles.elevation)
    const azimuth = radiansToDegrees(lookAngles.azimuth)
    const rangeKm = Number(lookAngles.rangeSat)

    if (![lat, lon, altitude, elevation, azimuth, rangeKm].every(Number.isFinite)) return null
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180 || altitude < -100) return null

    const epoch = parsedEpoch(omm.EPOCH)
    const name = String(omm.OBJECT_NAME || omm.OBJECT_ID || omm.NORAD_CAT_ID || 'Objeto orbital')

    return {
      name,
      noradId: omm.NORAD_CAT_ID == null ? null : String(omm.NORAD_CAT_ID),
      objectId: omm.OBJECT_ID ? String(omm.OBJECT_ID) : null,
      position: { lat, lon, altitude, valid: true },
      visibility: {
        above: elevation > 5,
        elevation,
        azimuth: ((azimuth % 360) + 360) % 360,
        rangeKm,
      },
      tleEpoch: epoch?.toISOString() || null,
      tleAgeHours: epoch ? Math.max(0, (date.getTime() - epoch.getTime()) / 3600000) : null,
    }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const group = searchParams.get('group') || 'starlink'
  const observerLat = parseCoordinate(searchParams.get('lat'), -90, 90)
  const observerLon = parseCoordinate(searchParams.get('lon'), -180, 180)
  const limit = boundedLimit(searchParams.get('limit'))
  const url = groupUrl(group)

  if (!url) {
    return NextResponse.json({
      error: 'invalid-group',
      dataQuality: 'unavailable',
      groups: Object.keys(CELESTRAK_GROUPS),
      satellites: [],
      total: 0,
      visible: 0,
    }, { status: 400 })
  }

  if (observerLat === null || observerLon === null) {
    return NextResponse.json({
      group,
      observer: null,
      timestamp: new Date().toISOString(),
      source: 'CelesTrak / NORAD GP data',
      sourceUrl: SOURCE_HOME,
      dataQuality: 'observer-required',
      total: 0,
      visible: 0,
      satellites: [],
      cached: false,
      fallback: false,
      error: 'observer-required',
      note: 'Latitude e longitude válidas são obrigatórias. Nenhuma cidade padrão é assumida.',
    }, { status: 400 })
  }

  try {
    const ommRecords = await fetchCelesTrakOmm(url)
    const now = new Date()
    const computed = ommRecords
      .map((record) => computeSatellite(record, now, observerLat, observerLon))
      .filter((satellite): satellite is ComputedSatellite => satellite !== null)
      .sort((a, b) => Number(b.visibility.above) - Number(a.visibility.above) || b.visibility.elevation - a.visibility.elevation)

    if (!computed.length) throw new Error('Nenhum OMM pôde ser propagado por SGP4')

    return NextResponse.json({
      group,
      celestrakGroup: CELESTRAK_GROUPS[group],
      observer: { lat: observerLat, lon: observerLon },
      timestamp: now.toISOString(),
      source: 'CelesTrak / NORAD GP OMM',
      sourceUrl: url,
      dataQuality: 'live-tle-approx-position',
      orbitalDataFormat: 'OMM JSON',
      propagation: 'SGP4/SDP4 via satellite.js',
      upstreamRefreshSeconds: CELESTRAK_CACHE_SECONDS,
      total: computed.length,
      visible: computed.filter((satellite) => satellite.visibility.above).length,
      satellites: computed.slice(0, limit),
      cached: false,
      fallback: false,
      warning: 'Posições e ângulos são calculados por SGP4/SDP4 a partir dos elementos orbitais CelesTrak. Ainda não substituem fonte operacional certificada para navegação, segurança de voo ou apontamento crítico.',
    }, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({
      group,
      observer: { lat: observerLat, lon: observerLon },
      timestamp: new Date().toISOString(),
      source: 'CelesTrak indisponível',
      sourceUrl: SOURCE_HOME,
      dataQuality: 'unavailable',
      total: 0,
      visible: 0,
      satellites: [],
      cached: false,
      fallback: false,
      error: 'unavailable',
      note: 'Não foi possível obter elementos orbitais CelesTrak nesta consulta. Nenhuma posição sintética é criada; o Service Worker pode servir a última resposta válida já armazenada no dispositivo.',
    }, { status: 503 })
  }
}
