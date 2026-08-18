import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 3600

/**
 * Próximas passagens exigem propagação orbital adequada (ex.: SGP4) usando TLE
 * recente. A implementação anterior usava Math.random() e não era uma previsão.
 * Enquanto um propagador validado não estiver integrado, a rota retorna estado
 * explícito de indisponibilidade em vez de fabricar janelas de visibilidade.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '-15.7801')
  const lon = parseFloat(searchParams.get('lon') || '-47.9292')
  const hours = Math.min(Math.max(parseFloat(searchParams.get('hours') || '6'), 1), 24)

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
