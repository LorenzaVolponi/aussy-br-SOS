import { NextResponse } from 'next/server'
import { BRAZIL_EMERGENCY_NUMBERS } from '@/lib/data/satellites'
import { EMERGENCY_PHRASES } from '@/lib/data/first-aid'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    country: 'Brasil',
    updated: '2026-07',
    source: 'Ministério da Saúde / ANATEL / Defesa Civil',
    numbers: BRAZIL_EMERGENCY_NUMBERS,
    phrases: EMERGENCY_PHRASES,
    smsBroadcast: {
      channel: 4370,
      name: 'CBBrasil',
      description: 'Canal oficial do Cell Broadcast Brasil — operadoras enviam alertas automaticamente. Não precisa de app.',
      carriers: ['Vivo', 'Claro', 'TIM', 'Algar'],
      status: 'Ativo desde 2024',
    },
    satelliteSos: {
      apple: {
        device: 'iPhone 14 ou superior',
        service: 'Emergency SOS via Satellite',
        cost: 'Grátis por 2 anos após compra, depois US$ 14.95/mês',
        coverage: 'Brasil: parcial (latitudes entre -55° e +55°)',
        howToActivate: 'Pressione botão lateral 5x ou segure lateral + volume. Siga instruções na tela.',
      },
      android: {
        device: 'Samsung Galaxy S22+ / S23+ / S24 / S25, Pixel 9+ (com Snapdragon Satellite)',
        service: 'Satellite SOS',
        cost: 'Grátis por 2 anos em alguns modelos',
        coverage: 'EUA, Europa, partes da América Latina',
        howToActivate: 'Configurações > Segurança e emergência > SOS via Satélite',
      },
      limitations: 'Nenhum smartphone Android/iPhone no Brasil suporta D2C brasileiro ainda (sem operadora parceira habilitada).',
    },
  })
}
