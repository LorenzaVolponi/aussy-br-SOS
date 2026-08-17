'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Satellite, RefreshCw, Globe2, ExternalLink } from 'lucide-react'

interface EonetEvent {
  id: string
  title: string
  category: string
  categoryLabel: string
  date: string
  coords: { lat: number; lon: number }
  source?: string
  closed?: boolean
  distanceKm?: number
}

const CATEGORY_ICONS: Record<string, string> = {
  wildfires: '🔥',
  volcanoes: '🌋',
  severeStorms: '⛈️',
  seaLakeIce: '🧊',
  snow: '❄️',
  drought: '🏜️',
  dustHaze: '🌫️',
  manmade: '🏭',
  tempExtremes: '🌡️',
  waterColor: '🌊',
  landslides: '⛰️',
  earthquakes: '🌎',
  floods: '🌊',
}

const CATEGORY_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  wildfires: { border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400' },
  volcanoes: { border: 'border-orange-500/30', bg: 'bg-orange-500/5', text: 'text-orange-400' },
  severeStorms: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400' },
  seaLakeIce: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-400' },
  snow: { border: 'border-sky-500/30', bg: 'bg-sky-500/5', text: 'text-sky-400' },
  drought: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', text: 'text-yellow-400' },
  dustHaze: { border: 'border-stone-500/30', bg: 'bg-stone-500/5', text: 'text-stone-400' },
  manmade: { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400' },
  tempExtremes: { border: 'border-pink-500/30', bg: 'bg-pink-500/5', text: 'text-pink-400' },
  waterColor: { border: 'border-teal-500/30', bg: 'bg-teal-500/5', text: 'text-teal-400' },
  landslides: { border: 'border-amber-700/30', bg: 'bg-amber-700/5', text: 'text-amber-700' },
  earthquakes: { border: 'border-fuchsia-500/30', bg: 'bg-fuchsia-500/5', text: 'text-fuchsia-400' },
  floods: { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400' },
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}min atrás`
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

interface Props {
  lat: number
  lon: number
}

export function EonetCard({ lat, lon }: Props) {
  const [events, setEvents] = useState<EonetEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [radius, setRadius] = useState(1000)

  const fetchEvents = async (r = radius) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/eonet?lat=${lat}&lon=${lon}&raio=${r}&dias=30&status=open`)
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
    const i = setInterval(() => fetchEvents(), 30 * 60 * 1000)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, radius])

  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
              <Satellite className="h-4 w-4 text-purple-400" />
            </div>
            Eventos Naturais Globais — NASA EONET
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className={`text-[10px] font-mono-jet ${
                offline ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {offline ? 'CACHE' : 'NASA'}
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
          Eventos naturais em andamento nos últimos 30 dias · dados do satélite Earth Observatory da NASA
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Raio:</span>
          {[500, 1000, 2000, 5000].map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-2 py-0.5 rounded font-mono-jet ${
                radius === r
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                  : 'bg-secondary/50 text-muted-foreground border border-transparent hover:border-purple-500/30'
              }`}
            >
              {r >= 1000 ? `${r / 1000}k km` : `${r}km`}
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
            <Globe2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-300">
              Nenhum evento natural ativo no raio
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {offline ? 'Tente novamente online para dados ao vivo' : 'Boas notícias!'}
            </p>
          </div>
        ) : (
          <>
            {events.slice(0, 10).map((e) => {
              const colors = CATEGORY_COLORS[e.category] || CATEGORY_COLORS.severeStorms
              const icon = CATEGORY_ICONS[e.category] || '⚠️'
              return (
                <div
                  key={e.id}
                  className={`p-2.5 rounded-lg border ${colors.border} ${colors.bg}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{e.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={`text-[9px] font-mono-jet ${colors.text} border-current`}>
                          {e.categoryLabel}
                        </Badge>
                        {e.distanceKm !== undefined && (
                          <span className="text-[10px] text-muted-foreground font-mono-jet">
                            {e.distanceKm >= 1000 ? `${(e.distanceKm / 1000).toFixed(1)}k km` : `${e.distanceKm} km`}
                          </span>
                        )}
                        {e.date && (
                          <span className="text-[10px] text-muted-foreground font-mono-jet">
                            {timeAgo(e.date)}
                          </span>
                        )}
                      </div>
                    </div>
                    {e.source && (
                      <a
                        href={e.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
            {events.length > 10 && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                +{events.length - 10} eventos fora desta visualização
              </p>
            )}
          </>
        )}

        <div className="pt-2 mt-2 border-t border-border/30 text-[10px] text-muted-foreground">
          <span className="font-mono-jet text-purple-400">NASA EONET</span> rastreia eventos naturais ativos globalmente
          usando satélites como MODIS, VIIRS e Sentinel. Atualizado diariamente.
        </div>
      </CardContent>
    </Card>
  )
}
