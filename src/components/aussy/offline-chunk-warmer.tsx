'use client'

import { useEffect } from 'react'

const WARM_VERSION = 'aussy-offline-modules-v8'

async function waitForController(timeoutMs = 10000) {
  if (!('serviceWorker' in navigator)) return false
  if (navigator.serviceWorker.controller) return true

  await navigator.serviceWorker.ready.catch(() => null)
  if (navigator.serviceWorker.controller) return true

  return new Promise<boolean>((resolve) => {
    const timeout = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange)
      resolve(Boolean(navigator.serviceWorker.controller))
    }, timeoutMs)

    const onChange = () => {
      window.clearTimeout(timeout)
      navigator.serviceWorker.removeEventListener('controllerchange', onChange)
      resolve(true)
    }

    navigator.serviceWorker.addEventListener('controllerchange', onChange)
  })
}

async function warmModules() {
  const results = await Promise.allSettled([
    import('@/components/aussy/satellite-tracker'),
    import('@/components/aussy/offline-map'),
    import('@/components/aussy/coverage-map'),
    import('@/components/aussy/compass-altimeter'),
    import('@/components/aussy/cemaden-alerts'),
    import('@/components/aussy/fauna-protocols'),
    import('@/components/aussy/multilingual-phrases'),
    import('@/components/aussy/survival-tools'),
    import('@/components/aussy/emergency-contacts'),
    import('@/components/aussy/medical-card'),
    import('@/components/aussy/gps-trail'),
    import('@/components/aussy/mesh-network'),
    import('@/components/aussy/earthquakes-card'),
    import('@/components/aussy/eonet-card'),
    import('@/components/aussy/weather-forecast'),
    import('@/components/aussy/inmet-stations'),
    import('@/components/aussy/ana-rios'),
    import('@/components/aussy/cptec-satellite'),
    import('@/components/aussy/defesa-civil'),
  ])

  const failed = results.filter((result) => result.status === 'rejected').length
  if (failed === 0) {
    try {
      localStorage.setItem(WARM_VERSION, new Date().toISOString())
    } catch {}
  }

  window.dispatchEvent(new CustomEvent('aussy:offline-modules-warmed', {
    detail: { total: results.length, failed },
  }))

  return failed === 0
}

export function OfflineChunkWarmer() {
  useEffect(() => {
    if (!navigator.onLine || !('serviceWorker' in navigator)) return

    let cancelled = false

    const run = async () => {
      try {
        const alreadyWarm = localStorage.getItem(WARM_VERSION)
        if (alreadyWarm) return
      } catch {}

      const controlled = await waitForController()
      if (!controlled || cancelled || !navigator.onLine) return
      await warmModules()
    }

    const timer = window.setTimeout(() => void run(), 1200)
    const onOnline = () => void run()
    window.addEventListener('online', onOnline)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  return null
}
