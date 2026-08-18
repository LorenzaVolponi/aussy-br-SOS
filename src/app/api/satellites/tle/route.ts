// CelesTrak GP/TLE — dados orbitais reais. Sem fonte: cache real ou indisponível.

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 3600

interface TleSatellite {
  name: string
  line1: string
  line2: string
}

const CELESTRAK_GROUPS: Record<string, string> = {
  starlink: 'starlink',
  iridium: 'iridium-NEXT',
  globalstar: 'globalstar',
  oneweb: 'oneweb',
  swarm: 'swarm',
  geo: 'geo',
  weather: 'weather',
  gnss: 'gps-ops',
}

function groupUrl(group: string) {
  const celestrakGroup = CELESTRAK_GROUPS[group]
  return celestrakGroup
    ? `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(celestrakGroup)}&FORMAT=TLE`
    : null
}

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function parseTle(text: string): TleSatellite[] {
  const lines = text.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const sats: TleSatellite[] = []
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i]
    const line1 = lines[i + 1]
    const line2 = lines[i + 2]
    if (line1.startsWith('1 ') && line2.startsWith('2 ')) sats.push({ name, line1, line2 })
  }
  return sats
}

function tleEpoch(line1: string): Date | null {
  const shortYear = Number.parseInt(line1.substring(18, 20), 10)
  const epochDay = Number.parseFloat(line1.substring(20, 32))
  if (!Number.isFinite(shortYear) || !Number.isFinite(epochDay)) return null
  const year = shortYear >= 57 ? 1900 + shortYear : 2000 + shortYear
  const wholeDay = Math.floor(epochDay)
  const fraction = epochDay - wholeDay
  const epoch = new Date(Date.UTC(year, 0, 1))
  epoch.setUTCDate(wholeDay)
  epoch.setUTCMilliseconds(Math.round(fraction * 86400000))
  return epoch
}

/**
 * Aproximação orbital leve para visualização. Não é propagação SGP4 e não
 * deve ser usada para apontamento de antena, segurança de voo ou navegação.
 */
function calculateApproxSubpoint(line1: string, line2: string, date: Date) {
  const inclination = parseFloat(line2.substring(8, 16)) * Math.PI / 180
  const raan = parseFloat(line2.substring(17, 25)) * Math.PI / 180
  const eccentricity = parseFloat(`0.${line2.substring(26, 33)}`)
  const argPerigee = parseFloat(line2.substring(34, 42)) * Math.PI / 180
  const meanAnomaly = parseFloat(line2.substring(43, 51)) * Math.PI / 180
  const meanMotion = parseFloat(line2.substring(52, 63))
  const epoch = tleEpoch(line1)

  if (!epoch || ![inclination, raan, eccentricity, argPerigee, meanAnomaly, meanMotion].every(Number.isFinite)) {
    return { lat: 0, lon: 0, altitude: 0, valid: false }
  }

  const elapsedDays = (date.getTime() - epoch.getTime()) / 86400000
  const currentMeanAnomaly = meanAnomaly + 2 * Math.PI * meanMotion * elapsedDays

  let E = currentMeanAnomaly
  for (let i = 0; i < 8; i += 1) {
    E -= (E - eccentricity * Math.sin(E) - currentMeanAnomaly) / (1 - eccentricity * Math.cos(E))
  }

  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(E / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(E / 2)
  )
  const mu = 398600.4418
  const n = meanMotion * 2 * Math.PI / 86400
  const semiMajor = Math.pow(mu / (n * n), 1 / 3)
  const radius = semiMajor * (1 - eccentricity * Math.cos(E))
  const argument = argPerigee + trueAnomaly

  const xOrb = radius * Math.cos(argument)
  const yOrb = radius * Math.sin(argument)
  const x = xOrb * Math.cos(raan) - yOrb * Math.cos(inclination) * Math.sin(raan)
  const y = xOrb * Math.sin(raan) + yOrb * Math.cos(inclination) * Math.cos(raan)
  const z = yOrb * Math.sin(inclination)

  const gmstApprox = (2 * Math.PI * (elapsedDays * 1.00273790935)) % (2 * Math.PI)
  const lat = Math.asin(z / radius) * 180 / Math.PI
  let lon = Math.atan2(y, x) * 180 / Math.PI - gmstApprox * 180 / Math.PI
  lon = ((lon + 540) % 360) - 180
  const altitude = radius - 6371

  return { lat, lon, altitude, valid: [lat, lon, altitude].every(Number.isFinite) }
}

function visibilityFromSubpoint(satLat: number, satLon: number, satAlt: number, obsLat: number, obsLon: number) {
  const earthRadius = 6371
  const satRadius = earthRadius + satAlt
  const dLat = (satLat - obsLat) * Math.PI / 180
  const dLon = (satLon - obsLon) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(obsLat * Math.PI / 180) * Math.cos(satLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  const angularDist = 2 * Math.asin(Math.min(1, Math.sqrt(a)))
  const denominator = Math.sqrt(satRadius ** 2 + earthRadius ** 2 - 2 * satRadius * earthRadius * Math.cos(angularDist))
  const cosElevation = denominator > 0 ? (satRadius * Math.cos(angularDist) - earthRadius) / denominator : -1
  const bounded = Math.max(-1, Math.min(1, cosElevation))
  const elevation = Math.asin(bounded) * 180 / Math.PI
  return { above: elevation > 5, elevation }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const group = searchParams.get('group') || 'starlink'
  const obsLat = parseCoordinate(searchParams.get('lat'), -90, 90)
  const obsLon = parseCoordinate(searchParams.get('lon'), -180, 180)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200)
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

  if (obsLat === null || obsLon === null) {
    return NextResponse.json({
      group,
      observer: null,
      timestamp: new Date().toISOString(),
      source: 'CelesTrak / NORAD GP data',
      dataQuality: 'unavailable',
      total: 0,
      visible: 0,
      satellites: [],
      cached: false,
      fallback: false,
      error: 'invalid-location',
      note: 'Latitude e longitude válidas são obrigatórias para calcular a aproximação relativa ao observador. Nenhuma cidade padrão é assumida.',
    }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'AussyOntech/1.0' },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`CelesTrak retornou ${response.status}`)

    const sats = parseTle(await response.text())
    if (!sats.length) throw new Error('CelesTrak retornou conjunto TLE vazio')

    const now = new Date()
    const computed = sats.map((sat) => {
      const position = calculateApproxSubpoint(sat.line1, sat.line2, now)
      if (!position.valid) return null
      const epoch = tleEpoch(sat.line1)
      const visibility = visibilityFromSubpoint(position.lat, position.lon, position.altitude, obsLat, obsLon)
      return {
        name: sat.name,
        position,
        visibility,
        tleEpoch: epoch?.toISOString() || null,
        tleAgeHours: epoch ? Math.max(0, (now.getTime() - epoch.getTime()) / 3600000) : null,
      }
    }).filter(Boolean) as Array<{
      name: string
      position: { lat: number; lon: number; altitude: number; valid: boolean }
      visibility: { above: boolean; elevation: number }
      tleEpoch: string | null
      tleAgeHours: number | null
    }>

    computed.sort((a, b) => Number(b.visibility.above) - Number(a.visibility.above) || b.visibility.elevation - a.visibility.elevation)

    return NextResponse.json({
      group,
      celestrakGroup: CELESTRAK_GROUPS[group],
      observer: { lat: obsLat, lon: obsLon },
      timestamp: now.toISOString(),
      source: 'CelesTrak / NORAD GP data',
      sourceUrl: url,
      dataQuality: 'live-tle-approx-position',
      propagation: 'aproximação visual — não SGP4',
      total: computed.length,
      visible: computed.filter((sat) => sat.visibility.above).length,
      satellites: computed.slice(0, limit),
      cached: false,
      fallback: false,
      warning: 'Posições/elevações são aproximações para visualização. Não usar para navegação, apontamento de antena ou decisão operacional.',
    })
  } catch {
    return NextResponse.json({
      group,
      observer: { lat: obsLat, lon: obsLon },
      timestamp: new Date().toISOString(),
      source: 'CelesTrak indisponível',
      dataQuality: 'unavailable',
      total: 0,
      visible: 0,
      satellites: [],
      cached: false,
      fallback: false,
      error: 'unavailable',
      note: 'Sem TLE real confirmado nesta resposta. O Service Worker usa a última cópia CelesTrak válida quando disponível.',
    }, { status: 503 })
  }
}
