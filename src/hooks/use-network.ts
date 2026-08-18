'use client'

import { useEffect, useState, useCallback } from 'react'

interface NetworkState {
  online: boolean
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
  type?: string
  supported: boolean
}

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
    const connection = (navigator as any).connection
    connection?.addEventListener?.('change', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      connection?.removeEventListener?.('change', update)
    }
  }, [])

  return state
}

export function useLatencyProbe(url = '/api/network/status', intervalMs = 15000) {
  const [latency, setLatency] = useState<number | null>(null)
  const [isReachable, setIsReachable] = useState<boolean | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const probe = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLatency(null)
      setIsReachable(false)
      setLastCheck(new Date())
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)
    const start = performance.now()

    try {
      const res = await fetch(url, {
        cache: 'no-store',
        signal: controller.signal,
      })
      const elapsed = performance.now() - start
      const servedFromCache = res.headers.get('X-Aussy-Cached') === 'true' ||
        res.headers.get('X-Aussy-Offline') === 'true'

      setLatency(servedFromCache ? null : Math.round(elapsed))
      setIsReachable(res.ok && !servedFromCache)
      setLastCheck(new Date())
    } catch {
      setLatency(null)
      setIsReachable(false)
      setLastCheck(new Date())
    } finally {
      window.clearTimeout(timeout)
    }
  }, [url])

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void probe(), 100)
    const id = window.setInterval(() => void probe(), intervalMs)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(id)
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

export function useDeviceCapabilities(): DeviceCapabilities {
  const [caps, setCaps] = useState<DeviceCapabilities>(DEFAULT_CAPS)

  useEffect(() => {
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
