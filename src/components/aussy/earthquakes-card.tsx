'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, RefreshCw, AlertTriangle, Waves, Globe2 } from 'lucide-react'

interface QuakeEvent {
  id: string
  magnitude: number
  place: string
  time: number
  url: string
  coords: { lat: number; lon: number; depth: number }
  distanceKm?: number
  severity: 'baixo' | 'moderado' | 'forte' | 'major' | 'great'
  tsunami: boolean
}

const SEVERITY_STYLE: Record<QuakeEvent['severity'], { color: string; label: string; bg: string }> = {
  baixo: { color: 'text-sky-400', label: 'Baixo', bg: 'bg-sky-500/10 border-sky-500/30' },
  moderado: { color: 'text-amber-400', label: 'Moderado', bg: 'bg-amber-500/10 border-amber-500/30' },
  forte: { color: 'text-orange-400', label: 'Forte', bg: 'bg-orange-500/10 border-orange-500/30' },
  major: { color: 'text-red-400', label: 'Grande', bg: 'bg-red-500/10 border-red-500/30' },
  great: { color: 'text-fuchsia-400', label: 'Catastrófico', bg: 'bg-fuchsia-500/10 border-fuchsia-500/30' },
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}min atrás`
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

interface Props {
  lat: number
  lon: number
}

export function EarthquakesCard({ lat, lon }: Props) {
  const [events, setEvents] = useState<QuakeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [radius, setRadius] = useState(500)

  const fetchEvents = async (r = radius) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/earthquakes?lat=${lat}&lon=${lon}&raio=${r}&mag=2.5&dias=7`)
      if (!res.ok) throw new Error('Falha ao buscar')
      const data = await res.json()
      setEvents(data.events || [])
      setOffline(!!data.offline)
    } catch (e: any) {
      setError(e.message)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
    // refresh a cada 5 min
    const i = setInterval(() => fetchEvents(), 5 * 60 * 1000)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, radius])

  return (
    <Card className="border-sky-500/30 bg-sky-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
              <Activity className="h-4 w-4 text-sky-400" />
            </div>
            Sismos — USGS
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className={`text-[10px] font-mono-jet ${
                offline ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {offline ? 'CACHE' : 'AO VIVO'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => fetchEvents()}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Terremotos nos últimos 7 dias · raio de {radius} km · fonte USGS Earthquake Hazards Program
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Controle de raio */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Raio:</span>
          {[200, 500, 1000, 2000].map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-2 py-0.5 rounded font-mono-jet ${
                radius === r
                  ? 'bg-sky-500/30 text-sky-300 border border-sky-500/50'
                  : 'bg-secondary/50 text-muted-foreground border border-transparent hover:border-sky-500/30'
              }`}
            >
              {r}km
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            {error}
          </div>
        ) : events.length === 0 ? (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
            <Waves className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-300">
              Nenhum sismo registrado no raio
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Brasil é zona de baixa sismicidade — eventos M&gt;4.5 são raros
            </p>
          </div>
        ) : (
          <>
            {events.slice(0, 8).map((e) => {
              const style = SEVERITY_STYLE[e.severity]
              return (
                <a
                  key={e.id}
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-2.5 rounded-lg border ${style.bg} hover:scale-[1.01] transition-transform`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-lg font-bold ${style.color} font-mono-jet`}>
                          M{e.magnitude.toFixed(1)}
                        </span>
                        <Badge variant="outline" className={`text-[9px] font-mono-jet ${style.color} border-current`}>
                          {style.label}
                        </Badge>
                        {e.tsunami && (
                          <Badge variant="outline" className="text-[9px] font-mono-jet text-cyan-400 border-cyan-500/50 bg-cyan-500/10">
                            ⚠ TSUNAMI
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-medium truncate">{e.place}</p>
                      <p className="text-[10px] text-muted-foreground font-mono-jet">
                        {e.distanceKm}km · {e.coords.depth}km profund. · {timeAgo(e.time)}
                      </p>
                    </div>
                    <Globe2 className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </a>
              )
            })}
            {events.length > 8 && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                +{events.length - 8} eventos fora desta visualização
              </p>
            )}
          </>
        )}

        <div className="pt-2 mt-2 border-t border-border/30 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <AlertTriangle className="h-3 w-3" />
          <span>
            Em caso de tsunami costeiro: suba para terreno alto &gt;30m. Brasil tem baixo risco, mas costa litorânea pode ser afetada por teletsunamis.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
