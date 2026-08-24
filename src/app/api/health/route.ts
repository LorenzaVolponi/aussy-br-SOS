import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'aussy',
    version: 'v1',
    timestamp: new Date().toISOString(),
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'local',
    runtime: process.version,
  }, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
