'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Sun, Cloud, CloudRain, MapPin, Droplets, Wind } from 'lucide-react'

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

interface Props {
  lat: number
  lon: number
}

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
      const qLat = lat.toFixed(4)
      const qLon = lon.toFixed(4)
      const res = await fetch(`/api/cptec/forecast?lat=${qLat}&lon=${qLon}`, { cache: 'no-store' })
      const servedFromCache =
        res.headers.get('X-Aussy-Cached') === 'true' ||
        res.headers.get('X-Aussy-Offline') === 'true'
      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(
          payload?.note ||
          payload?.message ||
          'Não foi possível confirmar a previsão meteorológica agora.'
        )
      }

      if (!payload || !Array.isArray(payload.days)) {
        throw new Error('A fonte meteorológica retornou uma resposta inválida.')
      }

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
    <Card className="border-cyan-500/30 bg-cyan-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Sun className="h-4 w-4 text-cyan-400" />
            </div>
            Previsão do Tempo
          </CardTitle>
          <div className="flex items-center gap-1">
            {hasForecast && (
              <Badge
                variant="outline"
                className={`text-[10px] font-mono-jet ${
                  cached
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {cached ? 'CACHE' : 'AO VIVO'}
              </Badge>
            )}
            {!loading && !hasForecast && (
              <Badge variant="outline" className="text-[10px] font-mono-jet text-muted-foreground border-border/50">
                INDISP.
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => void fetchForecast()}
              disabled={loading}
              aria-label="Atualizar previsão do tempo"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {data?.city?.name
            ? `${data.city.name}${data.city.uf ? ` · ${data.city.uf}` : ''}`
            : `${lat.toFixed(4)}, ${lon.toFixed(4)}`}
          {hasForecast ? ` · ${data?.days.length} períodos` : ''}
        </p>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="h-28 rounded-lg bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : hasForecast && data ? (
          <>
            {error && (
              <div className="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300">
                A atualização falhou; mantendo a última previsão confirmada exibida. {error}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {data.days.map((day, index) => {
                const rain = day.rainProbability !== null && day.rainProbability > 30
                const hot = day.max !== null && day.max >= 35
                const cold = day.min !== null && day.min <= 5
                return (
                  <div
                    key={`${day.date}-${index}`}
                    className={`p-3 rounded-lg border ${
                      index === 0
                        ? 'border-cyan-500/50 bg-cyan-500/10'
                        : 'border-border/40 bg-secondary/20'
                    } flex flex-col items-center text-center gap-1`}
                  >
                    <span className={`text-[10px] font-mono-jet uppercase ${index === 0 ? 'text-cyan-400 font-bold' : 'text-muted-foreground'}`}>
                      {day.periodLabel || (index === 0 ? 'Próximas 24h' : day.dayOfWeek)}
                    </span>
                    <span className="text-2xl" aria-hidden="true">{day.icon}</span>
                    <span className="text-xs font-medium leading-tight">{day.conditionLabel}</span>
                    <div className="flex items-center gap-1 text-xs font-mono-jet">
                      <span className="text-red-400">{tempLabel(day.max)}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-sky-400">{tempLabel(day.min)}</span>
                    </div>
                    {day.rainProbability !== null && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${rain ? 'text-sky-400' : 'text-muted-foreground'}`}>
                        <CloudRain className="h-2.5 w-2.5" />
                        {Math.round(day.rainProbability)}%
                      </span>
                    )}
                    <div className="flex flex-wrap justify-center gap-x-2 text-[9px] text-muted-foreground">
                      {day.humidity !== null && (
                        <span className="flex items-center gap-0.5"><Droplets className="h-2.5 w-2.5" />{Math.round(day.humidity)}%</span>
                      )}
                      {day.wind && (
                        <span className="flex items-center gap-0.5"><Wind className="h-2.5 w-2.5" />{day.wind}</span>
                      )}
                    </div>
                    {hot && <span className="text-[10px] text-red-400 font-mono-jet">⚠ Calor intenso</span>}
                    {cold && <span className="text-[10px] text-sky-300 font-mono-jet">⚠ Frio intenso</span>}
                  </div>
                )
              })}
            </div>
            {data.note && (
              <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300">
                {data.note}
              </div>
            )}
            <div className="pt-2 mt-2 border-t border-border/30 flex items-start gap-1.5 text-[10px] text-muted-foreground">
              <Cloud className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Fonte: {data.source || 'fonte meteorológica indisponível'}.
                {data.sourceUrl && (
                  <> <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Ver fonte</a>.</>
                )}
                {' '}Em clima severo, siga as orientações da Defesa Civil (199).
              </span>
            </div>
          </>
        ) : (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            {error || 'Nenhuma previsão confirmada disponível para estas coordenadas.'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
