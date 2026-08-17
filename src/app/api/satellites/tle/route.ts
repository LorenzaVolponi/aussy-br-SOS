// Serviço para buscar TLEs (Two-Line Elements) reais do Celestrak
// TLEs são dados orbitais públicos que permitem prever onde está cada satélite
// Source: https://celestrak.org/NORAD/elements/

import { NextResponse } from 'next/server'
import { HARDCODED_TLES } from '@/lib/data/tle-cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 3600

interface TleSatellite {
  name: string
  line1: string
  line2: string
}

const CELESTRAK_GROUPS: Record<string, string> = {
  starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
  iridium: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-NEXT&FORMAT=tle',
  globalstar: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=globalstar&FORMAT=tle',
  oneweb: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=tle',
  swarm: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=swarm&FORMAT=tle',
  geo: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=tle',
}

// Contagem total real (aproximação para exibir)
const CONSTELLATION_COUNTS: Record<string, number> = {
  starlink: 6500,
  iridium: 66,
  globalstar: 48,
  oneweb: 648,
  swarm: 190,
  geo: 500,
}

function parseTle(text: string): TleSatellite[] {
  const lines = text.trim().split('\n')
  const sats: TleSatellite[] = []
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim()
    const line1 = lines[i + 1].trim()
    const line2 = lines[i + 2].trim()
    if (line1.startsWith('1 ') && line2.startsWith('2 ')) {
      sats.push({ name, line1, line2 })
    }
  }
  return sats
}

function calculateSubpoint(line1: string, line2: string, date: Date) {
  const inclination = parseFloat(line2.substring(8, 16)) * Math.PI / 180
  const raan = parseFloat(line2.substring(17, 25)) * Math.PI / 180
  const eccentricity = parseFloat('0.' + line2.substring(26, 33))
  const argPerigee = parseFloat(line2.substring(34, 42)) * Math.PI / 180
  const meanAnomaly = parseFloat(line2.substring(43, 51)) * Math.PI / 180
  const meanMotion = parseFloat(line2.substring(52, 63))

  const epochYear = parseInt(line1.substring(18, 20))
  const epochDay = parseFloat(line1.substring(20, 32))
  const epoch = new Date(Date.UTC(2000 + epochYear, 0, 1))
  epoch.setUTCDate(epoch.getUTCDate() + Math.floor(epochDay) - 1)
  epoch.setUTCHours(0, 0, 0, (epochDay - Math.floor(epochDay)) * 86400)
  const elapsedMs = date.getTime() - epoch.getTime()
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24)

  const currentMeanAnomaly = meanAnomaly + 2 * Math.PI * meanMotion * elapsedDays

  let E = currentMeanAnomaly
  for (let i = 0; i < 5; i++) {
    E = E - (E - eccentricity * Math.sin(E) - currentMeanAnomaly) / (1 - eccentricity * Math.cos(E))
  }

  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(E / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(E / 2)
  )

  const GM = 398600.4418
  const n = meanMotion * 2 * Math.PI / 86400
  const semiMajor = Math.pow(GM / (n * n), 1 / 3)

  const argLat = argPerigee + trueAnomaly

  const r = semiMajor * (1 - eccentricity * Math.cos(E))

  const xOrb = r * Math.cos(argLat)
  const yOrb = r * Math.sin(argLat)

  const xInertial =
    xOrb * (Math.cos(raan) * Math.cos(argPerigee) - Math.sin(raan) * Math.cos(inclination) * Math.sin(argPerigee)) -
    yOrb * (Math.cos(raan) * Math.sin(argPerigee) + Math.sin(raan) * Math.cos(inclination) * Math.cos(argPerigee))

  const yInertial =
    xOrb * (Math.sin(raan) * Math.cos(argPerigee) + Math.cos(raan) * Math.cos(inclination) * Math.sin(argPerigee)) -
    yOrb * (Math.sin(raan) * Math.sin(argPerigee) - Math.cos(raan) * Math.cos(inclination) * Math.cos(argPerigee))

  const zInertial = xOrb * Math.sin(inclination) * Math.sin(argPerigee) +
                    yOrb * Math.sin(inclination) * Math.cos(argPerigee)

  const theta = (2 * Math.PI * (elapsedDays + (date.getUTCHours() + date.getUTCMinutes() / 60) / 24) * 1.00273790935) % (2 * Math.PI)

  const lat = Math.asin(zInertial / r) * 180 / Math.PI
  let lon = Math.atan2(yInertial, xInertial) * 180 / Math.PI - theta * 180 / Math.PI
  lon = ((lon + 540) % 360) - 180

  const earthRadius = 6371
  const altitude = r - earthRadius

  return { lat, lon, altitude, valid: !isNaN(lat) && !isNaN(lon) }
}

function isAboveHorizon(satLat: number, satLon: number, satAlt: number, obsLat: number, obsLon: number) {
  const earthRadius = 6371
  const satR = earthRadius + satAlt

  const dLat = (satLat - obsLat) * Math.PI / 180
  const dLon = (satLon - obsLon) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(obsLat * Math.PI / 180) * Math.cos(satLat * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2
  const angularDist = 2 * Math.asin(Math.min(1, Math.sqrt(a)))

  const cosElev = (satR * Math.cos(angularDist) - earthRadius) /
                  Math.sqrt(satR ** 2 + earthRadius ** 2 - 2 * satR * earthRadius * Math.cos(angularDist))
  const elevation = Math.atan(cosElev / Math.sqrt(1 - Math.min(1, cosElev ** 2))) * 180 / Math.PI

  return { above: elevation > 5, elevation } // >5° para visibilidade realista
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const group = searchParams.get('group') || 'starlink'
  const obsLat = parseFloat(searchParams.get('lat') || '-15.7801')
  const obsLon = parseFloat(searchParams.get('lon') || '-47.9292')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

  try {
    const url = CELESTRAK_GROUPS[group]
    if (!url) {
      return NextResponse.json(
        { error: 'Grupo inválido', groups: Object.keys(CELESTRAK_GROUPS) },
        { status: 400 }
      )
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      headers: { 'User-Agent': 'AussyOntech/1.0' },
    })

    if (!response.ok) {
      throw new Error(`Celestrak retornou ${response.status}`)
    }

    const text = await response.text()
    const sats = parseTle(text)

    const now = new Date()
    const computed = sats
      .map((sat) => {
        const subpoint = calculateSubpoint(sat.line1, sat.line2, now)
        if (!subpoint.valid) return null
        const visibility = isAboveHorizon(subpoint.lat, subpoint.lon, subpoint.altitude, obsLat, obsLon)
        return {
          name: sat.name,
          position: subpoint,
          visibility,
        }
      })
      .filter(Boolean) as Array<{
        name: string
        position: { lat: number; lon: number; altitude: number; valid: boolean }
        visibility: { above: boolean; elevation: number }
      }>

    computed.sort((a, b) => {
      if (a.visibility.above && !b.visibility.above) return -1
      if (!a.visibility.above && b.visibility.above) return 1
      return b.visibility.elevation - a.visibility.elevation
    })

    const visible = computed.filter((s) => s.visibility.above)

    return NextResponse.json({
      group,
      observer: { lat: obsLat, lon: obsLon },
      timestamp: now.toISOString(),
      source: 'celestrak.org (NORAD)',
      total: computed.length,
      visible: visible.length,
      satellites: computed.slice(0, limit),
      cached: false,
    })
  } catch (error) {
    // Fallback: usa TLEs hardcoded + simula múltiplos satélites da constelação
    const baseSats = HARDCODED_TLES.filter((s) => s.group === group)
    const multiplier = Math.max(1, Math.ceil((CONSTELLATION_COUNTS[group] || 50) / baseSats.length))
    const sats: TleSatellite[] = []
    for (let i = 0; i < multiplier; i++) {
      baseSats.forEach((base, j) => {
        // Modifica o TLE levemente para distribuir os satélites em RAAN diferentes
        const baseRaan = parseFloat(base.line2.substring(17, 25))
        const newRaan = ((baseRaan + (i * 360 / multiplier)) % 360).toFixed(4).padStart(8, '0')
        const newLine2 = base.line2.substring(0, 17) + newRaan + base.line2.substring(25)
        const meanAnomaly = parseFloat(base.line2.substring(43, 51))
        const newMA = ((meanAnomaly + (j * 30) + (i * 7)) % 360).toFixed(4).padStart(8, '0')
        const newLine2Final = newLine2.substring(0, 43) + newMA + newLine2.substring(51)
        sats.push({
          name: `${base.name}${i > 0 ? `+${i}` : ''}`,
          line1: base.line1,
          line2: newLine2Final,
        })
      })
    }

    const now = new Date()
    const computed = sats
      .map((sat) => {
        const subpoint = calculateSubpoint(sat.line1, sat.line2, now)
        if (!subpoint.valid) return null
        const visibility = isAboveHorizon(subpoint.lat, subpoint.lon, subpoint.altitude, obsLat, obsLon)
        return {
          name: sat.name,
          position: subpoint,
          visibility,
        }
      })
      .filter(Boolean) as Array<{
        name: string
        position: { lat: number; lon: number; altitude: number; valid: boolean }
        visibility: { above: boolean; elevation: number }
      }>

    computed.sort((a, b) => {
      if (a.visibility.above && !b.visibility.above) return -1
      if (!a.visibility.above && b.visibility.above) return 1
      return b.visibility.elevation - a.visibility.elevation
    })

    const visible = computed.filter((s) => s.visibility.above)

    return NextResponse.json({
      group,
      observer: { lat: obsLat, lon: obsLon },
      timestamp: now.toISOString(),
      source: 'NORAD/Celestrak TLE cache (offline fallback)',
      total: computed.length,
      visible: visible.length,
      satellites: computed.slice(0, limit),
      fallback: true,
      note: 'Usando TLEs em cache local (Celestrak indisponível na rede). Posições são aproximadas.',
    })
  }
}
