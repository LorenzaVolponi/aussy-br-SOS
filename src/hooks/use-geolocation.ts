'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type GeoPermissionState = PermissionState | 'unsupported' | 'unknown'

export interface GeoPoint {
  lat: number
  lon: number
  accuracy?: number
  altitude?: number | null
  altitudeAccuracy?: number | null
  heading?: number | null
  speed?: number | null
  source: 'gps' | 'ip' | 'manual' | 'cached'
  timestamp: string
  city?: string
  region?: string
  country?: string
}

const STORAGE_KEY = 'aussy_last_location_v1'
const GPS_TARGET_ACCURACY_METERS = 35
const GPS_SETTLE_MS = 4_000
const GPS_HARD_TIMEOUT_MS = 15_000
const IP_TIMEOUT_MS = 8_000

function isValidCoordinate(lat: unknown, lon: unknown): boolean {
  return typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180
}

function readCachedPoint(): GeoPoint | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<GeoPoint>
    if (!isValidCoordinate(parsed.lat, parsed.lon)) return null

    return {
      lat: parsed.lat as number,
      lon: parsed.lon as number,
      accuracy: parsed.accuracy,
      altitude: parsed.altitude,
      altitudeAccuracy: parsed.altitudeAccuracy,
      heading: parsed.heading,
      speed: parsed.speed,
      source: 'cached',
      timestamp: parsed.timestamp || new Date().toISOString(),
      city: parsed.city,
      region: parsed.region,
      country: parsed.country,
    }
  } catch {
    return null
  }
}

function persistPoint(point: GeoPoint) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(point))
  } catch {
    // O app continua funcional quando o storage está bloqueado ou indisponível.
  }
}

function pointFromPosition(position: GeolocationPosition): GeoPoint {
  const { coords } = position

  return {
    lat: coords.latitude,
    lon: coords.longitude,
    accuracy: coords.accuracy,
    altitude: coords.altitude,
    altitudeAccuracy: coords.altitudeAccuracy,
    heading: coords.heading,
    speed: coords.speed,
    source: 'gps',
    timestamp: new Date(position.timestamp).toISOString(),
  }
}

function geolocationError(error: GeolocationPositionError): Error {
  let message = 'Não foi possível obter a localização do dispositivo'
  let name = 'GeolocationUnavailable'

  if (error.code === error.PERMISSION_DENIED) {
    message = 'Permissão de localização bloqueada. Libere o GPS nas configurações deste site.'
    name = 'GeolocationPermissionDenied'
  } else if (error.code === error.POSITION_UNAVAILABLE) {
    message = 'O aparelho não conseguiu determinar uma posição GPS agora.'
    name = 'GeolocationPositionUnavailable'
  } else if (error.code === error.TIMEOUT) {
    message = 'O GPS demorou além do limite. Tente novamente em local aberto.'
    name = 'GeolocationTimeout'
  }

  const normalized = new Error(message)
  normalized.name = name
  return normalized
}

function acquireBestGpsFix(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocalização não suportada neste navegador'))
      return
    }

    let watchId: number | null = null
    let settleTimer: number | null = null
    let hardTimer: number | null = null
    let bestPoint: GeoPoint | null = null
    let lastError: Error | null = null
    let finished = false

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      if (settleTimer !== null) window.clearTimeout(settleTimer)
      if (hardTimer !== null) window.clearTimeout(hardTimer)
    }

    const finish = (point?: GeoPoint, error?: Error) => {
      if (finished) return
      finished = true
      cleanup()

      if (point) {
        resolve(point)
      } else {
        reject(error || new Error('Não foi possível determinar a localização'))
      }
    }

    const settleWithBest = () => {
      if (bestPoint) finish(bestPoint)
    }

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const candidate = pointFromPosition(position)
        const candidateAccuracy = candidate.accuracy ?? Number.POSITIVE_INFINITY
        const bestAccuracy = bestPoint?.accuracy ?? Number.POSITIVE_INFINITY

        if (!bestPoint || candidateAccuracy < bestAccuracy) {
          bestPoint = candidate
        }

        if (candidateAccuracy <= GPS_TARGET_ACCURACY_METERS) {
          finish(candidate)
          return
        }

        if (settleTimer === null) {
          settleTimer = window.setTimeout(settleWithBest, GPS_SETTLE_MS)
        }
      },
      (error) => {
        const normalized = geolocationError(error)
        lastError = normalized

        if (error.code === error.PERMISSION_DENIED) {
          finish(undefined, normalized)
        } else if (bestPoint) {
          finish(bestPoint)
        }
      },
      {
        enableHighAccuracy: true,
        timeout: GPS_HARD_TIMEOUT_MS - 1_000,
        maximumAge: 0,
      }
    )

    hardTimer = window.setTimeout(() => {
      if (bestPoint) {
        finish(bestPoint)
      } else {
        const timeoutError = lastError || new Error('O GPS não retornou uma posição dentro do limite. Tente novamente em local aberto.')
        timeoutError.name = timeoutError.name === 'Error' ? 'GeolocationTimeout' : timeoutError.name
        finish(undefined, timeoutError)
      }
    }, GPS_HARD_TIMEOUT_MS)
  })
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

export function useGeolocation() {
  const [point, setPoint] = useState<GeoPoint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [permission, setPermission] = useState<GeoPermissionState>('unknown')
  const requestIdRef = useRef(0)
  const gpsPromiseRef = useRef<Promise<GeoPoint> | null>(null)

  useEffect(() => {
    const cached = readCachedPoint()
    if (cached) setPoint((current) => current ?? cached)
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('permissions' in navigator)) {
      setPermission('unsupported')
      return
    }

    let disposed = false
    let status: PermissionStatus | null = null

    navigator.permissions.query({ name: 'geolocation' as PermissionName })
      .then((result) => {
        if (disposed) return

        status = result
        setPermission(result.state)
        result.onchange = () => setPermission(result.state)
      })
      .catch(() => {
        if (!disposed) setPermission('unsupported')
      })

    return () => {
      disposed = true
      if (status) status.onchange = null
    }
  }, [])

  const fromGps = useCallback(async (): Promise<GeoPoint> => {
    if (gpsPromiseRef.current) return gpsPromiseRef.current

    const request = acquireBestGpsFix()
    gpsPromiseRef.current = request

    try {
      const nextPoint = await request
      setPermission('granted')
      return nextPoint
    } finally {
      if (gpsPromiseRef.current === request) gpsPromiseRef.current = null
    }
  }, [])

  const fromIp = useCallback(async (): Promise<GeoPoint> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Sem rede para localização aproximada')
    }

    const response = await fetchWithTimeout('/api/network/status', { cache: 'no-store' }, IP_TIMEOUT_MS)
    if (!response.ok) throw new Error('Status de rede indisponível')

    const data = await response.json()
    const geo = data?.geo

    if (!geo || !isValidCoordinate(geo.latitude, geo.longitude)) {
      throw new Error('Localização aproximada por rede indisponível')
    }

    return {
      lat: geo.latitude,
      lon: geo.longitude,
      accuracy: 5_000,
      source: 'ip',
      timestamp: new Date().toISOString(),
      city: geo.city || undefined,
      region: geo.region || undefined,
      country: geo.country || undefined,
    }
  }, [])

  const detect = useCallback(async (preferGps = true) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      let nextPoint: GeoPoint | null = null
      let gpsError: Error | null = null

      if (preferGps) {
        try {
          nextPoint = await fromGps()
        } catch (caught) {
          gpsError = caught instanceof Error ? caught : new Error('GPS indisponível')
          if (gpsError.name === 'GeolocationPermissionDenied') setPermission('denied')
        }
      }

      if (!nextPoint && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          nextPoint = await fromIp()
        } catch {
          // Cache local ainda é melhor do que inventar uma cidade ou coordenada.
        }
      }

      if (!nextPoint && !preferGps) {
        try {
          nextPoint = await fromGps()
        } catch (caught) {
          gpsError = caught instanceof Error ? caught : new Error('GPS indisponível')
          if (gpsError.name === 'GeolocationPermissionDenied') setPermission('denied')
        }
      }

      if (!nextPoint) {
        // A última posição conhecida ainda é preferível a um default arbitrário.
        const cached = readCachedPoint()
        if (cached) {
          if (requestId === requestIdRef.current) {
            setPoint(cached)
            setError(gpsError?.message || 'Usando a última localização salva no aparelho.')
          }
          return cached
        }
      }

      if (!nextPoint) {
        throw gpsError || new Error('Não foi possível determinar a localização')
      }

      persistPoint(nextPoint)

      if (requestId === requestIdRef.current) {
        setPoint(nextPoint)
        setError(
          nextPoint.source === 'ip' && gpsError
            ? `${gpsError.message} Usando uma estimativa por rede, não GPS.`
            : null
        )
      }

      return nextPoint
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Falha ao detectar localização'
      if (requestId === requestIdRef.current) setError(message)
      return null
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [fromGps, fromIp])

  const detectGps = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      const nextPoint = await fromGps()
      persistPoint(nextPoint)

      if (requestId === requestIdRef.current) {
        setPoint(nextPoint)
        setError(null)
      }

      return nextPoint
    } catch (caught) {
      const normalized = caught instanceof Error ? caught : new Error('GPS indisponível')
      if (normalized.name === 'GeolocationPermissionDenied') setPermission('denied')
      if (requestId === requestIdRef.current) setError(normalized.message)
      return null
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [fromGps])

  const setManual = useCallback((lat: number, lon: number) => {
    if (!isValidCoordinate(lat, lon)) {
      setError('Coordenadas inválidas')
      return
    }

    const manualPoint: GeoPoint = {
      lat,
      lon,
      source: 'manual',
      timestamp: new Date().toISOString(),
    }

    persistPoint(manualPoint)
    setPoint(manualPoint)
    setError(null)
  }, [])

  return {
    point,
    error,
    loading,
    permission,
    detect,
    detectGps,
    setManual,
  }
}
