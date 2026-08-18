'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Satellite, RefreshCw, Globe2, ExternalLink, Clock3 } from 'lucide-react'
import { DataProvenance } from '@/components/aussy/data-provenance'

interface EonetEvent {
  id: string
  title: string
  category: string
  categoryLabel: string
  date: string
  coords: { lat: number; lon: number }
  source?: string
  closed: boolean
  closedAt?: string | null
  distanceKm: number
}

interface EonetResponse {
  offline: boolean
  dataQuality?: 'live-eonet' | 'unavailable'
  source?: string
  sourceUrl?: string
  queriedAt?: string
  events: EonetEvent[]
  total: number
  note?: string
  error?: string
  servedFromCache?: boolean
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
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Math.max(0, Date.now() - date.getTime())
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return `${Math.floor(diff / 60000)}min atrás`
  if (hours < 24) return `${hours}h atrás`
  return `${Math.floor(hours / 24)}d atrás`
}

interface Props {
  lat: number
  lon: number
}

export function EonetCard({ lat, lon }: Props) {
  const [data, setData] = useState<EonetResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [radius, setRadius] = useState(1000)

  const fetchEvents = async (nextRadius = radius) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/eonet?lat=${lat}&lon=${lon}&raio=${nextRadius}&dias=30&status=open`, { cache: 'no-store' })
      const servedFromCache =
        res.headers.get('X-Aussy-Cached') === 'true' ||
        res.headers.get('X-Aussy-Offline') === 'true'
      const json: EonetResponse = await res.json()
      const normalized = { ...json, servedFromCache }
      setData(normalized)

      if (!res.ok && !servedFromCache) {
        setError(json.note || 'NASA EONET indisponível nesta consulta.')
      }
    } catch {
      setError('NASA EONET indisponível e sem última cópia válida para esta localização.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(() => fetchEvents(), 30 * 60 * 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, radius])

  const events = data?.events || []
  const cached = Boolean(data?.servedFromCache)

  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
              <Satellite className="h-4 w-4 text-purple-400" />
            </div>
            Eventos Naturais — NASA EONET
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className={`text-[10px] font-mono-jet ${
                cached
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : data && !data.offline
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-secondary/30 text-muted-foreground border-border/40'
              }`}
            >
              {cached ? 'CACHE' : data && !data.offline ? 'EONET' : 'INDISP.'}
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
          Catálogo EONET v3 de eventos curados por múltiplas fontes · filtro local por distância
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {data && (
          <DataProvenance
            quality={cached ? 'cached' : data.offline ? 'unknown' : 'live'}
            source={data.source || 'NASA EONET v3'}
            updatedAt={data.queriedAt}
            note={
              cached
                ? 'Última resposta válida preservada pelo Service Worker; os eventos podem ter mudado desde a consulta original.'
                : data.note
            }
            compact
          />
        )}

        {cached && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-300 flex gap-1.5">
            <Clock3 className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Esta lista vem do cache. Confirme o estado do evento quando a conexão voltar.</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Raio:</span>
          {[500, 1000, 2000, 5000].map((option) => (
            <button
              key={option}
              onClick={() => setRadius(option)}
              className={`px-2 py-0.5 rounded font-mono-jet ${
                radius === option
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                  : 'bg-secondary/50 text-muted-foreground border border-transparent hover:border-purple-500/30'
              }`}
            >
              {option >= 1000 ? `${option / 1000}k km` : `${option}km`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((index) => (
              <div key={index} className="h-16 rounded-lg bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            {error}
          </div>
        ) : events.length === 0 ? (
          <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 text-center">
            <Globe2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">
              {cached
                ? 'A última cópia válida não contém eventos neste filtro'
                : 'A consulta atual do EONET não retornou eventos neste filtro'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Isso não equivale a afirmar ausência de qualquer risco natural na região.
            </p>
          </div>
        ) : (
          <>
            {events.slice(0, 10).map((event) => {
              const colors = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.severeStorms
              const icon = CATEGORY_ICONS[event.category] || '⚠️'
              return (
                <div
                  key={event.id}
                  className={`p-2.5 rounded-lg border ${colors.border} ${colors.bg}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={`text-[9px] font-mono-jet ${colors.text} border-current`}>
                          {event.categoryLabel}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono-jet">
                          {event.distanceKm >= 1000 ? `${(event.distanceKm / 1000).toFixed(1)}k km` : `${event.distanceKm} km`}
                        </span>
                        {event.date && (
                          <span className="text-[10px] text-muted-foreground font-mono-jet">
                            {timeAgo(event.date)}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono-jet">
                          {event.closed ? 'fechado' : 'aberto'}
                        </span>
                      </div>
                    </div>
                    {event.source && (
                      <a
                        href={event.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Abrir fonte do evento"
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
          <span className="font-mono-jet text-purple-400">NASA EONET v3</span> cataloga eventos a partir de múltiplas fontes e relaciona categorias a camadas de observação. Não é um sensor nem garantia de risco local em tempo real.
        </div>
      </CardContent>
    </Card>
  )
}
