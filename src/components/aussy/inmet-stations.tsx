'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Thermometer, Wind, Droplets, Gauge, Eye, RefreshCw, MapPin, CloudRain } from 'lucide-react'
import { DataProvenance } from '@/components/aussy/data-provenance'

interface Estacao {
  codigo: string
  nome: string
  uf: string
  lat: number
  lon: number
  altitude: number | null
}

interface LeituraEstacao {
  estacao: Estacao
  temperatura: number | null
  umidade: number | null
  vento_dir: number | null
  vento_vel: number | null
  vento_raj: number | null
  pressao: number | null
  chuva_1h: number | null
  chuva_24h: number | null
  visibilidade: number | null
  atualizado: string | null
}

interface InmetStationsResponse {
  online: boolean
  catalogLive?: boolean
  observationsLive?: boolean
  dataQuality?: 'live-observations' | 'live-catalog' | 'unavailable'
  fonte: string
  sourceUrl?: string
  total_estacoes: number
  proximas: LeituraEstacao[]
  fetchedAt?: string
  note?: string
  error?: string
  servedFromCache?: boolean
}

interface Props {
  lat: number
  lon: number
}

function measurementTime(value: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function InmetStations({ lat, lon }: Props) {
  const [data, setData] = useState<InmetStationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEstacoes = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/inmet/stations?lat=${lat}&lon=${lon}&raio=300`, { cache: 'no-store' })
      const servedFromCache =
        res.headers.get('X-Aussy-Cached') === 'true' ||
        res.headers.get('X-Aussy-Offline') === 'true'
      const json: InmetStationsResponse = await res.json()
      const normalized = { ...json, servedFromCache }
      setData(normalized)

      if (!res.ok && !normalized.proximas?.length) {
        setError(normalized.note || 'INMET indisponível e sem última cópia válida para esta localização.')
      }
    } catch {
      setError('INMET indisponível e sem última cópia válida para esta localização.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEstacoes()
    const interval = setInterval(fetchEstacoes, 600000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon])

  if (loading) {
    return (
      <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-background/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-200 text-sm">
            <Thermometer className="h-4 w-4" />
            Estações INMET próximas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data || !data.proximas?.length) {
    return (
      <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-background/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-200 text-sm">
            <Thermometer className="h-4 w-4" />
            Estações INMET próximas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {error || data?.note || 'Nenhuma estação oficial disponível no raio informado.'}
          </p>
          <DataProvenance
            quality="unknown"
            source={data?.fonte || 'INMET'}
            updatedAt={data?.fetchedAt}
            note="Sem cache válido, o Aussy não preenche estações ou leituras por estimativa."
            compact
          />
          <Button size="sm" variant="outline" onClick={fetchEstacoes}>
            <RefreshCw className="h-3 w-3 mr-1" /> Tentar de novo
          </Button>
        </CardContent>
      </Card>
    )
  }

  const statusLabel = data.servedFromCache
    ? 'CACHE'
    : data.observationsLive
      ? 'LIVE'
      : data.catalogLive
        ? 'CATÁLOGO'
        : 'INDISP.'

  const statusClass = data.servedFromCache
    ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
    : data.observationsLive
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
      : data.catalogLive
        ? 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10'
        : 'text-muted-foreground border-border/40 bg-secondary/20'

  return (
    <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-background/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-cyan-200 text-sm">
            <Thermometer className="h-4 w-4" />
            Estações INMET
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-[10px] ${statusClass}`}>
              {statusLabel}
            </Badge>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={fetchEstacoes}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <p className="text-[10px] text-muted-foreground">
          {data.proximas.length} estações em 300 km · {data.fonte}
        </p>

        <DataProvenance
          quality={data.servedFromCache ? 'cached' : data.observationsLive || data.catalogLive ? 'live' : 'unknown'}
          source={data.fonte}
          updatedAt={data.fetchedAt}
          note={
            data.servedFromCache
              ? 'Última resposta válida preservada pelo Service Worker; consulte o horário de cada leitura.'
              : data.note
          }
          compact
        />

        {!data.servedFromCache && data.catalogLive && !data.observationsLive && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-300">
            O catálogo de estações respondeu, mas as observações meteorológicas não. As posições abaixo são oficiais nesta consulta; valores de tempo permanecem vazios.
          </div>
        )}

        <div className="space-y-2">
          {data.proximas.slice(0, 5).map((leitura, index) => {
            const time = measurementTime(leitura.atualizado)
            return (
              <div
                key={`${leitura.estacao.codigo}-${index}`}
                className="border border-border/40 rounded-lg p-2.5 bg-secondary/30"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <div className="font-semibold text-xs truncate">{leitura.estacao.nome}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono-jet">
                      <MapPin className="h-2.5 w-2.5" />
                      {leitura.estacao.uf || '—'} · {leitura.estacao.lat.toFixed(3)}, {leitura.estacao.lon.toFixed(3)}
                      {leitura.estacao.altitude !== null && ` · ${leitura.estacao.altitude}m`}
                    </div>
                  </div>
                  {time && (
                    <span className="text-[9px] text-muted-foreground font-mono-jet flex-shrink-0">
                      {time}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                  <div className="flex flex-col items-center p-1 rounded bg-cyan-950/40 border border-cyan-500/20">
                    <Thermometer className="h-3 w-3 text-red-400 mb-0.5" />
                    <span className="font-mono-jet font-bold text-foreground">
                      {leitura.temperatura !== null ? `${leitura.temperatura.toFixed(1)}°` : '—'}
                    </span>
                    <span className="text-muted-foreground text-[8px]">TEMP</span>
                  </div>
                  <div className="flex flex-col items-center p-1 rounded bg-blue-950/40 border border-blue-500/20">
                    <Droplets className="h-3 w-3 text-blue-400 mb-0.5" />
                    <span className="font-mono-jet font-bold text-foreground">
                      {leitura.umidade !== null ? `${leitura.umidade.toFixed(0)}%` : '—'}
                    </span>
                    <span className="text-muted-foreground text-[8px]">UMID</span>
                  </div>
                  <div className="flex flex-col items-center p-1 rounded bg-emerald-950/40 border border-emerald-500/20">
                    <Wind className="h-3 w-3 text-emerald-400 mb-0.5" />
                    <span className="font-mono-jet font-bold text-foreground">
                      {leitura.vento_vel !== null ? leitura.vento_vel.toFixed(1) : '—'}
                    </span>
                    <span className="text-muted-foreground text-[8px]">M/S</span>
                  </div>
                  <div className="flex flex-col items-center p-1 rounded bg-purple-950/40 border border-purple-500/20">
                    <CloudRain className="h-3 w-3 text-purple-400 mb-0.5" />
                    <span className="font-mono-jet font-bold text-foreground">
                      {leitura.chuva_1h !== null ? leitura.chuva_1h.toFixed(1) : '—'}
                    </span>
                    <span className="text-muted-foreground text-[8px]">MM · 1H</span>
                  </div>
                </div>

                {(leitura.pressao !== null || leitura.vento_raj !== null || leitura.vento_dir !== null || leitura.visibilidade !== null) && (
                  <div className="flex flex-wrap gap-2 mt-1.5 text-[9px] text-muted-foreground font-mono-jet">
                    {leitura.pressao !== null && (
                      <span className="flex items-center gap-0.5">
                        <Gauge className="h-2.5 w-2.5" />
                        {leitura.pressao.toFixed(0)} hPa
                      </span>
                    )}
                    {leitura.vento_raj !== null && <span>raj {leitura.vento_raj.toFixed(1)} m/s</span>}
                    {leitura.vento_dir !== null && <span>dir {leitura.vento_dir.toFixed(0)}°</span>}
                    {leitura.visibilidade !== null && (
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" />
                        {leitura.visibilidade.toFixed(0)} m
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[9px] text-muted-foreground/70 pt-1 border-t border-border/30">
          INMET · horários normalizados de UTC · vento/rajada em m/s · chuva = acumulado da última hora · 24h não é inferido
        </p>
      </CardContent>
    </Card>
  )
}
