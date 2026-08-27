'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  RefreshCw,
  Satellite,
  Shield,
  Siren,
  Sun,
  Wrench,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { DeviceTorch } from '@/components/aussy/device-torch'
import { EmergencySOS } from '@/components/aussy/emergency-sos'
import { HomeCommandDashboard } from '@/components/aussy/home-command-dashboard'
import { InmetAlerts } from '@/components/aussy/inmet-alerts'
import { LocationControl } from '@/components/aussy/location-control'
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
  { key: 'home', label: 'Início', short: 'Início', description: 'Resumo e ações rápidas', icon: Activity },
  { key: 'emergency', label: 'SOS e emergência', short: 'SOS', description: 'SOS, contatos, QR médico e trilha', icon: Siren },
  { key: 'clima', label: 'Clima e alertas', short: 'Alertas', description: 'INMET oficial, previsão e riscos meteorológicos', icon: CloudSun },
  { key: 'mapa', label: 'Mapa e rede', short: 'Mapa', description: 'Mapa, localização, conectividade e recursos offline', icon: MapIcon },
  { key: 'natureza', label: 'Rios e natureza', short: 'Rios', description: 'SGB/ANA, eventos naturais e fauna', icon: Leaf },
  { key: 'defesa', label: 'Defesa Civil', short: 'Defesa', description: 'Protocolos, alertas e contatos oficiais', icon: Shield },
  { key: 'satellites', label: 'Satélites', short: 'Satélites', description: 'Passagens orbitais e fontes de satélite', icon: Satellite },
  { key: 'sensores', label: 'Sensores', short: 'Sensores', description: 'Bússola, altímetro e trilha GPS', icon: Compass },
  { key: 'tools', label: 'Ferramentas', short: 'Ferramentas', description: 'Resiliência, sobrevivência e idiomas', icon: Wrench },
]

const ESSENTIAL_TABS: TabKey[] = ['home', 'emergency', 'clima', 'mapa']
const SECONDARY_TABS: TabKey[] = ['natureza', 'defesa', 'satellites', 'sensores', 'tools']
const MOBILE_TAB_ORDER: TabKey[] = ['home', 'clima', 'mapa', 'defesa', 'natureza', 'satellites', 'sensores', 'tools']
const MOBILE_TABS = MOBILE_TAB_ORDER
  .map((key) => TABS.find((item) => item.key === key))
  .filter((item): item is TabDef => Boolean(item))
const EMERGENCY_TAB = TABS.find((item) => item.key === 'emergency') as TabDef

export default function Home() {
  const [tab, setTab] = useState<TabKey>('home')
  const [moreOpen, setMoreOpen] = useState(false)
  const [qrLocOpen, setQrLocOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [cityName, setCityName] = useState<string | null>(null)
  const [themeMounted, setThemeMounted] = useState(false)
  const mobileNavRef = useRef<HTMLDivElement | null>(null)

  const network = useNetworkStatus()
  const {
    point,
    detect,
    detectGps,
    loading: geoLoading,
    error: geoError,
    permission: geoPermission,
  } = useGeolocation()
  const { resolvedTheme, setTheme } = useTheme()

  const locationPresentation = (() => {
    if (!point) {
      return {
        title: 'Localização pendente',
        status: geoLoading
          ? 'Buscando posição'
          : geoPermission === 'denied'
            ? 'GPS bloqueado'
            : 'Localização pendente',
        source: geoError || 'Autorize o GPS para localizar você com precisão.',
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

  useEffect(() => setThemeMounted(true), [])

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
    void detect()
  }, [detect])

  useEffect(() => {
    const activeButton = mobileNavRef.current?.querySelector<HTMLElement>(`[data-mobile-tab="${tab}"]`)
    activeButton?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [tab])

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
      toast.success('AUSSY.SOS instalado!', {
        description: 'Acesso rápido e recursos preparados para uso offline.',
      })
    }

    setInstallPrompt(null)
  }

  const handleTabClick = useCallback((nextTab: TabKey) => {
    setTab(nextTab)
    setMoreOpen(false)

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)

      if (nextTab === 'home') {
        url.searchParams.delete('tab')
      } else {
        url.searchParams.set('tab', nextTab)
      }

      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const toggleTheme = () => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')

  const LocationPending = () => (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-700 dark:text-blue-300" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {geoPermission === 'denied' ? 'Localização bloqueada' : 'Aguardando localização válida'}
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
            {geoPermission === 'denied'
              ? 'Libere a localização nas configurações deste site. O Aussy não assume uma cidade padrão.'
              : 'Autorize o GPS ou reutilize uma posição salva para liberar os módulos dependentes de localização.'}
          </p>
          {geoError && (
            <p className="mt-2 text-xs font-medium leading-5 text-amber-800 dark:text-amber-300">
              {geoError}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            className="mt-3 min-h-10 bg-[#10275a] text-white hover:bg-[#173778]"
            disabled={geoLoading}
            onClick={() => void detectGps()}
          >
            {geoLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Buscando GPS…
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Atualizar GPS
              </>
            )}
          </Button>
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
          onRefreshLocation={() => void detectGps()}
        />

        <section className="mx-auto max-w-5xl space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">
              Resiliência offline
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Preparação local e recuperação de rede sem prometer o que o dispositivo não consegue fazer.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <NoSignalWizard />
            <OfflineManager />
          </div>
        </section>
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
        <InmetAlerts />
        {point ? (
          <>
            <LazyWeatherForecast lat={point.lat} lon={point.lon} />
            <LazyInmetStations lat={point.lat} lon={point.lon} />
          </>
        ) : (
          <LocationPending />
        )}
        <LazyCptecSatellite />
        <LazyCemadenAlerts />
        {point && <LazyEarthquakesCard lat={point.lat} lon={point.lon} />}
      </div>
    ),
    mapa: (
      <div className="space-y-4">
        <LocationControl
          point={point}
          loading={geoLoading}
          permission={geoPermission}
          error={geoError}
          onRefresh={() => void detectGps()}
        />
        {point ? (
          <>
            <LazyOfflineMap initialLat={point.lat} initialLon={point.lon} />
            <LazyCoverageMap observerLat={point.lat} observerLon={point.lon} />
          </>
        ) : (
          <LocationPending />
        )}
        <NetworkMonitor />
        <LazyMeshNetwork />
        <RegulatoryInfo />
      </div>
    ),
    natureza: (
      <div className="space-y-4">
        {point ? (
          <>
            <LazyAnaRios lat={point.lat} lon={point.lon} />
            <LazyEonetCard lat={point.lat} lon={point.lon} />
          </>
        ) : (
          <LocationPending />
        )}
        <LazyCemadenAlerts />
        <LazyFaunaProtocols />
      </div>
    ),
    satellites: (
      <div className="space-y-4">
        {point
          ? <LazySatelliteTracker observerLat={point.lat} observerLon={point.lon} />
          : <LocationPending />}
        <LazyCptecSatellite />
        <LazyConstellationInfo />
      </div>
    ),
    sensores: (
      <div className="space-y-4">
        {point
          ? <LazyCompassAltimeter observerLat={point.lat} observerLon={point.lon} />
          : <LocationPending />}
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
        <DeviceTorch />
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-slate-100">Separação de função:</strong>{' '}
          o controle acima acende o LED traseiro real. A opção “Lanterna + SOS” no kit abaixo é apenas sinalização visual de tela para luz branca, vermelha e Morse.
        </div>
        <LazySurvivalTools />
        <LazyMultilingualPhrases />
        <RegulatoryInfo />
      </div>
    ),
  }

  const menuItem = (item: TabDef) => {
    const Icon = item.icon
    const active = tab === item.key

    return (
      <button
        key={item.key}
        type="button"
        onClick={() => handleTabClick(item.key)}
        className={`flex min-h-[72px] items-center gap-3 rounded-2xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          active
            ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
            : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900'
        }`}
      >
        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
          item.key === 'emergency'
            ? 'bg-red-600 text-white'
            : 'bg-slate-100 text-[#10275a] dark:bg-slate-800 dark:text-slate-100'
        }`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
            {item.label}
          </div>
          <div className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
            {item.description}
          </div>
        </div>
      </button>
    )
  }

  const mobileLocationLabel = cityName || point?.city || locationPresentation.status
  const mobileLocationSource = geoLoading
    ? 'ATUALIZANDO'
    : point?.source === 'gps'
      ? 'GPS'
      : point?.source === 'ip'
        ? 'REDE'
        : point?.source === 'cached'
          ? 'SALVO'
          : point?.source === 'manual'
            ? 'MANUAL'
            : 'ATIVAR'

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-950 dark:bg-background dark:text-foreground">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/96 backdrop-blur-xl dark:border-border/50 dark:bg-background/94">
        <div className="mx-auto grid max-w-6xl grid-cols-[48px_1fr_96px] items-center gap-2 px-3 py-2.5 sm:grid-cols-[190px_1fr_190px] sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void detectGps()}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:hidden"
              aria-label="Atualizar localização GPS"
            >
              <MapPin className={`h-5 w-5 ${geoLoading ? 'animate-pulse text-blue-700 dark:text-blue-300' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:flex"
              aria-label="Abrir todos os módulos"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden sm:block" aria-live="polite">
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                network.online
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}>
                <span className={`h-2 w-2 rounded-full ${
                  network.online ? 'bg-emerald-500' : 'bg-slate-400'
                }`} />
                {network.online ? 'Sistema online' : 'Modo offline'}
              </div>
              <div className="mt-0.5 max-w-36 truncate text-xs text-slate-600 dark:text-slate-400">
                {mobileLocationLabel}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleTabClick('home')}
            className="justify-self-center rounded-lg px-2 text-center"
            aria-label="Ir para o início do Aussy"
          >
            <div className="text-[22px] font-black tracking-[0.14em] text-[#10275a] dark:text-white">
              AUSSY<span className="ml-0.5 text-xs tracking-normal text-red-600">.SOS</span>
            </div>
            <div className="mt-0.5 hidden text-xs font-medium text-slate-600 dark:text-slate-400 sm:block">
              Segurança e resiliência
            </div>
          </button>

          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => handleTabClick('clima')}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Abrir clima e alertas"
            >
              <Bell className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Alternar tema claro e escuro"
            >
              {themeMounted && resolvedTheme === 'dark'
                ? <Sun className="h-5 w-5" />
                : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-3 py-4 pb-40 sm:px-5 sm:py-6 lg:px-7 lg:pb-8">
        {tabContent[tab]}
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-5 pb-40 text-center text-sm text-slate-600 dark:border-border/40 dark:bg-background dark:text-muted-foreground lg:pb-5">
        <p className="font-medium text-slate-900 dark:text-foreground">
          AIX8C - Uma tecnologia do grupo volponi.tech !{' '}
          <strong>@𝗟𝗼𝗿𝗲𝗻𝘇𝗮 𝗩𝗼𝗹𝗽𝗼𝗻𝗶 🚀</strong> #01 em tecnologia no Brasil
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
          Aussy Ontech combina recursos locais, fontes externas e cache de última resposta válida. Não substitui serviços oficiais de emergência.
        </p>
      </footer>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/98 shadow-[0_-12px_35px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-border/50 dark:bg-background/98 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navegação principal"
      >
        <button
          type="button"
          onClick={() => void detectGps()}
          className="flex min-h-10 w-full items-center justify-between gap-3 border-b border-slate-200 px-3 py-1.5 text-left dark:border-slate-800"
          aria-label="Atualizar localização GPS"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${
              point?.source === 'gps'
                ? 'bg-emerald-500'
                : geoPermission === 'denied'
                  ? 'bg-red-500'
                  : 'bg-amber-500'
            }`} />
            <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
              {mobileLocationLabel}
            </span>
          </span>
          <span className="flex flex-shrink-0 items-center gap-1 text-[10px] font-bold tracking-[0.08em] text-blue-800 dark:text-blue-300">
            {mobileLocationSource}
            <RefreshCw className={`h-3.5 w-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
          </span>
        </button>

        <div className="grid grid-cols-[88px_minmax(0,1fr)]">
          <button
            type="button"
            onClick={() => handleTabClick(EMERGENCY_TAB.key)}
            aria-label="SOS"
            aria-current={tab === 'emergency' ? 'page' : undefined}
            className={`relative flex min-h-[72px] flex-col items-center justify-center gap-1 border-r border-slate-200 px-2 py-2 text-xs font-black transition dark:border-slate-800 ${
              tab === 'emergency'
                ? 'bg-red-700 text-white'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            <Siren className="h-6 w-6" />
            <span>SOS</span>
            <span className="text-[9px] font-semibold opacity-90">Emergência</span>
          </button>

          <div
            ref={mobileNavRef}
            className="flex snap-x snap-mandatory items-stretch overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {MOBILE_TABS.map((item) => {
              const Icon = item.icon
              const active = tab === item.key

              return (
                <button
                  key={item.key}
                  type="button"
                  data-mobile-tab={item.key}
                  onClick={() => handleTabClick(item.key)}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-[72px] min-w-[82px] snap-center flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                    active
                      ? 'bg-blue-50 text-[#10275a] dark:bg-blue-950/40 dark:text-white'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900'
                  }`}
                >
                  {active && (
                    <span className="absolute left-3 right-3 top-0 h-1 rounded-b-full bg-[#10275a] dark:bg-blue-300" />
                  )}
                  <Icon className={`h-5 w-5 ${active ? 'scale-105' : ''}`} />
                  <span className="max-w-[76px] truncate">{item.short}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto bg-[#f7f8fa] dark:bg-background">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-lg text-[#10275a] dark:text-foreground">
              <Menu className="h-5 w-5" />
              Menu rápido AUSSY · todos os módulos
            </SheetTitle>
            <SheetDescription className="text-sm leading-5">
              Acesso completo em uma única visão. No celular, os mesmos módulos permanecem disponíveis diretamente na barra inferior.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-5">
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">
                Essencial
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TABS.filter((item) => ESSENTIAL_TABS.includes(item.key)).map(menuItem)}
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">
                Explorar
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TABS.filter((item) => SECONDARY_TABS.includes(item.key)).map(menuItem)}
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 sm:grid-cols-2">
            {installPrompt && (
              <Button onClick={handleInstall} variant="outline" className="min-h-11 justify-start">
                <Download className="mr-2 h-4 w-4" />
                Instalar AUSSY.SOS
              </Button>
            )}
            <Button onClick={toggleTheme} variant="outline" className="min-h-11 justify-start">
              {resolvedTheme === 'dark'
                ? <Sun className="mr-2 h-4 w-4" />
                : <Moon className="mr-2 h-4 w-4" />}
              Alternar tema
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <QuickShare initialPoint={point} />
      <QrLocation open={qrLocOpen} onOpenChange={setQrLocOpen} initialPoint={point} />
    </div>
  )
}
