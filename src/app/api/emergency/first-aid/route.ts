import { NextResponse } from 'next/server'
import { FIRST_AID_GUIDES, EMERGENCY_KIT_CHECKLIST } from '@/lib/data/first-aid'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const category = searchParams.get('category')

  let guides = FIRST_AID_GUIDES
  if (id) {
    const found = guides.find((g) => g.id === id)
    if (!found) return NextResponse.json({ error: 'Guia não encontrado' }, { status: 404 })
    return NextResponse.json(found)
  }
  if (category) {
    guides = guides.filter((g) => g.category === category)
  }

  return NextResponse.json({
    source: 'SAMU / Cruz Vermelha / MS - protocolos públicos',
    updated: '2026-07',
    total: guides.length,
    guides,
    kitChecklist: EMERGENCY_KIT_CHECKLIST,
    disclaimer: 'Conteúdo educativo. Em emergência real, sempre ligue 192. Não substitui atendimento médico.',
  })
}
