'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { reportClientEvent } from '@/lib/client-telemetry'

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientEvent('client-error', { message: error.message, digest: error.digest })
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">Aussy · recuperação segura</p>
        <h1 className="mt-3 text-2xl font-black">Algo falhou nesta tela.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Seus recursos de emergência não são substituídos por esta tela. Tente recuperar a interface ou recarregue o aplicativo.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={reset}>Tentar novamente</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>Recarregar</Button>
        </div>
      </div>
    </main>
  )
}
