import { NextResponse } from 'next/server'
import { FIRST_AID_GUIDES, EMERGENCY_KIT_CHECKLIST } from '@/lib/data/first-aid'

export const runtime = 'nodejs'

const VERIFIED_AT = '2026-08-18'
const DATASET_SOURCES = [
  'American Heart Association — CPR & ECC Guidelines / Adult BLS 2025',
  'American Heart Association + American Red Cross — First Aid Guidelines 2024',
  'American Heart Association + American Academy of Pediatrics — Drowning Focused Update 2024',
  'Ministério da Saúde — SAMU 192 e acidentes por animais peçonhentos',
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const category = searchParams.get('category')

  let guides = FIRST_AID_GUIDES
  if (id) {
    const found = guides.find((g) => g.id === id)
    if (!found) return NextResponse.json({ error: 'Guia não encontrado' }, { status: 404 })
    return NextResponse.json({
      ...found,
      dataQuality: 'clinically-curated-static',
      disclaimer: 'Conteúdo educativo para primeiros socorros por leigos. Não substitui avaliação profissional. Em urgência ou emergência, acione o SAMU 192 e siga as orientações do regulador.',
    })
  }

  if (category) guides = guides.filter((g) => g.category === category)

  return NextResponse.json({
    dataQuality: 'clinically-curated-static',
    verifiedAt: VERIFIED_AT,
    sources: DATASET_SOURCES,
    total: guides.length,
    guides,
    kitChecklist: EMERGENCY_KIT_CHECKLIST,
    disclaimer: 'Conteúdo educativo para primeiros socorros por leigos. Não substitui avaliação profissional. Em urgência ou emergência, acione o SAMU 192 e siga as orientações do regulador.',
  })
}
