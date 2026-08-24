import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_MESSAGE = 500
const MAX_PATH = 200
const ALLOWED_KINDS = new Set(['client-error', 'global-error', 'unhandled-rejection', 'release-smoke'])

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  return value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) || null
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const body = await request.json()
    const kind = clean(body?.kind, 40)
    if (!kind || !ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ ok: false, requestId, error: 'invalid-kind' }, { status: 400 })
    }

    const event = {
      ts: new Date().toISOString(),
      requestId,
      kind,
      message: clean(body?.message, MAX_MESSAGE),
      digest: clean(body?.digest, 120),
      path: clean(body?.path, MAX_PATH),
      online: typeof body?.online === 'boolean' ? body.online : null,
      release: clean(process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'local', 80),
    }

    console.error(JSON.stringify({ service: 'aussy', event: 'client-telemetry', ...event }))
    return NextResponse.json({ ok: true, requestId }, { status: 202 })
  } catch {
    console.error(JSON.stringify({ service: 'aussy', event: 'telemetry-invalid-json', requestId, ts: new Date().toISOString() }))
    return NextResponse.json({ ok: false, requestId, error: 'invalid-json' }, { status: 400 })
  }
}
