'use client'

import { useEffect } from 'react'
import { reportClientEvent } from '@/lib/client-telemetry'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientEvent('global-error', { message: error.message, digest: error.digest })
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: '#070b12', color: '#f5f7fa', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ maxWidth: 480, border: '1px solid rgba(239,68,68,.35)', borderRadius: 20, padding: 24, background: 'rgba(239,68,68,.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 12, letterSpacing: '.18em', color: '#fca5a5', textTransform: 'uppercase' }}>Aussy · modo de recuperação</div>
            <h1 style={{ margin: '14px 0 8px', fontSize: 28 }}>A interface encontrou uma falha crítica.</h1>
            <p style={{ color: '#aeb7c4', lineHeight: 1.6 }}>Tente restaurar a aplicação. Em uma emergência real, use também os canais oficiais do seu dispositivo e da sua região.</p>
            <button onClick={reset} style={{ marginTop: 18, border: 0, borderRadius: 12, padding: '12px 18px', fontWeight: 700, cursor: 'pointer' }}>Tentar novamente</button>
          </section>
        </main>
      </body>
    </html>
  )
}
