'use client'

import { useEffect, useState, useCallback } from 'react'

interface NetworkState {
  online: boolean
  effectiveType?: string // '4g' | '3g' | '2g' | 'slow-2g'
  downlink?: number // Mbps
  rtt?: number // ms
  saveData?: boolean
  type?: string // 'wifi' | 'cellular' | 'ethernet' | etc
  supported: boolean
}

/**
 * Hook para monitorar o status real da rede no navegador.
 * Usa Network Information API (Chrome/Edge) + navigator.onLine (todos browsers).
 */
export function useNetworkStatus(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    supported: false,
  })

  useEffect(() => {
    const update = () => {
      const conn = (navigator as any).connection ||
                   (navigator as any).mozConnection ||
                   (navigator as any).webkitConnection

      setState({
        online: navigator.onLine,
        effectiveType: conn?.effectiveType,
        downlink: conn?.downlink,
        rtt: conn?.rtt,
        saveData: conn?.saveData,
        type: conn?.type,
        supported: !!conn,
      })
    }

    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', update)
    }

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', update)
      }
    }
  }, [])

  return state
}

/**
 * Hook para medir latência real periodicamente.
 */
export function useLatencyProbe(url = '/api/network/status', intervalMs = 15000) {
  const [latency, setLatency] = useState<number | null>(null)
  const [isReachable, setIsReachable] = useState<boolean | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const probe = useCallback(async () => {
    const start = performance.now()
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })
      const elapsed = performance.now() - start
      setLatency(Math.round(elapsed))
      setIsReachable(res.ok)
      setLastCheck(new Date())
    } catch {
      setLatency(null)
      setIsReachable(false)
      setLastCheck(new Date())
    }
  }, [url])

  useEffect(() => {
    // Inicia em timeout para evitar setState síncrono no effect
    const initialTimer = setTimeout(probe, 100)
    const id = setInterval(probe, intervalMs)
    return () => {
      clearTimeout(initialTimer)
      clearInterval(id)
    }
  }, [probe, intervalMs])

  return { latency, isReachable, lastCheck, probe }
}

export interface DeviceCapabilities {
  hasBluetooth: boolean
  hasGeolocation: boolean
  hasServiceWorker: boolean
  hasBackgroundSync: boolean
  hasPushManager: boolean
  hasCellBroadcast: boolean
  hasSatelliteSos: boolean
  userAgent: string
  platform: string
}

const DEFAULT_CAPS: DeviceCapabilities = {
  hasBluetooth: false,
  hasGeolocation: false,
  hasServiceWorker: false,
  hasBackgroundSync: false,
  hasPushManager: false,
  hasCellBroadcast: false,
  hasSatelliteSos: false,
  userAgent: '',
  platform: '',
}

/**
 * Hook para detectar capacidades do dispositivo (satellite SOS, Bluetooth, etc.)
 * SSR-safe: retorna valores padrão no servidor e detecta no cliente após montagem.
 */
export function useDeviceCapabilities(): DeviceCapabilities {
  const [caps, setCaps] = useState<DeviceCapabilities>(DEFAULT_CAPS)

  useEffect(() => {
    // Garante que só roda no navegador
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return

    const ua = navigator.userAgent
    const isApple = /iPhone|iPad|iPod/.test(ua)
    const isAndroid = /Android/.test(ua)
    const isMobile = isApple || isAndroid

    const iphoneMatch = ua.match(/iPhone(\d+,\d+)/)
    let isIphone14Plus = false
    if (iphoneMatch) {
      const [major, minor] = iphoneMatch[1].split(',').map(Number)
      isIphone14Plus = major > 14 || (major === 14 && minor >= 7)
    }

    setCaps({
      hasBluetooth: 'bluetooth' in navigator,
      hasGeolocation: 'geolocation' in navigator,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasBackgroundSync: 'serviceWorker' in navigator && 'SyncManager' in window,
      hasPushManager: 'PushManager' in window,
      hasCellBroadcast: isMobile,
      hasSatelliteSos:
        (isApple && isIphone14Plus) ||
        (isAndroid && /S22|S23|S24|S25|Pixel 8|Pixel 9/.test(ua)),
      userAgent: ua,
      platform: isApple ? 'ios' : isAndroid ? 'android' : 'desktop',
    })
  }, [])

  return caps
}
