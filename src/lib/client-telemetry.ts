'use client'

type TelemetryKind = 'client-error' | 'global-error' | 'unhandled-rejection' | 'release-smoke'

export function reportClientEvent(kind: TelemetryKind, input: { message?: string; digest?: string } = {}) {
  if (typeof window === 'undefined') return

  const payload = JSON.stringify({
    kind,
    message: input.message,
    digest: input.digest,
    path: window.location.pathname,
    online: navigator.onLine,
  })

  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon('/api/telemetry', new Blob([payload], { type: 'application/json' }))
      if (sent) return
    }
    void fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
      cache: 'no-store',
    }).catch(() => undefined)
  } catch {
    // Telemetria nunca deve impedir o fluxo de emergência.
  }
}
