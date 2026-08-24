'use client'

import { useEffect } from 'react'
import { reportClientEvent } from '@/lib/client-telemetry'

export function ClientObservability() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportClientEvent('client-error', { message: event.message || 'Unhandled client error' })
    }
    const onRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason instanceof Error ? event.reason.message : String(event.reason || 'Unhandled promise rejection')
      reportClientEvent('unhandled-rejection', { message })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
