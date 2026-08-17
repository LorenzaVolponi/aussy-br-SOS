'use client'

import { useEffect, useState } from 'react'

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

export function useGeolocation() {
  const [point, setPoint] = useState<GeoPoint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fromGps = (): Promise<GeoPoint> => new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
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
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })

  const fromIp = async (): Promise<GeoPoint> => {
    const res = await fetch('/api/network/status', { cache: 'no-store' })
    const data = await res.json()
    if (!data.externalIp) throw new Error('IP não disponível')
    // Consulta ipapi já é feita no endpoint, mas precisamos do lat/lon
    const geoRes = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
    const geo = await geoRes.json()
    return {
      lat: geo.latitude,
      lon: geo.longitude,
      accuracy: 5000, // ~5km de precisão típica para IP
      source: 'ip',
      timestamp: new Date().toISOString(),
      city: geo.city,
      region: geo.region,
      country: geo.country_name,
    }
  }

  const detect = async (preferGps = true) => {
    setLoading(true)
    setError(null)
    try {
      let p: GeoPoint | null = null
      if (preferGps) {
        try {
          p = await fromGps()
        } catch (e) {
          // fallback para IP
        }
      }
      if (!p) p = await fromIp()
      setPoint(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao detectar localização')
    } finally {
      setLoading(false)
    }
  }

  const setManual = (lat: number, lon: number) => {
    setPoint({
      lat,
      lon,
      source: 'manual',
      timestamp: new Date().toISOString(),
    })
  }

  return { point, error, loading, detect, setManual }
}
