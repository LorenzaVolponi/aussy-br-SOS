import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Health leve do backend do Aussy.
 *
 * `status: app-api-reachable` significa apenas que esta Function respondeu.
 * Não implica que provedores externos (INMET, NASA, CPTEC, INPE etc.) estejam
 * disponíveis; cada integração mantém seu próprio estado/proveniência.
 */
export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || null

  return NextResponse.json(
    {
      service: 'aussy-ontech',
      status: 'app-api-reachable',
      checkedAt: new Date().toISOString(),
      commit,
      offlineModel: 'service-worker-last-known-good',
      externalProvidersChecked: false,
      note: 'Este endpoint valida somente a disponibilidade do backend do Aussy. Não valida provedores externos.',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}
