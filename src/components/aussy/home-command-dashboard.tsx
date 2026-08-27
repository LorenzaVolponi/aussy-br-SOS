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
  Flame,
  HeartPulse,
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

type CommandTab =
  | 'home'
  | 'emergency'
  | 'clima'
  | 'mapa'
  | 'natureza'
  | 'satellites'
  | 'sensores'
  | 'defesa'
  | 'tools'

type QuickKey =
  | 'emergency'
  | 'alerts'
  | 'weather'
  | 'map'
  | 'contacts'
  | 'defesa'
  | 'satellites'
  | 'natureza'
  | 'sensores'
  | 'tools'

interface WeatherDay {
  conditionLabel?: string
  icon?: string
  min?: number | null
  max?: number | null
  humidity?: number | null
  rainProbability?: number | null
}

interface WeatherSummary {
  days?: WeatherDay[]
  source?: string
  offline?: boolean
  queriedAt?: string
  updatedAt?: string | null
}

interface AlertSummary {
  total?: number
  online?: boolean
  cached?: boolean
  stale?: boolean
  fetchedAt?: string
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
const DEFAULT_QUICK: QuickKey[] = ['emergency', 'alerts', 'weather', 'map', 'contacts', 'satellites']

const QUICK_ACTIONS: Record<QuickKey, {
  label: string
  caption: string
  icon: typeof Activity
  tab: CommandTab
  tone: string
  iconTone: string
}> = {
  emergency: {
    label: 'SOS',
    caption: 'Emergência',
    icon: Siren,
    tab: 'emergency',
    tone: 'border-red-200 bg-red-50 hover:bg-red-100/80 dark:border-red-900/60 dark:bg-red-950/25 dark:hover:bg-red-950/40',
    iconTone: 'bg-red-600 text-white',
  },
  alerts: {
    label: 'Alertas',
    caption: 'Oficiais',
    icon: AlertTriangle,
    tab: 'clima',
    tone: 'border-orange-200 bg-orange-50 hover:bg-orange-100/80 dark:border-orange-900/60 dark:bg-orange-950/20 dark:hover:bg-orange-950/35',
    iconTone: 'bg-orange-500 text-white',
  },
  weather: {
    label: 'Clima',
    caption: 'Previsão',
    icon: CloudSun,
    tab: 'clima',
    tone: 'border-blue-200 bg-blue-50 hover:bg-blue-100/80 dark:border-blue-900/60 dark:bg-blue-950/25 dark:hover:bg-blue-950/40',
    iconTone: 'bg-blue-500 text-white',
  },
  map: {
    label: 'Mapa',
    caption: 'Localização',
    icon: MapIcon,
    tab: 'mapa',
    tone: 'border-violet-200 bg-violet-50 hover:bg-violet-100/80 dark:border-violet-900/60 dark:bg-violet-950/25 dark:hover:bg-violet-950/40',
    iconTone: 'bg-violet-600 text-white',
  },
  contacts: {
    label: 'Contatos',
    caption: 'Emergência',
    icon: ContactRound,
    tab: 'emergency',
    tone: 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100/80 dark:border-indigo-900/60 dark:bg-indigo-950/25 dark:hover:bg-indigo-950/40',
    iconTone: 'bg-indigo-700 text-white',
  },
  defesa: {
    label: 'Defesa Civil',
    caption: 'Proteção',
    icon: Shield,
    tab: 'defesa',
    tone: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/40',
    iconTone: 'bg-emerald-600 text-white',
  },
  satellites: {
    label: 'Satélites',
    caption: 'Orbital',
    icon: Satellite,
    tab: 'satellites',
    tone: 'border-sky-200 bg-sky-50 hover:bg-sky-100/80 dark:border-sky-900/60 dark:bg-sky-950/25 dark:hover:bg-sky-950/40',
    iconTone: 'bg-sky-700 text-white',
  },
  natureza: {
    label: 'Natureza',
    caption: 'Rios e eventos',
    icon: Waves,
    tab: 'natureza',
    tone: 'border-teal-200 bg-teal-50 hover:bg-teal-100/80 dark:border-teal-900/60 dark:bg-teal-950/25 dark:hover:bg-teal-950/40',
    iconTone: 'bg-teal-600 text-white',
  },
  sensores: {
    label: 'Sensores',
    caption: 'Bússola e GPS',
    icon: RadioTower,
    tab: 'sensores',
    tone: 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100/80 dark:border-cyan-900/60 dark:bg-cyan-950/25 dark:hover:bg-cyan-950/40',
    iconTone: 'bg-cyan-700 text-white',
  },
  tools: {
    label: 'Ferramentas',
    caption: 'Resiliência',
    icon: Wrench,
    tab: 'tools',
    tone: 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
    iconTone: 'bg-slate-700 text-white',
  },
}

function validQuickKeys(value: unknown): QuickKey[] | null {
  if (!Array.isArray(value)) return null
  const keys = value.filter((item): item is QuickKey => typeof item === 'string' && item in QUICK_ACTIONS)
  const unique = Array.from(new Set(keys)).slice(0, 6)
  return unique.length >= 3 ? unique : null
}

function numberLabel(value: number | null | undefined, suffix = '°') {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}${suffix}` : '—'
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
      // Prefer the safe default when local storage is unavailable or malformed.
    } finally {
      setQuickLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!quickLoaded || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quickKeys))
    } catch {
      // Personalization is optional; the dashboard remains functional without storage.
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
        const cached = Boolean(
          payload.cached ||
          response.headers.get('X-Aussy-Cached') === 'true' ||
          response.headers.get('X-Aussy-Offline') === 'true'
        )
        setAlerts({
          total: typeof payload.total === 'number' ? payload.total : undefined,
          online: Boolean(payload.online),
          cached,
          stale: false,
          fetchedAt: payload.fetchedAt,
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
    if (typeof window === 'undefined') return
    const timer = window.setInterval(() => void loadAlerts(), 30 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [loadAlerts])

  const firstWeather = weather?.days?.[0]
  const locationTitle = cityName || point?.city || (point ? 'Localização disponível' : 'Localização pendente')
  const alertCount = typeof alerts?.total === 'number' ? alerts.total : null
  const alertLabel = alertsLoading && !alerts
    ? 'Consultando alertas'
    : alerts?.stale
      ? alertCount === null
        ? 'Última consulta de alertas indisponível'
        : `${alertCount} alerta${alertCount === 1 ? '' : 's'} na última consulta`
      : alerts?.error && !alerts.cached
        ? 'INMET indisponível nesta consulta'
        : alerts?.cached
          ? alertCount === null
            ? 'Alertas em cache'
            : `${alertCount} alerta${alertCount === 1 ? '' : 's'} em cache`
          : alertCount === null
            ? 'Consultar alertas oficiais'
            : alertCount > 0
              ? `${alertCount} alerta${alertCount === 1 ? '' : 's'} INMET`
              : 'INMET sem alertas retornados agora'

  const systemLabel = !networkOnline
    ? 'Modo offline ativo'
    : !point
      ? 'Rede ativa · localização pendente'
      : 'Sistema operacional'

  const availableToAdd = useMemo(
    () => (Object.keys(QUICK_ACTIONS) as QuickKey[]).filter((key) => !quickKeys.includes(key)),
    [quickKeys]
  )

  const moveQuick = (index: number, direction: -1 | 1) => {
    setQuickKeys((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const removeQuick = (key: QuickKey) => {
    setQuickKeys((current) => current.length <= 3 ? current : current.filter((item) => item !== key))
  }

  const addQuick = (key: QuickKey) => {
    setQuickKeys((current) => current.length >= 6 || current.includes(key) ? current : [...current, key])
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <button
          onClick={onRefreshLocation}
          className="group rounded-[22px] border border-slate-200 bg-white p-5 text-left shadow-[0_10px_35px_rgba(15,23,42,0.06)] transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <MapPin className="h-4 w-4 text-blue-700 dark:text-blue-300" /> Localização atual
              </div>
              <h1 className="mt-3 truncate text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50 sm:text-3xl">{locationTitle}</h1>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{geoLoading ? 'Atualizando localização…' : `${locationStatus} · ${locationSource}`}</p>
            </div>
            <span className={`mt-1 inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${networkOnline ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${networkOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {networkOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Posição</p>
              <p className="mt-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                {point ? `${point.lat.toFixed(4)}°, ${point.lon.toFixed(4)}°` : 'Aguardando coordenadas válidas'}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600 dark:text-slate-600" />
          </div>
        </button>

        <button
          onClick={() => onNavigate('clima')}
          className="rounded-[22px] border border-slate-200 bg-white p-5 text-left shadow-[0_10px_35px_rgba(15,23,42,0.06)] transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <CloudSun className="h-4 w-4 text-blue-600 dark:text-blue-300" /> Previsão
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{weather?.offline ? 'CACHE' : weather ? 'AO VIVO' : weatherLoading ? 'BUSCANDO' : '—'}</span>
          </div>
          {point ? (
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-slate-50">{numberLabel(firstWeather?.max)}</span>
                  <span className="pb-1 text-sm text-slate-400">máx.</span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">{firstWeather?.conditionLabel || (weatherLoading ? 'Consultando previsão…' : 'Previsão disponível no módulo Clima')}</p>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                <div>Mín. {numberLabel(firstWeather?.min)}</div>
                {typeof firstWeather?.rainProbability === 'number' && <div className="mt-1">Chuva {Math.round(firstWeather.rainProbability)}%</div>}
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-slate-500 dark:text-slate-400">Autorize a localização para consultar a previsão correspondente à sua posição.</p>
          )}
        </button>
      </div>

      <button
        onClick={() => onNavigate('clima')}
        className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 text-left transition ${alertCount && alertCount > 0 && !alerts?.error ? 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100/70 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-200' : 'border-orange-200 bg-orange-50/70 text-orange-800 hover:bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/20 dark:text-orange-200'}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${alertCount && alertCount > 0 && !alerts?.error ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{alertLabel}</div>
            <div className="mt-0.5 text-[10px] opacity-70">Fonte INMET · cache e indisponibilidade são identificados</div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0" />
      </button>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.055)] dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Ações rápidas</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">O essencial em até dois toques.</p>
          </div>
          <button
            onClick={() => setEditingQuick((current) => !current)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:text-blue-300"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> {editingQuick ? 'Concluir' : 'Editar'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {quickKeys.map((key, index) => {
            const action = QUICK_ACTIONS[key]
            const Icon = action.icon
            return (
              <div key={key} className="relative">
                <button
                  onClick={() => editingQuick ? undefined : onNavigate(action.tab)}
                  className={`flex min-h-[118px] w-full flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center transition ${action.tone}`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${action.iconTone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{action.label}</span>
                  <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{action.caption}</span>
                </button>
                {editingQuick && (
                  <div className="absolute inset-x-1 bottom-1 flex items-center justify-between rounded-xl bg-white/95 px-1 py-1 shadow-sm dark:bg-slate-900/95">
                    <button aria-label={`Mover ${action.label} para a esquerda`} onClick={() => moveQuick(index, -1)} disabled={index === 0} className="rounded p-1 text-slate-500 disabled:opacity-20 dark:text-slate-400"><ArrowLeft className="h-3 w-3" /></button>
                    <button onClick={() => removeQuick(key)} disabled={quickKeys.length <= 3} className="px-1 text-[9px] font-semibold uppercase tracking-wide text-red-500 disabled:opacity-20">remover</button>
                    <button aria-label={`Mover ${action.label} para a direita`} onClick={() => moveQuick(index, 1)} disabled={index === quickKeys.length - 1} className="rounded p-1 text-slate-500 disabled:opacity-20 dark:text-slate-400"><ArrowRight className="h-3 w-3" /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {editingQuick && availableToAdd.length > 0 && quickKeys.length < 6 && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Adicionar atalho</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {availableToAdd.map((key) => {
                const action = QUICK_ACTIONS[key]
                return (
                  <button key={key} onClick={() => addQuick(key)} className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:text-blue-300">
                    + {action.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={onOpenMore} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"><Sparkles className="h-4 w-4" /></span>
            <div><div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ver todos os recursos</div><div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Clima, natureza, orbital, sensores e ferramentas</div></div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
        </button>

        <button onClick={onOpenQr} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><MapPin className="h-4 w-4" /></span>
            <div><div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Compartilhar localização</div><div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">QR com a posição que o dispositivo realmente conhece</div></div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button onClick={() => onNavigate('clima')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800">
          <CloudSun className="h-5 w-5 text-blue-600 dark:text-blue-300" /><div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Clima</div><div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Previsão + INMET</div>
        </button>
        <button onClick={() => onNavigate('clima')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800">
          <HeartPulse className="h-5 w-5 text-violet-600 dark:text-violet-300" /><div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Sismos</div><div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">USGS por localização</div>
        </button>
        <button onClick={() => onNavigate('natureza')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800">
          <Flame className="h-5 w-5 text-orange-600 dark:text-orange-300" /><div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Natureza</div><div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Rios + eventos naturais</div>
        </button>
        <button onClick={() => onNavigate('satellites')} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800">
          <Satellite className="h-5 w-5 text-sky-700 dark:text-sky-300" /><div className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Satélites</div><div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Dados orbitais reais</div>
        </button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"><Shield className="h-4 w-4" /></span>
          <div className="min-w-0"><div className="truncate text-sm font-semibold">{systemLabel}</div><div className="mt-0.5 text-[10px] opacity-75">Sem cidade padrão, sem coordenada inventada e com cache identificado.</div></div>
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-40" />
      </div>
    </section>
  )
}
