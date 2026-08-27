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
  Bell,
  CloudSun,
  Compass,
  Download,
  Leaf,
  Map as MapIcon,
  MapPin,
  Menu,
  Moon,
  MoreHorizontal,
  Satellite,
  Shield,
  Siren,
  Sun,
  Wrench,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { EmergencySOS } from '@/components/aussy/emergency-sos'
import { HomeCommandDashboard } from '@/components/aussy/home-command-dashboard'
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
  description: string
  icon: typeof Activity
}

const TABS: TabDef[] = [
  { key: 'home', label: 'Início', short: 'Início', description: 'Painel rápido do Aussy', icon: Activity },
  { key: 'emergency', label: 'Emergência', short: 'SOS', description: 'SOS, contatos, QR médico e trilha', icon: Siren },
  { key: 'mapa', label: 'Mapa', short: 'Mapa', description: 'Mapas preparados para uso online e offline', icon: MapIcon },
  { key: 'clima', label: 'Clima e alertas', short: 'Alertas', description: 'Previsão, INMET, CEMADEN e sismos', icon: CloudSun },
  { key: 'natureza', label: 'Natureza', short: 'Natureza', description: 'Rios, eventos naturais e fauna', icon: Leaf },
  { key: 'satellites', label: 'Satélites', short: 'Satélites', description: 'Passagens orbitais e fontes de satélite', icon: Satellite },
  { key: 'sensores', label: 'Sensores', short: 'Sensores', description: 'Bússola, altímetro e trilha GPS', icon: Compass },
  { key: 'defesa', label: 'Defesa Civil', short: 'Defesa', description: 'Protocolos e contatos oficiais', icon: Shield },
  { key: 'tools', label: 'Ferramentas', short: 'Tools', description: 'Recursos de sobrevivência e idiomas', icon: Wrench },
]

const SECONDARY_TABS: TabKey[] = ['natureza', 'satellites', 'sensores', 'defesa', 'tools']

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

  const locationPresentation = (() => {
    if (!point) {
      return {
        title: 'Localização pendente',
        status: geoLoading ? 'Buscando posição' : 'Localização pendente',
        source: 'Autorize o GPS para localizar você com precisão.',
      }
    }

    const accuracy = typeof point.accuracy === 'number' && Number.isFinite(point.accuracy) && point.accuracy > 0
      ? point.accuracy >= 1000
        ? `±${(point.accuracy / 1000).toFixed(1)} km`
        : `±${Math.round(point.accuracy)} m`
      : null

    if (point.source === 'gps') {
      return {
        title: 'Localização por GPS',
        status: 'GPS ativo',
        source: `GPS do dispositivo${accuracy ? ` · ${accuracy}` : ''}`,
      }
    }

    if (point.source === 'ip') {
      return {
        title: 'Localização aproximada',
        status: 'Rede aproximada',
        source: `Estimativa por rede/IP${accuracy ? ` · ${accuracy}` : ''} · não é GPS`,
      }
    }

    if (point.source === 'cached') {
      return {
        title: 'Última localização conhecida',
        status: 'Posição salva',
        source: 'Cache local do dispositivo · pode estar desatualizado',
      }
    }

    return {
      title: 'Localização informada',
      status: 'Posição manual',
      source: 'Coordenadas inseridas manualmente',
    }
  })()

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
    if (point?.lat == null || point?.lon == null) {
      setCityName(null)
      return
    }

    setCityName(point.city || null)
    let cancelled = false
    fetch(`/api/geocode?lat=${point.lat}&lon=${point.lon}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setCityName(data.city || point.city || null)
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [point?.lat, point?.lon, point?.city])

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
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700 dark:text-blue-300" />
        <div>
          <div className="font-semibold">Aguardando localização válida</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            O Aussy não assume uma cidade padrão. Autorize o GPS ou reutilize uma posição salva para liberar os módulos dependentes de localização.
          </p>
        </div>
      </div>
    </div>
  )

  const tabContent: Record<TabKey, React.ReactNode> = {
    home: (
      <div className="space-y-6">
        <HomeCommandDashboard
          point={point}
          cityName={cityName}
          networkOnline={network.online}
          geoLoading={geoLoading}
          locationStatus={locationPresentation.status}
          locationSource={locationPresentation.source}
          onNavigate={handleTabClick}
          onOpenMore={() => setMoreOpen(true)}
          onOpenQr={() => setQrLocOpen(true)}
          onRefreshLocation={() => void detect()}
        />
        <section className="mx-auto max-w-5xl space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Resiliência offline</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Os recursos abaixo continuam disponíveis sem esconder as limitações de rede.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2"><NoSignalWizard /><OfflineManager /></div>
          <NetworkMonitor />
        </section>
      </div>
    ),
    emergency: <div className="space-y-4"><EmergencySOS observerLat={point?.lat} observerLon={point?.lon} />{!point && <LocationPending />}<ShakeToSOS /><LazyMedicalCardQR /><LazyEmergencyContacts /><LazyGpsTrail /><LazyMultilingualPhrases /></div>,
    clima: <div className="space-y-4">{point ? <><LazyWeatherForecast lat={point.lat} lon={point.lon} /><LazyInmetStations lat={point.lat} lon={point.lon} /><LazyEarthquakesCard lat={point.lat} lon={point.lon} /></> : <LocationPending />}<LazyCptecSatellite /><InmetAlerts /><LazyCemadenAlerts /></div>,
    mapa: <div className="space-y-4">{point ? <><LazyOfflineMap initialLat={point.lat} initialLon={point.lon} /><LazyCoverageMap observerLat={point.lat} observerLon={point.lon} /></> : <LocationPending />}<LazyMeshNetwork /><RegulatoryInfo /></div>,
    natureza: <div className="space-y-4"><LazyCemadenAlerts />{point ? <><LazyAnaRios lat={point.lat} lon={point.lon} /><LazyEonetCard lat={point.lat} lon={point.lon} /></> : <LocationPending />}<LazyFaunaProtocols /></div>,
    satellites: <div className="space-y-4">{point ? <LazySatelliteTracker observerLat={point.lat} observerLon={point.lon} /> : <LocationPending />}<LazyCptecSatellite /><LazyConstellationInfo /></div>,
    sensores: <div className="space-y-4">{point ? <LazyCompassAltimeter observerLat={point.lat} observerLon={point.lon} /> : <LocationPending />}<LazyGpsTrail /></div>,
    defesa: <div className="space-y-4"><LazyDefesaCivil /><LazyCemadenAlerts /><LazyEmergencyContacts /></div>,
    tools: <div className="space-y-4"><LazySurvivalTools /><LazyMultilingualPhrases /><RegulatoryInfo /></div>,
  }

  const moreActive = SECONDARY_TABS.includes(tab)

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950 dark:bg-background dark:text-foreground">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-border/50 dark:bg-background/92">
        <div className="mx-auto grid max-w-6xl grid-cols-[44px_1fr_88px] items-center gap-2 px-3 py-3 sm:grid-cols-[180px_1fr_180px] sm:px-5">
          <div className="flex items-center gap-2">
            <button onClick={() => setMoreOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:text-blue-700 dark:border-border dark:bg-card dark:text-foreground" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${network.online ? 'text-emerald-600' : 'text-slate-500'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${network.online ? 'bg-emerald-500' : 'bg-slate-400'}`} /> {network.online ? 'Sistema online' : 'Modo offline'}
              </div>
              <div className="mt-0.5 max-w-32 truncate text-[10px] text-slate-400">{cityName || point?.city || locationPresentation.status}</div>
            </div>
          </div>

          <button onClick={() => handleTabClick('home')} className="justify-self-center text-center" aria-label="Ir para o início do Aussy">
            <div className="text-[22px] font-black tracking-[0.16em] text-[#10275a] dark:text-white">AUSSY<span className="ml-0.5 text-[11px] tracking-normal text-red-600">.SOS</span></div>
            <div className="mt-0.5 hidden text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">Segurança inteligente</div>
          </button>

          <div className="flex items-center justify-end gap-1.5">
            <button onClick={() => handleTabClick('clima')} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-muted-foreground dark:hover:bg-secondary" aria-label="Abrir alertas">
              <Bell className="h-4.5 w-4.5" />
              {network.online && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />}
            </button>
            <button onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-muted-foreground dark:hover:bg-secondary" aria-label="Alternar tema claro e escuro">
              {themeMounted && resolvedTheme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-3 py-4 pb-28 sm:px-5 sm:py-6 lg:px-7 lg:pb-8">{tabContent[tab]}</main>

      <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500 dark:border-border/40 dark:bg-background dark:text-muted-foreground">
        <p className="font-medium text-slate-800 dark:text-foreground">AIX8C - Uma tecnologia do grupo volponi.tech ! <strong>@𝗟𝗼𝗿𝗲𝗻𝘇𝗮 𝗩𝗼𝗹𝗽𝗼𝗻𝗶 🚀</strong> #01 em tecnologia no Brasil</p>
        <p className="mt-2 text-[10px] leading-relaxed opacity-75">Aussy Ontech combina recursos locais, fontes externas e cache de última resposta válida. Não substitui serviços oficiais de emergência.</p>
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/96 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-border/50 dark:bg-background/96 lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-1">
          <button onClick={() => handleTabClick('home')} className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-2 text-[9px] font-medium ${tab === 'home' ? 'text-red-600' : 'text-slate-500 dark:text-muted-foreground'}`} aria-label="Início">
            <Activity className="h-5 w-5" /><span>Início</span>
          </button>
          <button onClick={() => handleTabClick('mapa')} className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-2 text-[9px] font-medium ${tab === 'mapa' ? 'text-[#10275a] dark:text-white' : 'text-slate-500 dark:text-muted-foreground'}`} aria-label="Mapa">
            <MapIcon className="h-5 w-5" /><span>Mapa</span>
          </button>
          <button onClick={() => handleTabClick('emergency')} className="relative -mt-5 flex min-h-[78px] flex-col items-center justify-end gap-1 pb-2 text-[9px] font-semibold text-red-600" aria-label="SOS">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-red-600 text-base font-bold text-white shadow-[0_8px_25px_rgba(220,38,38,0.35)] dark:border-background">SOS</span>
            <span>Emergência</span>
          </button>
          <button onClick={() => handleTabClick('clima')} className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-2 text-[9px] font-medium ${tab === 'clima' ? 'text-[#10275a] dark:text-white' : 'text-slate-500 dark:text-muted-foreground'}`} aria-label="Alertas">
            <Bell className="h-5 w-5" /><span>Alertas</span>
          </button>
          <button onClick={() => setMoreOpen(true)} className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-2 text-[9px] font-medium ${moreActive ? 'text-[#10275a] dark:text-white' : 'text-slate-500 dark:text-muted-foreground'}`} aria-label="Mais">
            <MoreHorizontal className="h-5 w-5" /><span>Mais</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto bg-white dark:bg-background">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-[#10275a] dark:text-foreground"><Menu className="h-4 w-4" />Menu rápido AUSSY</SheetTitle>
            <SheetDescription>Tudo que importa em até dois toques, sem esconder os módulos avançados.</SheetDescription>
          </SheetHeader>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TABS.map((item) => {
              const Icon = item.icon
              const active = tab === item.key
              return (
                <button key={item.key} onClick={() => handleTabClick(item.key)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30' : 'border-slate-200 bg-white hover:border-blue-200 dark:border-border dark:bg-card'}`}>
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${item.key === 'emergency' ? 'bg-red-600 text-white' : 'bg-slate-100 text-[#10275a] dark:bg-secondary dark:text-foreground'}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{item.description}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 dark:border-border sm:grid-cols-2">
            {installPrompt && <Button onClick={handleInstall} variant="outline" className="justify-start"><Download className="mr-2 h-4 w-4" />Instalar Aussy neste dispositivo</Button>}
            <Button onClick={toggleTheme} variant="outline" className="justify-start">{resolvedTheme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}Alternar tema</Button>
          </div>
        </SheetContent>
      </Sheet>

      <QuickShare initialPoint={point} />
      <QrLocation open={qrLocOpen} onOpenChange={setQrLocOpen} initialPoint={point} />
    </div>
  )
}
