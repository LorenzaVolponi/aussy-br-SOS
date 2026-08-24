'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useNetworkStatus } from '@/hooks/use-network'
import {
  ArrowRight,
  Compass,
  Download,
  MapPin,
  Radio,
  Satellite,
  ShieldAlert,
  Siren,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'

const commandActions = [
  {
    label: 'SOS imediato',
    description: 'Discagem, alarme local e protocolos de emergência.',
    href: '/?tab=emergency',
    icon: Siren,
    accent: 'text-red-300 border-red-500/40 bg-red-500/10',
  },
  {
    label: 'Mapa operacional',
    description: 'OSM, cobertura confiável e posição validada.',
    href: '/?tab=mapa',
    icon: MapPin,
    accent: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  },
  {
    label: 'Clima & risco',
    description: 'INMET, CPTEC/INPE, CEMADEN e alertas públicos.',
    href: '/?tab=clima',
    icon: ShieldAlert,
    accent: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  },
  {
    label: 'Satélites & sensores',
    description: 'TLE, bússola, altitude e leitura de contexto local.',
    href: '/?tab=satellites',
    icon: Satellite,
    accent: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  },
]

export default function CommandPage() {
  const network = useNetworkStatus()
  const { point, detect, loading } = useGeolocation()
  const [installPrompt, setInstallPrompt] = useState<any>(null)

  useEffect(() => {
    const handler = (event: any) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0f1626] text-[#f6f2e9]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-[#d9a76a]/20 pb-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#d9a76a]/40 bg-[#d9a76a]/10">
              <img src="/icon-192.svg" alt="Aussy Ontech" className="h-7 w-7" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black uppercase tracking-[0.28em] text-[#f6f2e9]">Aussy SOS</span>
              <span className="block text-[10px] uppercase tracking-[0.36em] text-[#d9a76a]">Volponi command surface</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`h-8 rounded-full border px-3 font-mono-jet text-[10px] uppercase tracking-[0.18em] ${
                network.online
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                  : 'border-red-400/40 bg-red-400/10 text-red-300'
              }`}
            >
              {network.online ? <Wifi className="mr-1.5 h-3 w-3" /> : <WifiOff className="mr-1.5 h-3 w-3" />}
              {network.online ? 'online' : 'offline'}
            </Badge>
            <Button asChild variant="outline" className="hidden h-8 rounded-full border-[#d9a76a]/30 bg-transparent px-4 text-[11px] uppercase tracking-[0.18em] text-[#d9a76a] hover:bg-[#d9a76a]/10 sm:inline-flex">
              <Link href="/">Sistema completo</Link>
            </Button>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-6 py-6 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10">
          <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#d9a76a]/20 bg-[#121a2d] p-6 shadow-2xl shadow-black/30 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(90deg, #d9a76a 1px, transparent 1px), linear-gradient(180deg, #d9a76a 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
            <div className="pointer-events-none absolute right-6 top-6 h-40 w-40 rounded-full border border-[#d9a76a]/20" />
            <div className="pointer-events-none absolute bottom-8 right-12 h-20 w-20 rounded-full border border-[#f6f2e9]/10" />

            <div className="mb-8 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full border-[#d9a76a]/35 bg-[#d9a76a]/10 px-3 py-1 font-mono-jet text-[10px] uppercase tracking-[0.22em] text-[#d9a76a]">
                emergency intelligence
              </Badge>
              <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 px-3 py-1 font-mono-jet text-[10px] uppercase tracking-[0.22em] text-white/70">
                offline-first · trust-labeled
              </Badge>
            </div>

            <div className="max-w-3xl">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.48em] text-[#d9a76a]">single screen / high consequence mode</p>
              <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-[-0.08em] text-[#f6f2e9] sm:text-6xl lg:text-7xl">
                comando para quando o sinal falha.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#f6f2e9]/72 sm:text-lg">
                Uma porta de entrada mais forte para o Aussy: emergência, localização, clima, mapas e sensores em uma superfície só — premium, direta e sem prometer dado que o sistema não verificou.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="font-mono-jet text-[10px] uppercase tracking-[0.22em] text-white/45">posição</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {point ? `${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}` : 'aguardando GPS'}
                </div>
                <div className="mt-1 text-[11px] text-white/45">{point ? point.source : 'sem localização padrão'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="font-mono-jet text-[10px] uppercase tracking-[0.22em] text-white/45">rede</div>
                <div className="mt-2 text-sm font-semibold text-white">{network.online ? 'canal ativo' : 'modo contingência'}</div>
                <div className="mt-1 text-[11px] text-white/45">última cópia válida quando existir</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="font-mono-jet text-[10px] uppercase tracking-[0.22em] text-white/45">contrato</div>
                <div className="mt-2 text-sm font-semibold text-white">sem dado fabricado</div>
                <div className="mt-1 text-[11px] text-white/45">fontes e simulações rotuladas</div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => detect()} disabled={loading} className="h-11 rounded-full bg-[#d9a76a] px-5 text-xs font-black uppercase tracking-[0.2em] text-[#121a2d] hover:bg-[#e7bc82]">
                <Zap className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'detectando' : 'ativar GPS'}
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-white/15 bg-white/[0.03] px-5 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-white/10">
                <Link href="/?tab=emergency">
                  abrir SOS
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {installPrompt && (
                <Button onClick={handleInstall} variant="outline" className="h-11 rounded-full border-[#d9a76a]/40 bg-transparent px-5 text-xs font-bold uppercase tracking-[0.2em] text-[#d9a76a] hover:bg-[#d9a76a]/10">
                  <Download className="mr-2 h-4 w-4" />
                  instalar PWA
                </Button>
              )}
            </div>
          </section>

          <aside className="grid gap-4">
            <div className="rounded-[2rem] border border-white/10 bg-[#f6f2e9] p-5 text-[#121a2d] shadow-2xl shadow-black/25 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono-jet text-[10px] uppercase tracking-[0.28em] text-[#121a2d]/50">functional surface</p>
                  <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.06em]">Escolha a missão</h2>
                </div>
                <Compass className="h-7 w-7 text-[#d9a76a]" />
              </div>

              <div className="grid gap-3">
                {commandActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="group flex items-center gap-4 rounded-2xl border border-[#121a2d]/10 bg-white/60 p-4 transition hover:-translate-y-0.5 hover:border-[#d9a76a]/60 hover:bg-white"
                    >
                      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${action.accent}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black uppercase tracking-[-0.02em]">{action.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-[#121a2d]/58">{action.description}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#121a2d]/35 transition group-hover:translate-x-1 group-hover:text-[#d9a76a]" />
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#d9a76a]/25 bg-[#171f34] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#d9a76a]/35 bg-[#d9a76a]/10">
                  <Radio className="h-5 w-5 text-[#d9a76a]" />
                </span>
                <div>
                  <p className="font-mono-jet text-[10px] uppercase tracking-[0.24em] text-[#d9a76a]">design contract</p>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    Identidade inspirada em cartão premium: navy profundo, areia fosca, acento metálico seco, grid rígido, tipografia alta e nenhum brilho genérico. Valor sem enfeite. Função antes do ruído.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
