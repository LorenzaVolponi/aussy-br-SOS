'use client'

import { useCallback, useEffect, useState } from 'react'

export interface GeoPoint {
  lat: number
  lon: number
  accuracy?: number
  source: 'gps' | 'ip' | 'manual' | 'cached'
  timestamp: string
  city?: string
  region?: string
  country?: string
}

const STORAGE_KEY = 'aussy_last_location_v1'

function isValidCoordinate(lat: unknown, lon: unknown): lat is number {
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
      lat: parsed.lat,
      lon: parsed.lon as number,
      accuracy: parsed.accuracy,
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
    // localStorage pode estar indisponível em modo privado/restrito.
  }
}

export function useGeolocation() {
  const [point, setPoint] = useState<GeoPoint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const cached = readCachedPoint()
    if (cached) setPoint((current) => current ?? cached)
  }, [])

  const fromGps = useCallback((): Promise<GeoPoint> => new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Geolocalização não suportada'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'gps',
          timestamp: new Date(pos.timestamp).toISOString(),
        })
      },
      (err) => reject(new Error(err.message || 'GPS indisponível')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }), [])

  const fromIp = useCallback(async (): Promise<GeoPoint> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Sem rede para localização por IP')
    }

    const res = await fetch('/api/network/status', { cache: 'no-store' })
    if (!res.ok) throw new Error('Status de rede indisponível')
    const data = await res.json()
    if (!data.externalIp) throw new Error('IP não disponível')

    const geoRes = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
    if (!geoRes.ok) throw new Error('Geolocalização por IP indisponível')
    const geo = await geoRes.json()
    if (!isValidCoordinate(geo.latitude, geo.longitude)) {
      throw new Error('Coordenadas por IP inválidas')
    }

    return {
      lat: geo.latitude,
      lon: geo.longitude,
      accuracy: 5000,
      source: 'ip',
      timestamp: new Date().toISOString(),
      city: geo.city,
      region: geo.region,
      country: geo.country_name,
    }
  }, [])

  const detect = useCallback(async (preferGps = true) => {
    setLoading(true)
    setError(null)

    try {
      let nextPoint: GeoPoint | null = null
      let gpsError: Error | null = null

      if (preferGps) {
        try {
          nextPoint = await fromGps()
        } catch (err) {
          gpsError = err instanceof Error ? err : new Error('GPS indisponível')
        }
      }

      if (!nextPoint && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          nextPoint = await fromIp()
        } catch {
          // A última posição conhecida ainda é preferível a um default arbitrário.
        }
      }

      if (!nextPoint) {
        const cached = readCachedPoint()
        if (cached) {
          setPoint(cached)
          setError(gpsError?.message || 'Usando última localização conhecida')
          return cached
        }
      }

      if (!nextPoint && !preferGps) {
        nextPoint = await fromGps()
      }

      if (!nextPoint) {
        throw gpsError || new Error('Não foi possível determinar a localização')
      }

      persistPoint(nextPoint)
      setPoint(nextPoint)
      return nextPoint
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao detectar localização'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [fromGps, fromIp])

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

  return { point, error, loading, detect, setManual }
}
