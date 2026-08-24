'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
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
  Compass,
  Download,
  Globe2,
  HeartPulse,
  Leaf,
  Map as MapIcon,
  MapPin,
  Menu,
  MoreHorizontal,
  QrCode,
  Radio,
  Satellite,
  Shield,
  Siren,
  Sun,
  Wifi,
  WifiOff,
  Wrench,
  Zap,
} from 'lucide-react'
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
import { useOrientation } from '@/hooks/use-orientation'
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

const TABS: TabDef[] = [
  { key: 'home', label: 'Início', short: 'Início', icon: Activity, color: 'text-signal', primary: true },
  { key: 'emergency', label: 'Emergência', short: 'SOS', icon: Siren, color: 'text-red-400', primary: true },
  { key: 'clima', label: 'Clima', short: 'Clima', icon: Sun, color: 'text-cyan-400', primary: true },
  { key: 'mapa', label: 'Mapa', short: 'Mapa', icon: MapIcon, color: 'text-emerald-400', primary: true },
  { key: 'natureza', label: 'Natureza', short: 'Natureza', icon: Leaf, color: 'text-orange-400', primary: false },
  { key: 'satellites', label: 'Satélites', short: 'Satélites', icon: Satellite, color: 'text-cyan-300', primary: false },
  { key: 'sensores', label: 'Sensores', short: 'Sensores', icon: Compass, color: 'text-emerald-300', primary: false },
  { key: 'defesa', label: 'Defesa Civil', short: 'Defesa', icon: Shield, color: 'text-amber-300', primary: false },
  { key: 'tools', label: 'Ferramentas', short: 'Tools', icon: Wrench, color: 'text-amber-400', primary: false },
]

const PRIMARY_TABS = TABS.filter((tab) => tab.primary)
const MORE_TABS = TABS.filter((tab) => !tab.primary)

export default function Home() {
  const [tab, setTab] = useState<TabKey>('home')
  const [moreOpen, setMoreOpen] = useState(false)
  const [qrLocOpen, setQrLocOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [cityName, setCityName] = useState<string | null>(null)

  const network = useNetworkStatus()
  const { point, detect, loading: geoLoading } = useGeolocation()
  const orientation = useOrientation()
  const useSidebar = orientation.isLandscape || orientation.isTablet || orientation.isWide

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

  const LocationPending = () => (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <div className="font-semibold">Aguardando localização válida</div>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/70">
            O Aussy não assume uma cidade padrão. Autorize o GPS ou reutilize uma posição salva para liberar os módulos dependentes de localização.
          </p>
        </div>
      </div>
    </div>
  )

  const HomeHero = () => (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_70%_20%,rgba(16,185,129,0.14),transparent_32%),radial-gradient(circle_at_10%_0%,rgba(239,68,68,0.16),transparent_28%),linear-gradient(145deg,rgba(7,12,20,0.98),rgba(5,10,18,0.94))] p-5 sm:p-7 shadow-2xl shadow-black/30">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative grid gap-6 xl:grid-cols-[1.05fr_.95fr] xl:items-stretch">
        <div className="flex flex-col justify-between gap-6">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Badge className="border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/10">
                Conexão que salva vidas
              </Badge>
              <Badge variant="outline" className={network.online ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}>
                {network.online ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
                {network.online ? 'Sistema online' : 'Modo offline'}
              </Badge>
            </div>

            <div className="max-w-2xl">
              <p className="mb-3 font-mono-jet text-xs uppercase tracking-[0.28em] text-muted-foreground">AUSS Y · S.O.S. BRASIL</p>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                AUSS Y <span className="text-red-500">ESTÁ</span> COM VOCÊ.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                Informação crítica, localização, modo offline e ferramentas de resiliência reunidas em uma única experiência. Tecnologia que conecta. Informação que salva.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Rede</div>
              <div className="mt-2 text-lg font-bold">{network.online ? 'Conectada' : 'Offline'}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">Estado real do dispositivo</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Localização</div>
              <div className="mt-2 truncate text-lg font-bold">{cityName || (point ? 'Coordenadas ativas' : 'Aguardando GPS')}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">Sem cidade inventada</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Arquitetura</div>
              <div className="mt-2 text-lg font-bold">Offline-first</div>
              <p className="mt-1 text-[11px] text-muted-foreground">Última cópia válida em cache</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1.4fr_.8fr_.8fr]">
            <button onClick={() => handleTabClick('emergency')} className="group rounded-2xl border border-red-500/50 bg-gradient-to-br from-red-500/25 to-red-950/20 p-5 text-left transition hover:-translate-y-0.5 hover:border-red-400/70">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-400/50 bg-red-500/20 shadow-lg shadow-red-500/20">
                  <Siren className="h-7 w-7 text-red-300" />
                </div>
                <div>
                  <div className="text-xl font-black text-red-300">S.O.S. IMEDIATO</div>
                  <div className="mt-1 text-xs text-red-100/65">Chamadas oficiais, alarme local e protocolos de emergência.</div>
                </div>
              </div>
            </button>
            <button onClick={() => setQrLocOpen(true)} className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 text-left transition hover:bg-violet-500/15">
              <QrCode className="h-5 w-5 text-violet-300" />
              <div className="mt-3 font-bold">QR Local</div>
              <p className="mt-1 text-[11px] text-muted-foreground">Compartilhe sua posição</p>
            </button>
            <button onClick={() => handleTabClick('mapa')} className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-left transition hover:bg-cyan-500/15">
              <MapIcon className="h-5 w-5 text-cyan-300" />
              <div className="mt-3 font-bold">Mapa & Cobertura</div>
              <p className="mt-1 text-[11px] text-muted-foreground">OSM, Wi-Fi e posição</p>
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <button onClick={() => handleTabClick('clima')} className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-5 text-left transition hover:border-amber-400/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300">Alertas meteorológicos</p>
                <h3 className="mt-2 text-xl font-bold">INMET + clima local</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Consulte alertas oficiais e condições vinculadas à sua localização quando disponíveis.</p>
              </div>
              <Sun className="h-6 w-6 text-amber-300" />
            </div>
          </button>

          <button onClick={() => handleTabClick('defesa')} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-5 text-left transition hover:border-emerald-400/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Defesa & resiliência</p>
                <h3 className="mt-2 text-xl font-bold">Canais oficiais em um toque</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Defesa Civil, números de emergência e orientações críticas sem criar falsa sensação de conectividade.</p>
              </div>
              <Shield className="h-6 w-6 text-emerald-300" />
            </div>
          </button>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:col-span-2 xl:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Acesso rápido</p>
                <h3 className="mt-1 text-lg font-bold">Tudo que importa, sem ruído</h3>
              </div>
              <Radio className="h-5 w-5 text-signal" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[['Sem sinal?', 'home', Radio], ['Satélites', 'satellites', Satellite], ['Sensores', 'sensores', Compass], ['Ferramentas', 'tools', Wrench]].map(([label, key, Icon]) => (
                <button key={String(key)} onClick={() => handleTabClick(key as TabKey)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-left text-xs transition hover:bg-white/5">
                  <Icon className="h-4 w-4 text-signal" />
                  <span className="font-medium">{String(label)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )

  const tabContent: Record<TabKey, React.ReactNode> = {
    home: (
      <div className="space-y-4">
        <HomeHero />
        <div className="grid gap-4 xl:grid-cols-2">
          <NoSignalWizard />
          <OfflineManager />
        </div>
        {point ? <LazyWeatherForecast lat={point.lat} lon={point.lon} /> : <LocationPending />}
        <InmetAlerts />
        <LazyCemadenAlerts />
        <NetworkMonitor />
      </div>
    ),
    emergency: (
      <div className="space-y-4">
        <EmergencySOS observerLat={point?.lat} observerLon={point?.lon} />
        {!point && <LocationPending />}
        <ShakeToSOS />
        <LazyMedicalCardQR />
        <LazyEmergencyContacts />
        <LazyGpsTrail />
        <LazyMultilingualPhrases />
      </div>
    ),
    clima: (
      <div className="space-y-4">
        {point ? (
          <>
            <LazyWeatherForecast lat={point.lat} lon={point.lon} />
            <LazyInmetStations lat={point.lat} lon={point.lon} />
            <LazyEarthquakesCard lat={point.lat} lon={point.lon} />
          </>
        ) : <LocationPending />}
        <LazyCptecSatellite />
        <InmetAlerts />
        <LazyCemadenAlerts />
      </div>
    ),
    mapa: (
      <div className="space-y-4">
        {point ? (
          <>
            <LazyOfflineMap initialLat={point.lat} initialLon={point.lon} />
            <LazyCoverageMap observerLat={point.lat} observerLon={point.lon} />
          </>
        ) : <LocationPending />}
        <LazyMeshNetwork />
        <RegulatoryInfo />
      </div>
    ),
    natureza: (
      <div className="space-y-4">
        <LazyCemadenAlerts />
        {point ? (
          <>
            <LazyAnaRios lat={point.lat} lon={point.lon} />
            <LazyEonetCard lat={point.lat} lon={point.lon} />
          </>
        ) : <LocationPending />}
        <LazyFaunaProtocols />
      </div>
    ),
    satellites: (
      <div className="space-y-4">
        {point ? <LazySatelliteTracker observerLat={point.lat} observerLon={point.lon} /> : <LocationPending />}
        <LazyCptecSatellite />
        <LazyConstellationInfo />
      </div>
    ),
    sensores: (
      <div className="space-y-4">
        {point ? <LazyCompassAltimeter observerLat={point.lat} observerLon={point.lon} /> : <LocationPending />}
        <LazyGpsTrail />
      </div>
    ),
    defesa: (
      <div className="space-y-4">
        <LazyDefesaCivil />
        <LazyCemadenAlerts />
        <LazyEmergencyContacts />
      </div>
    ),
    tools: (
      <div className="space-y-4">
        <LazySurvivalTools />
        <LazyMultilingualPhrases />
        <RegulatoryInfo />
      </div>
    ),
  }

  const SidebarItem = ({ item }: { item: TabDef }) => {
    const Icon = item.icon
    const active = tab === item.key
    return (
      <button onClick={() => handleTabClick(item.key)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${active ? 'border-signal/30 bg-signal/10 text-foreground' : 'border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}>
        <Icon className={`h-4 w-4 ${active ? item.color : ''}`} />
        <span className="font-medium">{item.label}</span>
        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-signal" />}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-9 w-9 flex-shrink-0">
              <img src="/icon-192.svg" alt="Aussy Ontech" className="h-full w-full" />
              <div className="signal-sweep pointer-events-none absolute -inset-1 rounded-full border border-signal/30" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-wide">AUSS Y S.O.S.</div>
              <div className="truncate font-mono-jet text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{cityName || 'Brasil · Resiliência digital'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={network.online ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}>
              {network.online ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
              {network.online ? 'ONLINE' : 'OFFLINE'}
            </Badge>
            {installPrompt && (
              <Button onClick={handleInstall} size="sm" variant="outline" className="hidden h-8 sm:flex">
                <Download className="mr-1 h-3.5 w-3.5" /> Instalar
              </Button>
            )}
            <Button onClick={() => handleTabClick('emergency')} size="sm" className="h-8 bg-red-600 text-white hover:bg-red-500">
              <Siren className="mr-1 h-3.5 w-3.5" /> SOS
            </Button>
          </div>
        </div>

        <div className="border-t border-border/30 bg-secondary/20 px-3 py-1.5 sm:px-5">
          <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <div className="flex min-w-0 items-center gap-2">
              <Globe2 className="h-3 w-3 flex-shrink-0 text-signal" />
              <span className="truncate font-mono-jet">
                {point ? `${point.lat.toFixed(4)}°, ${point.lon.toFixed(4)}°${cityName ? ` · ${cityName}` : ''}` : 'localização ainda não disponível'}
              </span>
            </div>
            <button onClick={() => detect()} disabled={geoLoading} className="flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1 hover:bg-secondary">
              <Zap className={`h-3 w-3 ${geoLoading ? 'animate-spin' : ''}`} /> GPS
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-80px)]">
        {useSidebar && (
          <aside className="sticky top-[80px] hidden h-[calc(100vh-80px)] w-60 flex-shrink-0 flex-col border-r border-border/40 bg-background/60 p-3 backdrop-blur-xl landscape:flex tablet:flex desktop:flex">
            <div className="space-y-1">
              {TABS.map((item) => <SidebarItem key={item.key} item={item} />)}
            </div>
            <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-[10px] leading-5 text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 font-semibold text-foreground"><HeartPulse className="h-3.5 w-3.5 text-red-400" />Aussy Ontech</div>
              Offline-first · fontes oficiais · dados rotulados por proveniência.
            </div>
          </aside>
        )}

        <div className="min-w-0 flex-1">
          <main className="mx-auto w-full max-w-7xl px-3 py-4 pb-28 sm:px-5 sm:py-5 landscape:pb-6">
            {tabContent[tab]}
          </main>

          <footer className="border-t border-border/40 bg-black/20 px-4 py-5 text-center text-xs text-muted-foreground">
            <p className="font-medium text-foreground">AIX8C - Uma tecnologia do grupo volponi.tech ! <strong>@𝗟𝗼𝗿𝗲𝗻𝘇𝗮 𝗩𝗼𝗹𝗽𝗼𝗻𝗶 🚀</strong> #01 em tecnologia no Brasil</p>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/75">Aussy Ontech combina recursos locais, fontes externas e cache de última resposta válida. Não substitui serviços oficiais de emergência.</p>
          </footer>
        </div>
      </div>

      {!useSidebar && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="mx-auto grid max-w-md grid-cols-6 gap-0.5 px-1 py-1">
            {PRIMARY_TABS.map((item) => {
              const Icon = item.icon
              const active = tab === item.key
              return (
                <button key={item.key} onClick={() => handleTabClick(item.key)} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[9px] transition ${active ? 'bg-signal/15 text-foreground' : 'text-muted-foreground'}`}>
                  <Icon className={`h-5 w-5 ${active ? item.color : ''}`} />
                  <span>{item.short}</span>
                </button>
              )
            })}
            <button onClick={() => setMoreOpen(true)} className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[9px] ${MORE_TABS.some((item) => item.key === tab) ? 'bg-signal/15 text-foreground' : 'text-muted-foreground'}`}>
              <MoreHorizontal className="h-5 w-5" />
              <span>Mais</span>
            </button>
          </div>
        </nav>
      )}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Menu className="h-4 w-4" />Mais seções</SheetTitle>
            <SheetDescription>Abra os módulos avançados do Aussy.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-2 pb-6">
            {MORE_TABS.map((item) => {
              const Icon = item.icon
              return (
                <button key={item.key} onClick={() => handleTabClick(item.key)} className="rounded-xl border border-border/40 bg-secondary/30 p-3 text-left transition hover:bg-secondary/50">
                  <Icon className={`h-5 w-5 ${item.color}`} />
                  <div className="mt-3 text-sm font-bold">{item.label}</div>
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
