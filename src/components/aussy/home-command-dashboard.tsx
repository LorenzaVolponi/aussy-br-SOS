'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CloudSun,
  ContactRound,
  Map as MapIcon,
  MapPin,
  RadioTower,
  Satellite,
  Shield,
  Siren,
  SlidersHorizontal,
  Sparkles,
  Waves,
  Wrench,
} from 'lucide-react'
import type { GeoPoint } from '@/hooks/use-geolocation'

type CommandTab = 'home' | 'emergency' | 'clima' | 'mapa' | 'natureza' | 'satellites' | 'sensores' | 'defesa' | 'tools'
type QuickKey = 'emergency' | 'alerts' | 'weather' | 'map' | 'contacts' | 'defesa' | 'satellites' | 'natureza' | 'sensores' | 'tools'

interface WeatherDay {
  conditionLabel?: string
  min?: number | null
  max?: number | null
  rainProbability?: number | null
}

interface WeatherSummary {
  days?: WeatherDay[]
  source?: string
  offline?: boolean
}

interface AlertSummary {
  total?: number
  online?: boolean
  cached?: boolean
  stale?: boolean
  error?: string
}

interface Props {
  point: GeoPoint | null
  cityName: string | null
  networkOnline: boolean
  geoLoading: boolean
  locationStatus: string
  locationSource: string
  onNavigate: (tab: CommandTab) => void
  onOpenMore: () => void
  onOpenQr: () => void
  onRefreshLocation: () => void
}

const STORAGE_KEY = 'aussy_quick_actions_v2'
const DEFAULT_QUICK: QuickKey[] = ['emergency', 'alerts', 'map', 'contacts']

const NEUTRAL_TONE = 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/60 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800 dark:hover:bg-blue-950/20'
const NEUTRAL_ICON = 'bg-[#10275a] text-white dark:bg-blue-200 dark:text-slate-950'

const QUICK_ACTIONS: Record<QuickKey, {
  label: string
  caption: string
  icon: typeof Activity
  tab: CommandTab
  tone: string
  iconTone: string
}> = {
  emergency: { label: 'SOS', caption: 'Emergência', icon: Siren, tab: 'emergency', tone: 'border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/25 dark:hover:bg-red-950/40', iconTone: 'bg-red-600 text-white' },
  alerts: { label: 'Alertas', caption: 'INMET oficial', icon: AlertTriangle, tab: 'clima', tone: 'border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/35', iconTone: 'bg-amber-600 text-white' },
  weather: { label: 'Clima', caption: 'Previsão', icon: CloudSun, tab: 'clima', tone: NEUTRAL_TONE, iconTone: NEUTRAL_ICON },
  map: { label: 'Mapa', caption: 'Mapa e rede', icon: MapIcon, tab: 'mapa', tone: NEUTRAL_TONE, iconTone: NEUTRAL_ICON },
  contacts: { label: 'Contatos', caption: 'Emergência', icon: ContactRound, tab: 'emergency', tone: NEUTRAL_TONE, iconTone: NEUTRAL_ICON },
  defesa: { label: 'Defesa Civil', caption: 'Proteção oficial', icon: Shield, tab: 'defesa', tone: NEUTRAL_TONE, iconTone: NEUTRAL_ICON },
  satellites: { label: 'Satélites', caption: 'Orbital', icon: Satellite, tab: 'satellites', tone: NEUTRAL_TONE, iconTone: NEUTRAL_ICON },
  natureza: { label: 'Rios', caption: 'SGB e ANA', icon: Waves, tab: 'natureza', tone: NEUTRAL_TONE, iconTone: NEUTRAL_ICON },
  sensores: { label: 'Sensores', caption: 'Bússola e GPS', icon: RadioTower, tab: 'sensores', tone: NEUTRAL_TONE, iconTone: NEUTRAL_ICON },
  tools: { label: 'Ferramentas', caption: 'Resiliência', icon: Wrench, tab: 'tools', tone: NEUTRAL_TONE, iconTone: NEUTRAL_ICON },
}

function validQuickKeys(value: unknown): QuickKey[] | null {
  if (!Array.isArray(value)) return null
  const keys = value.filter((item): item is QuickKey => typeof item === 'string' && item in QUICK_ACTIONS)
  const unique = Array.from(new Set(keys)).slice(0, 6)
  return unique.length >= 3 ? unique : null
}

function numberLabel(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}°` : '—'
}

export function HomeCommandDashboard({
  point,
  cityName,
  networkOnline,
  geoLoading,
  locationStatus,
  locationSource,
  onNavigate,
  onOpenMore,
  onOpenQr,
  onRefreshLocation,
}: Props) {
  const [quickKeys, setQuickKeys] = useState<QuickKey[]>(DEFAULT_QUICK)
  const [quickLoaded, setQuickLoaded] = useState(false)
  const [editingQuick, setEditingQuick] = useState(false)
  const [weather, setWeather] = useState<WeatherSummary | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [alerts, setAlerts] = useState<AlertSummary | null>(null)
  const [alertsLoading, setAlertsLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? validQuickKeys(JSON.parse(raw)) : null
      if (parsed) setQuickKeys(parsed)
    } catch {
      // Personalização é opcional; o padrão seguro continua disponível.
    } finally {
      setQuickLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!quickLoaded || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quickKeys))
    } catch {
      // Sem storage, os atalhos continuam funcionando com o estado da sessão.
    }
  }, [quickKeys, quickLoaded])

  const loadWeather = useCallback(async () => {
    if (!point) {
      setWeather(null)
      return
    }
    setWeatherLoading(true)
    try {
      const response = await fetch(`/api/cptec/forecast?lat=${point.lat.toFixed(4)}&lon=${point.lon.toFixed(4)}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (response.ok && payload && Array.isArray(payload.days)) {
        const cached = response.headers.get('X-Aussy-Cached') === 'true' || response.headers.get('X-Aussy-Offline') === 'true'
        setWeather({ ...payload, offline: Boolean(payload.offline || cached) })
      } else {
        setWeather(null)
      }
    } catch {
      setWeather(null)
    } finally {
      setWeatherLoading(false)
    }
  }, [point])

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true)
    try {
      const response = await fetch('/api/inmet/alerts', { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (payload) {
        const cached = Boolean(payload.cached || response.headers.get('X-Aussy-Cached') === 'true' || response.headers.get('X-Aussy-Offline') === 'true')
        setAlerts({
          total: typeof payload.total === 'number' ? payload.total : undefined,
          online: Boolean(payload.online),
          cached,
          stale: false,
          error: payload.error || (!response.ok && !cached ? payload.message || 'INMET indisponível' : undefined),
        })
      } else {
        setAlerts((current) => current ? { ...current, stale: true, online: false, error: 'Atualização indisponível' } : { stale: true, online: false, error: 'Atualização indisponível' })
      }
    } catch {
      setAlerts((current) => current ? { ...current, stale: true, online: false, error: 'Atualização indisponível' } : { stale: true, online: false, error: 'Atualização indisponível' })
    } finally {
      setAlertsLoading(false)
    }
  }, [])

  useEffect(() => {
    setWeather(null)
    void loadWeather()
  }, [loadWeather])

  useEffect(() => {
    void loadAlerts()
    const timer = window.setInterval(() => void loadAlerts(), 30 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [loadAlerts])

  const firstWeather = weather?.days?.[0]
  const locationTitle = cityName || point?.city || (point ? 'Localização disponível' : 'Localização pendente')
  const alertCount = typeof alerts?.total === 'number' ? alerts.total : null
  const alertLabel = alertsLoading && !alerts
    ? 'Consultando alertas oficiais…'
    : alerts?.stale
      ? alertCount === null ? 'Última consulta de alertas indisponível' : `${alertCount} alerta${alertCount === 1 ? '' : 's'} na última consulta`
      : alerts?.error && !alerts.cached
        ? 'INMET indisponível nesta consulta'
        : alerts?.cached
          ? alertCount === null ? 'Alertas em cache' : `${alertCount} alerta${alertCount === 1 ? '' : 's'} em cache`
          : alertCount === null
            ? 'Consultar alertas oficiais'
            : alertCount > 0 ? `${alertCount} alerta${alertCount === 1 ? '' : 's'} INMET` : 'INMET sem alertas retornados agora'

  const systemLabel = !networkOnline ? 'Modo offline ativo' : !point ? 'Rede ativa · localização pendente' : 'Sistema operacional'
  const availableToAdd = useMemo(() => (Object.keys(QUICK_ACTIONS) as QuickKey[]).filter((key) => !quickKeys.includes(key)), [quickKeys])

  const moveQuick = (index: number, direction: -1 | 1) => {
    setQuickKeys((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const removeQuick = (key: QuickKey) => setQuickKeys((current) => current.length <= 3 ? current : current.filter((item) => item !== key))
  const addQuick = (key: QuickKey) => setQuickKeys((current) => current.length >= 6 || current.includes(key) ? current : [...current, key])
  const quickGrid = quickKeys.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'

  return (
    <section className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <button onClick={onRefreshLocation} className="group rounded-[22px] border border-slate-200 bg-white p-5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400"><MapPin className="h-4 w-4 text-blue-700 dark:text-blue-300" /> Localização atual</div>
              <h1 className="mt-3 truncate text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50 sm:text-3xl">{locationTitle}</h1>
              <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">{geoLoading ? 'Atualizando localização…' : `${locationStatus} · ${locationSource}`}</p>
            </div>
            <span aria-live="polite" className={`mt-1 inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${networkOnline ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}><span className={`h-2 w-2 rounded-full ${networkOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />{networkOnline ? 'Online' : 'Offline'}</span>
          </div>
          <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Posição</p><p className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-300">{point ? `${point.lat.toFixed(4)}°, ${point.lon.toFixed(4)}°` : 'Aguardando coordenadas válidas'}</p></div>
            <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700 dark:text-slate-600" />
          </div>
        </button>

        <button onClick={() => onNavigate('clima')} className="rounded-[22px] border border-slate-200 bg-white p-5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400"><CloudSun className="h-4 w-4 text-blue-700 dark:text-blue-300" /> Previsão</div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{weather?.offline ? 'CACHE' : weather ? 'MODELO' : weatherLoading ? 'BUSCANDO' : '—'}</span>
          </div>
          {point ? (
            <div className="mt-4 flex items-end justify-between gap-4">
              <div><div className="flex items-end gap-2"><span className="text-4xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-slate-50">{numberLabel(firstWeather?.max)}</span><span className="pb-1 text-sm text-slate-500">máx.</span></div><p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{firstWeather?.conditionLabel || (weatherLoading ? 'Consultando previsão…' : 'Previsão no módulo Clima')}</p></div>
              <div className="text-right text-sm text-slate-600 dark:text-slate-400"><div>Mín. {numberLabel(firstWeather?.min)}</div>{typeof firstWeather?.rainProbability === 'number' && <div className="mt-1">Chuva {Math.round(firstWeather.rainProbability)}%</div>}</div>
            </div>
          ) : <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-400">Autorize a localização para consultar a previsão correspondente à sua posição.</p>}
        </button>
      </div>

      <button onClick={() => onNavigate('clima')} className={`flex min-h-[68px] w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition ${alertCount && alertCount > 0 && !alerts?.error ? 'border-red-200 bg-red-50 text-red-950 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-200' : 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200'}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${alertCount && alertCount > 0 && !alerts?.error ? 'bg-red-600' : 'bg-amber-600'} text-white`}><AlertTriangle className="h-5 w-5" /></span>
          <div className="min-w-0" aria-live="polite"><div className="truncate text-sm font-semibold">{alertLabel}</div><div className="mt-0.5 text-xs opacity-80">INMET oficial · cache e indisponibilidade identificados</div></div>
        </div>
        <ChevronRight className="h-5 w-5 flex-shrink-0" />
      </button>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)] dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">Ações rápidas</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">O essencial em até dois toques.</p></div>
          <button onClick={() => setEditingQuick((current) => !current)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:text-blue-300"><SlidersHorizontal className="h-4 w-4" /> {editingQuick ? 'Concluir' : 'Editar'}</button>
        </div>

        <div className={`mt-4 grid gap-2 sm:gap-3 ${quickGrid}`}>
          {quickKeys.map((key, index) => {
            const action = QUICK_ACTIONS[key]
            const Icon = action.icon
            return (
              <div key={key} className="relative">
                <button onClick={() => editingQuick ? undefined : onNavigate(action.tab)} className={`flex min-h-[112px] w-full flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center transition ${action.tone}`}>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${action.iconTone}`}><Icon className="h-5 w-5" /></span>
                  <span className="mt-2.5 text-sm font-semibold text-slate-950 dark:text-slate-100">{action.label}</span>
                  <span className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{action.caption}</span>
                </button>
                {editingQuick && (
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-between rounded-xl border border-slate-200 bg-white/98 px-1 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/98">
                    <button aria-label={`Mover ${action.label} para a esquerda`} onClick={() => moveQuick(index, -1)} disabled={index === 0} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 disabled:opacity-20 dark:text-slate-400"><ArrowLeft className="h-4 w-4" /></button>
                    <button onClick={() => removeQuick(key)} disabled={quickKeys.length <= 3} className="min-h-10 rounded-lg px-2 text-xs font-semibold text-red-700 disabled:opacity-20 dark:text-red-300">Remover</button>
                    <button aria-label={`Mover ${action.label} para a direita`} onClick={() => moveQuick(index, 1)} disabled={index === quickKeys.length - 1} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 disabled:opacity-20 dark:text-slate-400"><ArrowRight className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {editingQuick && availableToAdd.length > 0 && quickKeys.length < 6 && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">Adicionar atalho</p>
            <div className="mt-2 flex flex-wrap gap-2">{availableToAdd.map((key) => <button key={key} onClick={() => addQuick(key)} className="min-h-11 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:text-blue-300">+ {QUICK_ACTIONS[key].label}</button>)}</div>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={onOpenMore} className="flex min-h-[74px] items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#10275a] text-white dark:bg-slate-100 dark:text-slate-950"><Sparkles className="h-5 w-5" /></span><div><div className="text-sm font-semibold text-slate-950 dark:text-slate-100">Ver todos os recursos</div><div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">Rios, rede, satélites, sensores e ferramentas</div></div></div><ChevronRight className="h-5 w-5 text-slate-400" />
        </button>

        <button onClick={onOpenQr} className="flex min-h-[74px] items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"><MapPin className="h-5 w-5" /></span><div><div className="text-sm font-semibold text-slate-950 dark:text-slate-100">Compartilhar localização</div><div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">QR com a posição realmente disponível</div></div></div><ChevronRight className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <span className="font-semibold" aria-live="polite">{systemLabel}</span>
        <span>Sem cidade padrão, sem coordenada inventada e com cache identificado.</span>
      </div>
    </section>
  )
}
