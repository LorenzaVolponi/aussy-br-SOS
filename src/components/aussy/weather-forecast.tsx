'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Sun, Cloud, CloudRain, MapPin, Droplets, Wind, ExternalLink } from 'lucide-react'

interface ForecastDay {
  date: string
  dayOfWeek: string
  periodLabel?: string
  condition: string
  conditionLabel: string
  min: number | null
  max: number | null
  icon: string
  wind: string | null
  humidity: number | null
  rainProbability: number | null
}

interface ForecastData {
  city?: { id?: number | string; name: string; uf: string } | null
  center?: { lat: number; lon: number } | null
  days: ForecastDay[]
  offline: boolean
  note?: string
  source: string
  sourceUrl?: string
  attribution?: string
  dataQuality?: string
  queriedAt?: string
  updatedAt?: string | null
}

interface Props { lat: number; lon: number }

function tempLabel(value: number | null) {
  return value === null ? '—' : `${Math.round(value)}°`
}

export function WeatherForecast({ lat, lon }: Props) {
  const [data, setData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cached, setCached] = useState(false)

  const fetchForecast = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cptec/forecast?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`, { cache: 'no-store' })
      const servedFromCache = res.headers.get('X-Aussy-Cached') === 'true' || res.headers.get('X-Aussy-Offline') === 'true'
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.note || payload?.message || 'Não foi possível confirmar a previsão meteorológica agora.')
      if (!payload || !Array.isArray(payload.days)) throw new Error('A fonte meteorológica retornou uma resposta inválida.')
      setCached(servedFromCache || Boolean(payload.offline))
      setData({ ...payload, offline: servedFromCache || Boolean(payload.offline) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao buscar previsão meteorológica.')
    } finally {
      setLoading(false)
    }
  }, [lat, lon])

  useEffect(() => {
    void fetchForecast()
    const interval = window.setInterval(() => void fetchForecast(), 60 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [fetchForecast])

  const hasForecast = Boolean(data?.days?.length)

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-slate-50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"><Sun className="h-5 w-5" /></span>Previsão meteorológica</CardTitle>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400"><MapPin className="h-4 w-4" />{data?.city?.name ? `${data.city.name}${data.city.uf ? ` · ${data.city.uf}` : ''}` : `${lat.toFixed(4)}, ${lon.toFixed(4)}`}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasForecast && <Badge variant="outline" className={`px-2 py-1 text-xs font-semibold ${cached ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300' : 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'}`}>{cached ? 'CACHE' : 'MODELO ATUAL'}</Badge>}
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => void fetchForecast()} disabled={loading} aria-label="Atualizar previsão do tempo"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !data ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{[1, 2, 3, 4].map((index) => <div key={index} className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />)}</div>
        ) : hasForecast && data ? (
          <>
            {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">A atualização falhou; mantendo a última previsão confirmada exibida. {error}</div>}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {data.days.map((day, index) => {
                const rain = day.rainProbability !== null && day.rainProbability > 30
                const hot = day.max !== null && day.max >= 35
                const cold = day.min !== null && day.min <= 5
                return (
                  <div key={`${day.date}-${index}`} className={`flex min-h-[150px] flex-col items-center gap-1.5 rounded-xl border p-3 text-center ${index === 0 ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/25' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900'}`}>
                    <span className={`text-xs font-semibold uppercase tracking-[0.06em] ${index === 0 ? 'text-blue-800 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>{day.periodLabel || (index === 0 ? 'Próximas 24h' : day.dayOfWeek)}</span>
                    <span className="text-2xl" aria-hidden="true">{day.icon}</span>
                    <span className="text-sm font-semibold leading-5 text-slate-900 dark:text-slate-100">{day.conditionLabel}</span>
                    <div className="flex items-center gap-1 text-sm font-semibold"><span className="text-red-700 dark:text-red-300">{tempLabel(day.max)}</span><span className="text-slate-400">/</span><span className="text-blue-700 dark:text-blue-300">{tempLabel(day.min)}</span></div>
                    {day.rainProbability !== null && <span className={`flex items-center gap-1 text-xs font-medium ${rain ? 'text-blue-800 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}><CloudRain className="h-3.5 w-3.5" />{Math.round(day.rainProbability)}%</span>}
                    <div className="flex flex-wrap justify-center gap-x-2 text-xs text-slate-600 dark:text-slate-400">{day.humidity !== null && <span className="flex items-center gap-1"><Droplets className="h-3 w-3" />{Math.round(day.humidity)}%</span>}{day.wind && <span className="flex items-center gap-1"><Wind className="h-3 w-3" />{day.wind}</span>}</div>
                    {hot && <span className="text-xs font-semibold text-red-700 dark:text-red-300">⚠ Calor intenso</span>}
                    {cold && <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">⚠ Frio intenso</span>}
                  </div>
                )
              })}
            </div>
            {data.note && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">{data.note}</div>}
            <div className="flex items-start gap-2 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:text-slate-400">
              <Cloud className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>Fonte de previsão: {data.source || 'fonte meteorológica indisponível'}. {data.sourceUrl && <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-800 underline underline-offset-2 dark:text-blue-300">Ver fonte <ExternalLink className="h-3 w-3" /></a>} Em clima severo, priorize os alertas oficiais do INMET e as orientações da Defesa Civil (199).</span>
            </div>
          </>
        ) : <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200">{error || 'Nenhuma previsão confirmada disponível para estas coordenadas.'}</div>}
      </CardContent>
    </Card>
  )
}
