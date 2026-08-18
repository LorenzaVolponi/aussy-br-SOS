import { NextResponse } from 'next/server'
import { READINESS_SNAPSHOT } from '@/lib/readiness-state'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    product: 'Aussy Ontech',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    ...READINESS_SNAPSHOT,
    note: 'Snapshot versionado de governança. Não é substituto de execução real dos checks; o estado é protegido por gate de consistência no repositório.',
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
