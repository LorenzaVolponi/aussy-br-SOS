import { NextResponse } from 'next/server'

/**
 * API que busca alertas meteorológicos do INMET (Instituto Nacional de Meteorologia).
 * Endpoint público oficial: https://apitempo.inmet.gov.br/alerta/v1/
 *
 * Estratégia:
 * - Busca alertas ativos em todo o Brasil
 * - Se falhar (offline/timeout), retorna lista vazia com flag cached=false
 * - SW cacheia a resposta para uso offline
 */

export const dynamic = 'force-dynamic'
export const revalidate = 1800 // 30 minutos

interface InmetAlert {
  aviso: string
  evento: string
  severidade: string
  descricao: string
  inicio: string
  fim: string
  uf: string
  municipios?: string[]
  cor: string
}

export async function GET(request: Request) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    // INMET endpoint público — alertas ativos em todo Brasil
    const res = await fetch('https://apitempo.inmet.gov.br/alerta/v1/', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AussyOntech/1.0',
      },
      cache: 'no-store',
    })

    clearTimeout(timeout)

    if (!res.ok) {
      throw new Error(`INMET retornou ${res.status}`)
    }

    const raw: any[] = await res.json()

    // Normaliza resposta
    const alerts = (raw || []).map((a): InmetAlert => ({
      aviso: a.aviso || '',
      evento: a.evento || 'Evento meteorológico',
      severidade: a.severidade || '',
      descricao: a.descricao || '',
      inicio: a.inicio || '',
      fim: a.fim || '',
      uf: a.uf || '',
      municipios: Array.isArray(a.municipios) ? a.municipios : [],
      cor: a.cor || '#f59e0b',
    }))

    return NextResponse.json({
      alerts,
      total: alerts.length,
      cached: false,
      fetchedAt: new Date().toISOString(),
      source: 'INMET apitempo.inmet.gov.br',
    })
  } catch (e: any) {
    clearTimeout(timeout)

    // Offline ou erro: retorna estrutura vazia para cliente usar cache SW
    return NextResponse.json(
      {
        alerts: [],
        total: 0,
        cached: false,
        error: 'offline',
        message: 'Não foi possível buscar alertas do INMET. Verifique se há conexão.',
        fetchedAt: new Date().toISOString(),
      },
      { status: 200 } // 200 mesmo offline para SW poder cachear resposta vazia
    )
  }
}
