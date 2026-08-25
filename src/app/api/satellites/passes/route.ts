import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 3600

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

function boundedHours(value: string | null): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 6
  return Math.min(Math.max(parsed, 1), 24)
}

/**
 * Próximas passagens exigem propagação orbital adequada (ex.: SGP4) usando TLE
 * recente. A implementação anterior usava Math.random() e não era uma previsão.
 * Enquanto um propagador validado não estiver integrado, a rota retorna estado
 * explícito de indisponibilidade em vez de fabricar janelas de visibilidade.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseCoordinate(searchParams.get('lat'), -90, 90)
  const lon = parseCoordinate(searchParams.get('lon'), -180, 180)
  const hours = boundedHours(searchParams.get('hours'))

  if (lat === null || lon === null) {
    return NextResponse.json({
      observer: null,
      timestamp: new Date().toISOString(),
      source: 'CelesTrak/NORAD + propagação SGP4 requerida',
      dataQuality: 'observer-required',
      periodHours: hours,
      passes: [],
      total: 0,
      next6h: {
        starlinkPasses: null,
        iridiumPasses: null,
        totalWindows: null,
      },
      error: 'observer-required',
      note: 'Latitude e longitude válidas são obrigatórias. Nenhuma cidade padrão é assumida e nenhuma passagem foi calculada.',
    }, { status: 400 })
  }

  return NextResponse.json({
    observer: { lat, lon },
    timestamp: new Date().toISOString(),
    source: 'CelesTrak/NORAD requerido + propagação SGP4 ainda não integrada',
    dataQuality: 'unavailable',
    periodHours: hours,
    passes: [],
    total: 0,
    next6h: {
      starlinkPasses: null,
      iridiumPasses: null,
      totalWindows: null,
    },
    error: 'unavailable',
    note: 'Nenhuma passagem é simulada. Integre um propagador SGP4 validado antes de oferecer horários/elevações de passagem.',
  }, { status: 503 })
}
