'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Activity,
  ChevronRight,
  Compass,
  Download,
  Leaf,
  Map as MapIcon,
  MapPin,
  Menu,
  Moon,
  MoreHorizontal,
  QrCode,
  Satellite,
  Shield,
  Siren,
  Sun,
  Wifi,
  WifiOff,
  Wrench,
  Zap,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { EmergencySOS } from '@/components/aussy/emergency-sos'
import { InmetAlerts } from '@/components/aussy/inmet-alerts'
import { NetworkMonitor } from '@/components/aussy/network-monitor'
import { NoSignalWizard } from '@/components/aussy/no-signal-wizard'
import { OfflineManager } from '@/components/aussy/offline-manager'
import { QrLocation } from '@/components/aussy/qr-location'
import { QuickShare } from '@/components/aussy/quick-share'
import { RegulatoryInfo } from '@/components/aussy/regulatory-info'
import { ShakeToSOS } from '@/components/aussy/shake-to-sos'
import {
  LazyAnaRios,
  LazyCemadenAlerts,
  LazyCompassAltimeter,
  LazyConstellationInfo,
  LazyCoverageMap,
  LazyCptecSatellite,
  LazyDefesaCivil,
  LazyEarthquakesCard,
  LazyEmergencyContacts,
  LazyEonetCard,
  LazyFaunaProtocols,
  LazyGpsTrail,
  LazyInmetStations,
  LazyMedicalCardQR,
  LazyMeshNetwork,
  LazyMultilingualPhrases,
  LazyOfflineMap,
  LazySatelliteTracker,
  LazySurvivalTools,
  LazyWeatherForecast,
} from '@/components/aussy/lazy'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useNetworkStatus } from '@/hooks/use-network'
import { toast } from 'sonner'

type TabKey =
  | 'home'
  | 'emergency'
  | 'clima'
  | 'mapa'
  | 'natureza'
  | 'satellites'
  | 'sensores'
  | 'defesa'
  | 'tools'

interface TabDef {
  key: TabKey
  label: string
  short: string
  icon: typeof Activity
  color: string
  primary: boolean
}

const GOLD = '#D9A76A'

const TABS: TabDef[] = [
  { key: 'home', label: 'Início', short: 'Início', icon: Activity, color: 'text-[#D9A76A]', primary: true },
  { key: 'emergency', label: 'Emergência', short: 'SOS', icon: Siren, color: 'text-red-500', primary: true },
  { key: 'mapa', label: 'Mapa', short: 'Mapa', icon: MapIcon, color: 'text-[#D9A76A]', primary: true },
  { key: 'clima', label: 'Clima e alertas', short: 'Alertas', icon: Shield, color: 'text-[#D9A76A]', primary: true },
  { key: 'natureza', label: 'Natureza', short: 'Natureza', icon: Leaf, color: 'text-[#D9A76A]', primary: false },
  { key: 'satellites', label: 'Satélites', short: 'Satélites', icon: Satellite, color: 'text-[#D9A76A]', primary: false },
  { key: 'sensores', label: 'Sensores', short: 'Sensores', icon: Compass, color: 'text-[#D9A76A]', primary: false },
  { key: 'defesa', label: 'Defesa Civil', short: 'Defesa', icon: Shield, color: 'text-[#D9A76A]', primary: false },
  { key: 'tools', label: 'Ferramentas', short: 'Tools', icon: Wrench, color: 'text-[#D9A76A]', primary: false },
]

const PRIMARY_TABS = TABS.filter((tab) => tab.primary)
const MORE_TABS = TABS.filter((tab) => !tab.primary)

export default function Home() {
  const [tab, setTab] = useState<TabKey>('home')
  const [moreOpen, setMoreOpen] = useState(false)
  const [qrLocOpen, setQrLocOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [cityName, setCityName] = useState<string | null>(null)
  const [themeMounted, setThemeMounted] = useState(false)

  const network = useNetworkStatus()
  const { point, detect, loading: geoLoading } = useGeolocation()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setThemeMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const requestedTab = params.get('tab') as TabKey
    if (requestedTab && TABS.some((item) => item.key === requestedTab)) setTab(requestedTab)
  }, [])

  useEffect(() => {
    const handler = (event: any) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    detect()
  }, [detect])

  useEffect(() => {
    if (point?.lat == null || point?.lon == null) return
    let cancelled = false
    fetch(`/api/geocode?lat=${point.lat}&lon=${point.lon}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data.city) setCityName(data.city)
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [point?.lat, point?.lon])

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      toast.success('Aussy Ontech instalado!', {
        description: 'Acesso rápido e recursos preparados para uso offline.',
      })
    }
    setInstallPrompt(null)
  }

  const handleTabClick = useCallback((nextTab: TabKey) => {
    setTab(nextTab)
    setMoreOpen(false)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
  }

  const LocationPending = () => (
    <div className="rounded-xl border border-[#D9A76A]/25 bg-[#D9A76A]/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#D9A76A]" />
        <div>
          <div className="font-semibold">Aguardando localização válida</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            O Aussy não assume uma cidade padrão. Autorize o GPS ou reutilize uma posição salva para liberar os módulos dependentes de localização.
          </p>
        </div>
      </div>
    </div>
  )

  const HomeHero = () => {
    const locationTitle = cityName || (point ? 'Localização precisa' : 'Localização pendente')
    const locationMeta = point
      ? `${point.lat.toFixed(4)}°, ${point.lon.toFixed(4)}°`
      : 'Autorize o GPS para localizar você com precisão.'

    const exploreItems: Array<{ label: string; icon: typeof Activity; action: () => void }> = [
      { label: 'Mapa', icon: MapIcon, action: () => handleTabClick('mapa') },
      { label: 'Alertas', icon: Shield, action: () => handleTabClick('clima') },
      { label: 'Defesa Civil', icon: Shield, action: () => handleTabClick('defesa') },
      { label: 'Sensores', icon: Compass, action: () => handleTabClick('sensores') },
      { label: 'Satélites', icon: Satellite, action: () => handleTabClick('satellites') },
      { label: 'Natureza', icon: Leaf, action: () => handleTabClick('natureza') },
      { label: 'Ferramentas', icon: Wrench, action: () => handleTabClick('tools') },
      { label: 'Mais', icon: MoreHorizontal, action: () => setMoreOpen(true) },
    ]

    return (
      <section className="relative isolate overflow-hidden rounded-2xl border border-border/55 bg-card/20 px-4 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-12">
        <div className="pointer-events-none absolute -right-28 top-10 h-[420px] w-[420px] rounded-full border border-[#D9A76A]/[0.055]" />
        <div className="pointer-events-none absolute -right-12 top-28 h-[300px] w-[300px] rounded-full border border-[#D9A76A]/[0.045]" />
        <div className="pointer-events-none absolute right-10 top-36 select-none text-[250px] font-black leading-none text-[#D9A76A]/[0.025]">A</div>

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="font-mono-jet text-[10px] uppercase tracking-[0.32em] text-[#D9A76A]">AUSSY · SISTEMA DE SEGURANÇA</p>
            <h1 className="mt-7 text-[clamp(2.6rem,9vw,6.6rem)] font-semibold leading-[0.92] tracking-[-0.055em]">
              AUSSY
              <span className="mt-1 block font-light">ESTÁ COM VOCÊ<span className="text-[#D9A76A]">.</span></span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              Tecnologia e informação em tempo real para proteger o que mais importa.
            </p>
          </div>

          <div className="mt-9 grid items-stretch gap-3 md:grid-cols-[180px_1fr]">
            <button
              onClick={() => handleTabClick('emergency')}
              className="group flex min-h-36 items-center justify-center rounded-xl border border-[#D9A76A]/55 bg-black/[0.08] p-5 transition hover:border-[#D9A76A] dark:bg-black/25"
              aria-label="Abrir emergência SOS"
            >
              <span className="flex h-28 w-28 items-center justify-center rounded-full border border-[#D9A76A]/70 text-3xl font-light tracking-[0.16em] text-[#D9A76A] transition group-hover:scale-[1.03]">SOS</span>
            </button>
            <button
              onClick={() => handleTabClick('emergency')}
              className="group flex min-h-36 items-center justify-between rounded-xl border border-border/70 bg-background/35 px-6 py-5 text-left transition hover:border-[#D9A76A]/55 sm:px-8"
            >
              <div>
                <div className="text-sm font-medium uppercase tracking-[0.16em] sm:text-base">Toque para emergência</div>
                <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground sm:text-sm">Acesse chamadas oficiais, alarme local e protocolos de emergência.</p>
              </div>
              <ChevronRight className="ml-4 h-5 w-5 flex-shrink-0 text-[#D9A76A] transition group-hover:translate-x-1" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-border/70 bg-background/35 sm:grid-cols-4">
            <button onClick={() => handleTabClick('clima')} className="min-h-28 border-b border-r border-border/60 p-4 text-left transition hover:bg-[#D9A76A]/5 sm:border-b-0">
              <Shield className="h-5 w-5 text-[#D9A76A]" />
              <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Alertas</div>
              <div className="mt-1 text-sm font-semibold">Oficiais</div>
              <div className="mt-1 text-[10px] text-muted-foreground">Abrir monitoramento</div>
            </button>
            <button onClick={() => handleTabClick('clima')} className="min-h-28 border-b border-border/60 p-4 text-left transition hover:bg-[#D9A76A]/5 sm:border-b-0 sm:border-r">
              <Sun className="h-5 w-5 text-foreground" />
              <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Clima</div>
              <div className="mt-1 text-sm font-semibold">Consultar</div>
              <div className="mt-1 text-[10px] text-muted-foreground">Dados pela localização</div>
            </button>
            <div className="min-h-28 border-r border-border/60 p-4">
              {network.online ? <Wifi className="h-5 w-5 text-foreground" /> : <WifiOff className="h-5 w-5 text-red-500" />}
              <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Rede</div>
              <div className="mt-1 text-sm font-semibold">{network.online ? 'Conectada' : 'Offline'}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">Estado real do dispositivo</div>
            </div>
            <button onClick={() => detect()} disabled={geoLoading} className="min-h-28 p-4 text-left transition hover:bg-[#D9A76A]/5">
              <MapPin className={`h-5 w-5 ${point ? 'text-[#D9A76A]' : 'text-muted-foreground'} ${geoLoading ? 'animate-pulse' : ''}`} />
              <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">GPS</div>
              <div className="mt-1 text-sm font-semibold">{point ? 'Ativo' : 'Aguardando'}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">{geoLoading ? 'Atualizando posição' : 'Toque para atualizar'}</div>
            </button>
          </div>

          <div className="relative mt-4 overflow-hidden rounded-xl border border-border/70 bg-background/35 p-5 sm:p-7">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[52%] opacity-40 [background-image:linear-gradient(35deg,transparent_46%,rgba(217,167,106,.12)_47%,transparent_48%),linear-gradient(145deg,transparent_46%,rgba(255,255,255,.08)_47%,transparent_48%)] [background-size:38px_38px]" />
            <div className="relative grid gap-7 sm:grid-cols-[1fr_.85fr] sm:items-center">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#D9A76A]">Onde estou</p>
                <h2 className="mt-3 text-2xl font-medium tracking-tight">{locationTitle}</h2>
                <p className="mt-2 font-mono-jet text-[11px] text-muted-foreground">{locationMeta}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={() => handleTabClick('mapa')} className="inline-flex items-center gap-2 rounded-lg border border-[#D9A76A]/35 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition hover:bg-[#D9A76A]/8">Ver no mapa <ChevronRight className="h-3.5 w-3.5 text-[#D9A76A]" /></button>
                  <button onClick={() => setQrLocOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-border/65 px-4 py-2 text-xs text-muted-foreground transition hover:border-[#D9A76A]/35 hover:text-foreground"><QrCode className="h-3.5 w-3.5" /> QR localização</button>
                </div>
              </div>
              <button onClick={() => handleTabClick('mapa')} className="relative mx-auto flex h-36 w-full max-w-xs items-center justify-center rounded-xl border border-border/55 bg-card/20" aria-label="Abrir mapa">
                <span className="absolute h-24 w-24 rounded-full border border-[#D9A76A]/25" />
                <span className="absolute h-16 w-16 rounded-full border border-[#D9A76A]/40" />
                <span className="h-4 w-4 rounded-full border-4 border-background bg-[#D9A76A] shadow-sm" />
              </button>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[#D9A76A]">Explorar</p>
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border/70 bg-background/30 sm:grid-cols-4">
              {exploreItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className={`flex min-h-24 items-center gap-3 border-border/55 p-4 text-left transition hover:bg-[#D9A76A]/5 ${index % 2 === 0 ? 'border-r' : ''} ${index < 6 ? 'border-b' : ''} sm:border-r sm:[&:nth-child(4n)]:border-r-0 sm:[&:nth-child(n+5)]:border-b-0`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 text-[#D9A76A]" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    )
  }

  const tabContent: Record<TabKey, React.ReactNode> = {
    home: <div className="space-y-5"><HomeHero /><div className="grid gap-4 xl:grid-cols-2"><NoSignalWizard /><OfflineManager /></div><NetworkMonitor /></div>,
    emergency: <div className="space-y-4"><EmergencySOS observerLat={point?.lat} observerLon={point?.lon} />{!point && <LocationPending />}<ShakeToSOS /><LazyMedicalCardQR /><LazyEmergencyContacts /><LazyGpsTrail /><LazyMultilingualPhrases /></div>,
    clima: <div className="space-y-4">{point ? <><LazyWeatherForecast lat={point.lat} lon={point.lon} /><LazyInmetStations lat={point.lat} lon={point.lon} /><LazyEarthquakesCard lat={point.lat} lon={point.lon} /></> : <LocationPending />}<LazyCptecSatellite /><InmetAlerts /><LazyCemadenAlerts /></div>,
    mapa: <div className="space-y-4">{point ? <><LazyOfflineMap initialLat={point.lat} initialLon={point.lon} /><LazyCoverageMap observerLat={point.lat} observerLon={point.lon} /></> : <LocationPending />}<LazyMeshNetwork /><RegulatoryInfo /></div>,
    natureza: <div className="space-y-4"><LazyCemadenAlerts />{point ? <><LazyAnaRios lat={point.lat} lon={point.lon} /><LazyEonetCard lat={point.lat} lon={point.lon} /></> : <LocationPending />}<LazyFaunaProtocols /></div>,
    satellites: <div className="space-y-4">{point ? <LazySatelliteTracker observerLat={point.lat} observerLon={point.lon} /> : <LocationPending />}<LazyCptecSatellite /><LazyConstellationInfo /></div>,
    sensores: <div className="space-y-4">{point ? <LazyCompassAltimeter observerLat={point.lat} observerLon={point.lon} /> : <LocationPending />}<LazyGpsTrail /></div>,
    defesa: <div className="space-y-4"><LazyDefesaCivil /><LazyCemadenAlerts /><LazyEmergencyContacts /></div>,
    tools: <div className="space-y-4"><LazySurvivalTools /><LazyMultilingualPhrases /><RegulatoryInfo /></div>,
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => handleTabClick('home')} className="flex min-w-0 items-center gap-3 text-left">
            <img src="/icon-192.svg" alt="Aussy Ontech" className="h-9 w-9 flex-shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-[0.38em]">AUSSY</div>
              <div className="mt-0.5 truncate text-[8px] uppercase tracking-[0.22em] text-muted-foreground">Sistema de segurança</div>
            </div>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-3 border-r border-border/60 pr-3 sm:flex">
              <div>
                <div className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] ${network.online ? 'text-emerald-500' : 'text-red-500'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${network.online ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {network.online ? 'Online' : 'Offline'}
                </div>
                <div className="mt-0.5 max-w-32 truncate text-xs">{cityName || 'Brasil'}</div>
                <button onClick={() => detect()} disabled={geoLoading} className="mt-0.5 flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"><MapPin className="h-2.5 w-2.5" /> {point ? 'GPS ativo' : geoLoading ? 'GPS buscando' : 'GPS pendente'}</button>
              </div>
            </div>

            {installPrompt && <Button onClick={handleInstall} size="sm" variant="ghost" className="hidden h-9 px-2 text-xs md:flex"><Download className="mr-1 h-3.5 w-3.5" /> Instalar</Button>}

            <button onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 transition hover:border-[#D9A76A]/55" aria-label="Alternar tema claro e escuro">
              {themeMounted && resolvedTheme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-[#D9A76A]" />}
            </button>
            <button onClick={() => setMoreOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent transition hover:border-border/70" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-t border-border/35 px-4 py-1.5 sm:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            <span className={network.online ? 'text-emerald-500' : 'text-red-500'}>● {network.online ? 'Online' : 'Offline'}</span>
            <span className="truncate">{cityName || (point ? 'GPS ativo' : 'Localização pendente')}</span>
            <button onClick={() => detect()} disabled={geoLoading} className="flex items-center gap-1"><Zap className={`h-3 w-3 ${geoLoading ? 'animate-pulse' : ''}`} /> GPS</button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-3 py-4 pb-28 sm:px-5 sm:py-6 lg:px-7 lg:pb-8">{tabContent[tab]}</main>

      <footer className="border-t border-border/40 px-4 py-5 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground">AIX8C - Uma tecnologia do grupo volponi.tech ! <strong>@𝗟𝗼𝗿𝗲𝗻𝘇𝗮 𝗩𝗼𝗹𝗽𝗼𝗻𝗶 🚀</strong> #01 em tecnologia no Brasil</p>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/75">Aussy Ontech combina recursos locais, fontes externas e cache de última resposta válida. Não substitui serviços oficiais de emergência.</p>
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
          {PRIMARY_TABS.map((item) => {
            const Icon = item.icon
            const active = tab === item.key
            return (
              <button key={item.key} onClick={() => handleTabClick(item.key)} className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-[9px] uppercase tracking-[0.08em] transition ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {active && <span className={`absolute left-1/2 top-0 h-px w-10 -translate-x-1/2 ${item.key === 'emergency' ? 'bg-red-500' : 'bg-[#D9A76A]'}`} />}
                <Icon className={`h-5 w-5 ${active ? item.color : ''}`} />
                <span>{item.short}</span>
              </button>
            )
          })}
          <button onClick={() => setMoreOpen(true)} className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-[9px] uppercase tracking-[0.08em] ${MORE_TABS.some((item) => item.key === tab) ? 'text-foreground' : 'text-muted-foreground'}`}>
            {MORE_TABS.some((item) => item.key === tab) && <span className="absolute left-1/2 top-0 h-px w-10 -translate-x-1/2 bg-[#D9A76A]" />}
            <MoreHorizontal className="h-5 w-5" />
            <span>Mais</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Menu className="h-4 w-4 text-[#D9A76A]" />Navegação Aussy</SheetTitle>
            <SheetDescription>Acesse todos os módulos sem perder o contexto atual.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 grid grid-cols-2 gap-2 pb-6 sm:grid-cols-3">
            {TABS.map((item) => {
              const Icon = item.icon
              const active = tab === item.key
              return (
                <button key={item.key} onClick={() => handleTabClick(item.key)} className={`rounded-xl border p-4 text-left transition ${active ? 'border-[#D9A76A]/50 bg-[#D9A76A]/7' : 'border-border/60 bg-secondary/20 hover:border-[#D9A76A]/30'}`}>
                  <Icon className={`h-5 w-5 ${item.key === 'emergency' ? 'text-red-500' : 'text-[#D9A76A]'}`} />
                  <div className="mt-3 text-sm font-semibold">{item.label}</div>
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>

      <QuickShare initialPoint={point} />
      <QrLocation open={qrLocOpen} onOpenChange={setQrLocOpen} initialPoint={point} />
    </div>
  )
}
