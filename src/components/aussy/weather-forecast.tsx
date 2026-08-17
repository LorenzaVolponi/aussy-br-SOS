'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Sun, Cloud, CloudRain, MapPin } from 'lucide-react'

interface ForecastDay {
  date: string
  dayOfWeek: string
  condition: string
  conditionLabel: string
  min: number
  max: number
  icon: string
  wind: string
  humidity: number
  rainProbability?: number
}

interface ForecastData {
  city?: { id: number; name: string; uf: string }
  days: ForecastDay[]
  offline: boolean
  note?: string
  source: string
}

interface Props {
  lat: number
  lon: number
}

export function WeatherForecast({ lat, lon }: Props) {
  const [data, setData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchForecast = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cptec/forecast?lat=${lat}&lon=${lon}`)
      if (!res.ok) throw new Error('Falha ao buscar previsão')
      const d = await res.json()
      setData(d)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchForecast()
    const i = setInterval(() => fetchForecast(), 60 * 60 * 1000)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon])

  return (
    <Card className="border-cyan-500/30 bg-cyan-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Sun className="h-4 w-4 text-cyan-400" />
            </div>
            Previsão do Tempo — CPTEC/INPE
          </CardTitle>
          <div className="flex items-center gap-1">
            {data?.offline ? (
              <Badge variant="outline" className="text-[10px] font-mono-jet bg-amber-500/10 text-amber-400 border-amber-500/30">
                ESTIMADO
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-mono-jet bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                AO VIVO
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fetchForecast} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {data?.city ? `${data.city.name} · ${data.city.uf}` : 'detectando cidade...'} · 4 dias
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            {error}
          </div>
        ) : data?.days && data.days.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {data.days.map((d, i) => {
                const isToday = i === 0
                const rain = d.rainProbability !== undefined && d.rainProbability > 30
                const hot = d.max >= 35
                const cold = d.min <= 5
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${
                      isToday
                        ? 'border-cyan-500/50 bg-cyan-500/10'
                        : 'border-border/40 bg-secondary/20'
                    } flex flex-col items-center text-center gap-1`}
                  >
                    <span className={`text-[10px] font-mono-jet uppercase ${isToday ? 'text-cyan-400 font-bold' : 'text-muted-foreground'}`}>
                      {isToday ? 'Hoje' : d.dayOfWeek}
                    </span>
                    <span className="text-2xl">{d.icon}</span>
                    <span className="text-xs font-medium leading-tight">{d.conditionLabel}</span>
                    <div className="flex items-center gap-1 text-xs font-mono-jet">
                      <span className="text-red-400">{d.max}°</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-sky-400">{d.min}°</span>
                    </div>
                    {d.rainProbability !== undefined && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${rain ? 'text-sky-400' : 'text-muted-foreground'}`}>
                        <CloudRain className="h-2.5 w-2.5" />
                        {d.rainProbability}%
                      </span>
                    )}
                    {hot && (
                      <span className="text-[10px] text-red-400 font-mono-jet">⚠ Calor extremo</span>
                    )}
                    {cold && (
                      <span className="text-[10px] text-sky-300 font-mono-jet">⚠ Frio intenso</span>
                    )}
                  </div>
                )
              })}
            </div>
            {data.note && (
              <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300">
                {data.note}
              </div>
            )}
            <div className="pt-2 mt-2 border-t border-border/30 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Cloud className="h-3 w-3" />
              <span>
                Fonte: CPTEC/INPE — previsão oficial brasileira. Em clima severo, siga orientações da Defesa Civil (199).
              </span>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum dado disponível</p>
        )}
      </CardContent>
    </Card>
  )
}
