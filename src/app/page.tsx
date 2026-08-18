'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Activity,
  Satellite,
  Siren,
  Radio,
  Map as MapIcon,
  Globe2,
  Zap,
  Download,
  Wrench,
  QrCode,
  Heart,
  Route,
  CloudRain,
  Globe,
  Compass,
  Flame,
  Bug,
  Leaf,
  Cloud,
  Sun,
  MoreHorizontal,
  Shield,
  Waves,
  Thermometer,
  Menu,
  X,
  Wifi,
  WifiOff,
  MapPin,
} from 'lucide-react'
import { NetworkMonitor } from '@/components/aussy/network-monitor'
import { EmergencySOS } from '@/components/aussy/emergency-sos'
import { RegulatoryInfo } from '@/components/aussy/regulatory-info'
import { OfflineManager } from '@/components/aussy/offline-manager'
import { NoSignalWizard } from '@/components/aussy/no-signal-wizard'
import { QuickShare } from '@/components/aussy/quick-share'
import { ShakeToSOS } from '@/components/aussy/shake-to-sos'
import { InmetAlerts } from '@/components/aussy/inmet-alerts'
import { QrLocation } from '@/components/aussy/qr-location'
import {
  LazySatelliteTracker,
  LazyConstellationInfo,
  LazyOfflineMap,
  LazyCoverageMap,
  LazyCompassAltimeter,
  LazyCemadenAlerts,
  LazyFaunaProtocols,
  LazyMultilingualPhrases,
  LazySurvivalTools,
  LazyEmergencyContacts,
  LazyMedicalCardQR,
  LazyGpsTrail,
  LazyMeshNetwork,
  LazyEarthquakesCard,
  LazyEonetCard,
  LazyWeatherForecast,
  LazyInmetStations,
  LazyAnaRios,
  LazyCptecSatellite,
  LazyDefesaCivil,
} from '@/components/aussy/lazy'
import { useNetworkStatus } from '@/hooks/use-network'
import { useGeolocation } from '@/hooks/use-geolocation'
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
  | 'tools'
  | 'defesa'

interface TabDef {
  key: TabKey
  label: string
  short: string
  icon: typeof Activity
  color: string
  primary: boolean
  group: 'main' | 'more'
}

const TABS: TabDef[] = [
  { key: 'home', label: 'Início', short: 'Início', icon: Activity, color: 'text-signal', primary: true, group: 'main' },
  { key: 'emergency', label: 'Emergência', short: 'SOS', icon: Siren, color: 'text-red-400', primary: true, group: 'main' },
  { key: 'clima', label: 'Clima', short: 'Clima', icon: Sun, color: 'text-cyan-400', primary: true, group: 'main' },
  { key: 'mapa', label: 'Mapa', short: 'Mapa', icon: MapIcon, color: 'text-emerald-400', primary: true, group: 'main' },
  { key: 'natureza', label: 'Natureza', short: 'Natureza', icon: Leaf, color: 'text-orange-400', primary: false, group: 'more' },
  { key: 'satellites', label: 'Satélites', short: 'Satélites', icon: Satellite, color: 'text-cyan-300', primary: false, group: 'more' },
  { key: 'sensores', label: 'Sensores', short: 'Sensores', icon: Compass, color: 'text-emerald-300', primary: false, group: 'more' },
  { key: 'defesa', label: 'Defesa Civil', short: 'Defesa', icon: Shield, color: 'text-amber-300', primary: false, group: 'more' },
  { key: 'tools', label: 'Ferramentas', short: 'Tools', icon: Wrench, color: 'text-amber-400', primary: false, group: 'more' },
]

const PRIMARY_TABS = TABS.filter((t) => t.primary)
const MORE_TABS = TABS.filter((t) => !t.primary)

export default function Home() {
  const [tab, setTab] = useState<TabKey>('home')
  const [moreOpen, setMoreOpen] = useState(false)
  const [qrLocOpen, setQrLocOpen] = useState(false)
  const network = useNetworkStatus()
  const { point, detect, loading: geoLoading } = useGeolocation()
  const orientation = useOrientation()
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [cityName, setCityName] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab') as TabKey
    if (t && TABS.some((tab) => tab.key === t)) {
      setTab(t)
    }
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
      const dismissed = localStorage.getItem('aussy_install_dismissed')
      if (!dismissed) {
        setTimeout(() => setShowInstallBanner(true), 12000)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (isStandalone) {
      localStorage.setItem('aussy_installed', 'true')
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismissInstallBanner = () => {
    setShowInstallBanner(false)
    localStorage.setItem('aussy_install_dismissed', '1')
  }

  useEffect(() => {
    detect()
  }, [detect])

  useEffect(() => {
    if (point?.lat == null || point?.lon == null) return
    let cancelled = false
    fetch(`/api/geocode?lat=${point.lat}&lon=${point.lon}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.city) setCityName(d.city)
      })
      .catch(() => {})
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
        description: 'App shell e recursos previamente preparados podem ser usados sem rede; dados externos dependem do cache disponível.',
      })
    }
    setInstallPrompt(null)
  }

  const useSidebar = orientation.isLandscape || orientation.isTablet || orientation.isWide

  const handleTabClick = useCallback((k: TabKey) => {
    setTab(k)
    setMoreOpen(false)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const LocationPending = () => (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-semibold">Aguardando localização válida</div>
          <div className="text-xs text-amber-200/80 mt-1 leading-relaxed">
            Este módulo depende da sua posição. O Aussy não usa uma cidade padrão como se fosse sua localização. Autorize o GPS ou reutilize uma posição salva anteriormente.
          </div>
        </div>
      </div>
    </div>
  )

  const tabContent: Record<TabKey, React.ReactNode> = {
    home: (
      <div className="space-y-3 sm:space-y-4">
        <NoSignalWizard />
        <OfflineManager />
        {point ? <LazyWeatherForecast lat={point.lat} lon={point.lon} /> : <LocationPending />}
        <InmetAlerts />
        <LazyCemadenAlerts />
        <NetworkMonitor />
      </div>
    ),
    emergency: (
      <div className="space-y-3 sm:space-y-4">
        <EmergencySOS observerLat={point?.lat ?? 0} observerLon={point?.lon ?? 0} />
        {!point && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            A localização ainda não foi obtida. Ligações de emergência e o alarme local continuam disponíveis; recursos que precisem de coordenadas devem aguardar GPS/posição salva.
          </div>
        )}
        <ShakeToSOS />
        <LazyMedicalCardQR />
        <LazyEmergencyContacts />
        <LazyGpsTrail />
        <LazyMultilingualPhrases />
      </div>
    ),
    clima: (
      <div className="space-y-3 sm:space-y-4">
        {point ? (
          <>
            <LazyWeatherForecast lat={point.lat} lon={point.lon} />
            <LazyInmetStations lat={point.lat} lon={point.lon} />
            <LazyEarthquakesCard lat={point.lat} lon={point.lon} />
          </>
        ) : (
          <LocationPending />
        )}
        <LazyCptecSatellite />
        <InmetAlerts />
        <LazyCemadenAlerts />
      </div>
    ),
    mapa: (
      <div className="space-y-3 sm:space-y-4">
        {point ? (
          <>
            <LazyOfflineMap initialLat={point.lat} initialLon={point.lon} />
            <LazyCoverageMap observerLat={point.lat} observerLon={point.lon} />
          </>
        ) : (
          <LocationPending />
        )}
        <LazyMeshNetwork />
        <RegulatoryInfo />
      </div>
    ),
    natureza: (
      <div className="space-y-3 sm:space-y-4">
        <LazyCemadenAlerts />
        {point ? (
          <>
            <LazyAnaRios lat={point.lat} lon={point.lon} />
            <LazyEonetCard lat={point.lat} lon={point.lon} />
          </>
        ) : (
          <LocationPending />
        )}
        <LazyFaunaProtocols />
      </div>
    ),
    satellites: (
      <div className="space-y-3 sm:space-y-4">
        {point ? <LazySatelliteTracker observerLat={point.lat} observerLon={point.lon} /> : <LocationPending />}
        <LazyCptecSatellite />
        <LazyConstellationInfo />
      </div>
    ),
    sensores: (
      <div className="space-y-3 sm:space-y-4">
        {point ? <LazyCompassAltimeter observerLat={point.lat} observerLon={point.lon} /> : <LocationPending />}
        <LazyGpsTrail />
      </div>
    ),
    defesa: (
      <div className="space-y-3 sm:space-y-4">
        <LazyDefesaCivil />
        <LazyCemadenAlerts />
        <LazyEmergencyContacts />
      </div>
    ),
    tools: (
      <div className="space-y-3 sm:space-y-4">
        <LazySurvivalTools />
        <LazyMultilingualPhrases />
        <RegulatoryInfo />
      </div>
    ),
  }

  const QuickActions = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      <button
        onClick={() => handleTabClick('emergency')}
        className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition-all text-left active:scale-95"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
          <Siren className="h-4 w-4 text-red-400" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-red-300">SOS</div>
          <div className="text-[10px] text-muted-foreground truncate">192 · 190 · 193</div>
        </div>
      </button>
      <button
        onClick={() => setQrLocOpen(true)}
        className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 transition-all text-left active:scale-95"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center">
          <QrCode className="h-4 w-4 text-purple-400" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-purple-300">QR Local</div>
          <div className="text-[10px] text-muted-foreground truncate">Compartilhar</div>
        </div>
      </button>
      <button
        onClick={() => handleTabClick('emergency')}
        className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 transition-all text-left active:scale-95"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center">
          <Heart className="h-4 w-4 text-rose-400" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-rose-300">Ficha Médica</div>
          <div className="text-[10px] text-muted-foreground truncate">Sangue, alergias</div>
        </div>
      </button>
      <button
        onClick={() => handleTabClick('emergency')}
        className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-orbit/40 bg-orbit/10 hover:bg-orbit/20 transition-all text-left active:scale-95"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-orbit/20 border border-orbit/50 flex items-center justify-center">
          <Route className="h-4 w-4 text-orbit" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-orbit">Trilha GPS</div>
          <div className="text-[10px] text-muted-foreground truncate">Salvar posições</div>
        </div>
      </button>
      <button
        onClick={() => handleTabClick('home')}
        className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-signal/40 bg-signal/10 hover:bg-signal/20 transition-all text-left active:scale-95"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-signal/20 border border-signal/50 flex items-center justify-center">
          <Radio className="h-4 w-4 text-signal" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-signal">Sem sinal?</div>
          <div className="text-[10px] text-muted-foreground truncate">Recuperar</div>
        </div>
      </button>
      <button
        onClick={() => handleTabClick('clima')}
        className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all text-left active:scale-95"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
          <Sun className="h-4 w-4 text-cyan-400" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-cyan-300">Clima</div>
          <div className="text-[10px] text-muted-foreground truncate">INMET · CPTEC</div>
        </div>
      </button>
      <button
        onClick={() => handleTabClick('natureza')}
        className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 transition-all text-left active:scale-95"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
          <Waves className="h-4 w-4 text-blue-400" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-blue-300">Rios · ANA</div>
          <div className="text-[10px] text-muted-foreground truncate">estações de referência</div>
        </div>
      </button>
      <button
        onClick={() => handleTabClick('satellites')}
        className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all text-left active:scale-95"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
          <Satellite className="h-4 w-4 text-cyan-400 orbit-pulse" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-cyan-300">Satélites</div>
          <div className="text-[10px] text-muted-foreground truncate">TLE · portais oficiais</div>
        </div>
      </button>
      <button
        onClick={() => handleTabClick('sensores')}
        className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-left active:scale-95"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
          <Compass className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-emerald-300">Bússola</div>
          <div className="text-[10px] text-muted-foreground truncate">sensor local</div>
        </div>
      </button>
      <button
        onClick={() => handleTabClick('natureza')}
        className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 transition-all text-left active:scale-95"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center">
          <Bug className="h-4 w-4 text-orange-400" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-orange-300">Fauna</div>
          <div className="text-[10px] text-muted-foreground truncate">picadas/mordidas</div>
        </div>
      </button>
      <button
        onClick={() => handleTabClick('defesa')}
        className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-left active:scale-95"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
          <Shield className="h-4 w-4 text-amber-400" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-amber-300">Defesa Civil</div>
          <div className="text-[10px] text-muted-foreground truncate">199 · canais oficiais</div>
        </div>
      </button>
      <button
        onClick={() => handleTabClick('mapa')}
        className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-left active:scale-95"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
          <MapIcon className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs text-emerald-300">Mapa</div>
          <div className="text-[10px] text-muted-foreground truncate">cache OSM</div>
        </div>
      </button>
    </div>
  )

  const SidebarItem = ({ t }: { t: TabDef }) => {
    const Icon = t.icon
    const active = tab === t.key
    return (
      <button
        onClick={() => handleTabClick(t.key)}
        title={t.label}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all active:scale-95 ${
          active
            ? 'bg-signal/15 border border-signal/40 text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent'
        }`}
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${active ? t.color : ''}`} />
        <span className="truncate font-medium">{t.label}</span>
        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-signal flex-shrink-0" />}
      </button>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/40 landscape:py-1">
        <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-8 h-8 flex-shrink-0">
              <img src="/icon-192.svg" alt="Aussy Ontech" className="w-full h-full" />
              <div className="absolute -inset-1 rounded-full border border-signal/30 signal-sweep pointer-events-none" />
            </div>
            <div className="min-w-0 landscape:hidden">
              <h1 className="text-sm font-bold leading-tight truncate">Aussy Ontech</h1>
              <p className="text-[9px] text-muted-foreground font-mono-jet uppercase tracking-wider truncate">
                {cityName ? cityName : 'Resiliência Orbital'}
              </p>
            </div>
            <div className="hidden landscape:block">
              <h1 className="text-xs font-bold leading-tight truncate">Aussy Ontech</h1>
              <p className="text-[8px] text-muted-foreground font-mono-jet uppercase tracking-wider truncate">
                {cityName || 'Brasil'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={`text-[10px] font-mono-jet ${
                network.online
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30 blink-emergency'
              }`}
            >
              {network.online ? <Wifi className="h-2.5 w-2.5 mr-1" /> : <WifiOff className="h-2.5 w-2.5 mr-1" />}
              {network.online ? 'ONLINE' : 'OFFLINE'}
            </Badge>

            {installPrompt && (
              <Button onClick={handleInstall} size="sm" variant="outline" className="text-xs h-7 hidden sm:flex">
                <Download className="h-3 w-3 mr-1" />
                Instalar
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-border/30 bg-secondary/20">
          <div className="px-3 sm:px-4 py-1 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
              <Globe2 className="h-3 w-3 text-signal flex-shrink-0" />
              <span className="font-mono-jet truncate">
                {point ? (
                  <>
                    {point.lat.toFixed(4)}°, {point.lon.toFixed(4)}°
                    {point.source === 'gps' && <span className="text-emerald-400 ml-1">· GPS</span>}
                    {point.source === 'ip' && <span className="text-amber-400 ml-1">· IP aprox.</span>}
                    {point.source === 'manual' && <span className="text-signal ml-1">· manual</span>}
                    {point.source === 'cached' && <span className="text-amber-300 ml-1">· última posição</span>}
                    {cityName && <span className="ml-1 text-muted-foreground/70 hidden xs:inline">· {cityName}</span>}
                  </>
                ) : (
                  'localização ainda não disponível'
                )}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => detect()}
              disabled={geoLoading}
              className="h-6 text-xs px-2 flex-shrink-0"
            >
              <Zap className={`h-3 w-3 mr-1 ${geoLoading ? 'animate-spin' : ''}`} />
              {geoLoading ? '...' : 'GPS'}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {useSidebar && (
          <aside className="hidden landscape:flex tablet:flex desktop:flex sticky top-0 h-screen w-56 lg:w-60 flex-shrink-0 border-r border-border/40 bg-background/60 backdrop-blur-xl flex-col">
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 pt-16 landscape:pt-14">
              {TABS.map((t) => (
                <SidebarItem key={t.key} t={t} />
              ))}

              {installPrompt && (
                <div className="pt-2 mt-2 border-t border-border/30">
                  <Button onClick={handleInstall} size="sm" className="w-full h-8">
                    <Download className="h-3 w-3 mr-1.5" />
                    Instalar app
                  </Button>
                </div>
              )}

              <div className="pt-2 mt-2 border-t border-border/30 text-[10px] text-muted-foreground px-2">
                <p className="font-mono-jet">{TABS.length} seções · offline-first</p>
              </div>
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          {tab === 'home' && (
            <section className="border-b border-border/30 bg-gradient-to-b from-signal/5 to-transparent">
              <div className="px-3 sm:px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold">Acesso rápido</h2>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono-jet ${
                      network.online
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30 blink-emergency'
                    }`}
                  >
                    {network.online ? 'CONECTADO' : 'SEM REDE'}
                  </Badge>
                </div>
                <QuickActions />
              </div>
            </section>
          )}

          <main className="flex-1 px-3 sm:px-4 py-3 sm:py-4 max-w-5xl mx-auto w-full pb-24 landscape:pb-4">
            {tabContent[tab]}
          </main>

          <footer className="mt-auto border-t border-border/40 bg-background/60 hidden landscape:block">
            <div className="px-4 py-3 text-xs text-muted-foreground space-y-1.5 max-w-5xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <img src="/icon-192.svg" alt="" className="w-5 h-5" />
                  <span className="font-mono-jet">Aussy Ontech · SW v9</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono-jet text-[10px]">CelesTrak · INMET · CEMADEN · CPTEC/INPE · ANA · IBGE · USGS · NASA EONET · Defesa Civil · OSM</span>
                </div>
              </div>
              <div className="pt-2 border-t border-border/30 leading-relaxed">
                <p className="text-[10px]">
                  <strong className="text-foreground">Aviso técnico:</strong> O Aussy combina fontes externas, última cópia válida em cache, bases locais e camadas demonstrativas explicitamente rotuladas. ERBs do módulo de cobertura são sintéticas; ANA nesta build fornece referências de estações sem nível ao vivo; posições orbitais são aproximações derivadas de TLE. Dados externos podem ficar indisponíveis. O Aussy não cria conectividade via satélite e não substitui serviços oficiais de emergência.
                </p>
                <p className="text-[9px] text-muted-foreground/70 mt-1">
                  Conteúdo de primeiros socorros é informativo e não substitui atendimento médico. Em emergência real, use os números oficiais apropriados, como SAMU 192, Polícia 190 ou Bombeiros 193.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {!useSidebar && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="grid grid-cols-6 gap-0.5 px-1 py-1 max-w-md mx-auto">
            {PRIMARY_TABS.map((t) => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => handleTabClick(t.key)}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg transition-all active:scale-95 ${
                    active
                      ? 'bg-signal/15 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={{ minHeight: '52px' }}
                >
                  <Icon className={`h-5 w-5 ${active ? t.color : ''}`} />
                  <span className="text-[9px] font-medium leading-none truncate w-full text-center">
                    {t.short}
                  </span>
                  {active && (
                    <span className="absolute -mt-1 h-1 w-1 rounded-full bg-signal" />
                  )}
                </button>
              )
            })}
            <button
              onClick={() => setMoreOpen(true)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg transition-all active:scale-95 ${
                MORE_TABS.some((t) => t.key === tab) ? 'bg-signal/15 text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ minHeight: '52px' }}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[9px] font-medium leading-none">Mais</span>
            </button>
          </div>
        </nav>
      )}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Menu className="h-4 w-4" />
              Mais seções
            </SheetTitle>
            <SheetDescription>
              Toque em uma seção para abrir
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 mt-4 pb-6">
            {MORE_TABS.map((t) => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => handleTabClick(t.key)}
                  className={`flex flex-col items-start gap-2 p-3 rounded-xl border transition-all active:scale-95 ${
                    active
                      ? 'border-signal/40 bg-signal/10'
                      : 'border-border/40 bg-secondary/30 hover:bg-secondary/50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center bg-secondary/50 ${active ? t.color : 'text-muted-foreground'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">{t.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {t.key === 'natureza' && 'CEMADEN · Rios · Fauna'}
                      {t.key === 'satellites' && 'TLE · CPTEC/INPE'}
                      {t.key === 'sensores' && 'Bússola · Altímetro'}
                      {t.key === 'defesa' && '199 · canais oficiais'}
                      {t.key === 'tools' && 'Survival · Frases'}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>

      <QuickShare initialPoint={point} />

      {showInstallBanner && installPrompt && (
        <div
          className="fixed left-3 right-3 z-50 animate-in slide-in-from-bottom"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom) + 88px)',
            maxWidth: '32rem',
            margin: '0 auto',
          }}
        >
          <div className="bg-gradient-to-r from-signal/20 to-cyan-500/10 border border-signal/40 backdrop-blur-xl rounded-2xl p-3 shadow-2xl shadow-signal/20">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 flex-shrink-0">
                <img src="/icon-192.svg" alt="" className="w-full h-full" />
                <div className="absolute -inset-1 rounded-full border border-signal/30 signal-sweep pointer-events-none" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-foreground">Instalar Aussy Ontech</div>
                <div className="text-[10px] text-muted-foreground">
                  Acesso rápido + recursos preparados para offline
                </div>
              </div>
              <button
                onClick={dismissInstallBanner}
                className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0"
                aria-label="Dispensar"
              >
                <X className="h-4 w-4" />
              </button>
              <Button
                onClick={async () => {
                  await handleInstall()
                  dismissInstallBanner()
                }}
                size="sm"
                className="bg-signal text-primary-foreground hover:bg-signal/90 h-8 flex-shrink-0"
              >
                <Download className="h-3 w-3 mr-1" />
                Instalar
              </Button>
            </div>
          </div>
        </div>
      )}

      <QrLocation open={qrLocOpen} onOpenChange={setQrLocOpen} initialPoint={point} />
    </div>
  )
}
