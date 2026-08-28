import { NextRequest, NextResponse } from 'next/server'

type RateBucket = { count: number; resetAt: number }
type CircuitState = { failures: number; openedAt: number | null }

const rateBuckets = new Map<string, RateBucket>()
const circuits = new Map<string, CircuitState>()
const MAX_RATE_BUCKETS = 5000

function requestIdentity(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const vercel = req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || vercel || 'anonymous'
}

function pruneRateBuckets(now: number) {
  if (rateBuckets.size < MAX_RATE_BUCKETS) return

  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key)
  }

  if (rateBuckets.size >= MAX_RATE_BUCKETS) {
    const oldestKeys = [...rateBuckets.keys()].slice(0, Math.ceil(MAX_RATE_BUCKETS * 0.1))
    for (const key of oldestKeys) rateBuckets.delete(key)
  }
}

export function enforceRateLimit(
  req: NextRequest,
  scope: string,
  options: { limit?: number; windowMs?: number } = {}
): NextResponse | null {
  const limit = options.limit ?? 60
  const windowMs = options.windowMs ?? 60_000
  const now = Date.now()
  pruneRateBuckets(now)

  const key = `${scope}:${requestIdentity(req)}`
  const current = rateBuckets.get(key)
  const bucket = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + windowMs }
    : { count: current.count + 1, resetAt: current.resetAt }

  rateBuckets.set(key, bucket)

  if (bucket.count <= limit) return null

  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  return NextResponse.json(
    {
      online: false,
      dataQuality: 'rate-limited',
      error: 'rate-limit-exceeded',
      retryAfterSeconds,
      note: 'Proteção temporária contra abuso. Tente novamente após o intervalo indicado.',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'Cache-Control': 'no-store',
      },
    }
  )
}

export function isCircuitOpen(
  provider: string,
  options: { failureThreshold?: number; cooldownMs?: number } = {}
): boolean {
  const failureThreshold = options.failureThreshold ?? 3
  const cooldownMs = options.cooldownMs ?? 60_000
  const state = circuits.get(provider)
  if (!state || state.failures < failureThreshold || state.openedAt === null) return false

  if (Date.now() - state.openedAt >= cooldownMs) {
    circuits.set(provider, { failures: 0, openedAt: null })
    return false
  }

  return true
}

export function recordProviderSuccess(provider: string) {
  circuits.set(provider, { failures: 0, openedAt: null })
}

export function recordProviderFailure(
  provider: string,
  options: { failureThreshold?: number } = {}
) {
  const failureThreshold = options.failureThreshold ?? 3
  const current = circuits.get(provider) || { failures: 0, openedAt: null }
  const failures = current.failures + 1
  circuits.set(provider, {
    failures,
    openedAt: failures >= failureThreshold ? Date.now() : current.openedAt,
  })
}

export function circuitUnavailable(provider: string, source: string, sourceUrl: string) {
  return NextResponse.json(
    {
      online: false,
      dataQuality: 'temporarily-unavailable',
      error: 'provider-circuit-open',
      provider,
      source,
      sourceUrl,
      fetchedAt: new Date().toISOString(),
      note: 'A fonte falhou repetidamente e foi pausada por alguns instantes para proteger o app e o serviço externo. Cache válido pode continuar sendo usado pelo cliente.',
    },
    {
      status: 503,
      headers: {
        'Retry-After': '60',
        'Cache-Control': 'no-store',
      },
    }
  )
}
