import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/api-resilience'

const MONITORING_PATHS = new Set(['/api/health', '/api/readiness'])

export function proxy(req: NextRequest) {
  if (MONITORING_PATHS.has(req.nextUrl.pathname)) return NextResponse.next()

  const limited = enforceRateLimit(req, 'api-global', {
    limit: 120,
    windowMs: 60_000,
  })

  return limited || NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
