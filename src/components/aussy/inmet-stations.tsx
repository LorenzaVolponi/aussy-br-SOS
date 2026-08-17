'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Thermometer, Wind, Droplets, Gauge, Eye, RefreshCw, MapPin, CloudRain } from 'lucide-react'

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
  vento_dir: string | null
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
  fonte: string
  total_estacoes: number
  proximas: LeituraEstacao[]
  atualizado_em: string
}

interface Props {
  lat: number
  lon: number
}

export function InmetStations({ lat, lon }: Props) {
  const [data, setData] = useState<InmetStationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEstacoes = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/inmet/stations?lat=${lat}&lon=${lon}&raio=300`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError('Sem dados offline')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEstacoes()
    const interval = setInterval(fetchEstacoes, 600000) // 10 min
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
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">{error || 'Nenhuma estação no raio'}</p>
          <Button size="sm" variant="outline" onClick={fetchEstacoes}>
            <RefreshCw className="h-3 w-3 mr-1" /> Tentar de novo
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-background/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-cyan-200 text-sm">
            <Thermometer className="h-4 w-4" />
            Estações INMET
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-[10px] ${data.online ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : 'text-amber-400 border-amber-500/40 bg-amber-500/10'}`}>
              {data.online ? 'ONLINE' : 'CACHE'}
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
        <div className="space-y-2">
          {data.proximas.slice(0, 5).map((l, i) => (
            <div
              key={`${l.estacao.codigo}-${i}`}
              className="border border-border/40 rounded-lg p-2.5 bg-secondary/30"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  <div className="font-semibold text-xs truncate">
                    {l.estacao.nome}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono-jet">
                    <MapPin className="h-2.5 w-2.5" />
                    {l.estacao.uf || '—'} · {l.estacao.lat.toFixed(3)}, {l.estacao.lon.toFixed(3)}
                    {l.estacao.altitude && ` · ${l.estacao.altitude}m`}
                  </div>
                </div>
                {l.atualizado && (
                  <span className="text-[9px] text-muted-foreground font-mono-jet flex-shrink-0">
                    {new Date(l.atualizado).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                <div className="flex flex-col items-center p-1 rounded bg-cyan-950/40 border border-cyan-500/20">
                  <Thermometer className="h-3 w-3 text-red-400 mb-0.5" />
                  <span className="font-mono-jet font-bold text-foreground">
                    {l.temperatura !== null ? `${l.temperatura.toFixed(1)}°` : '—'}
                  </span>
                  <span className="text-muted-foreground text-[8px]">TEMP</span>
                </div>
                <div className="flex flex-col items-center p-1 rounded bg-blue-950/40 border border-blue-500/20">
                  <Droplets className="h-3 w-3 text-blue-400 mb-0.5" />
                  <span className="font-mono-jet font-bold text-foreground">
                    {l.umidade !== null ? `${l.umidade.toFixed(0)}%` : '—'}
                  </span>
                  <span className="text-muted-foreground text-[8px]">UMID</span>
                </div>
                <div className="flex flex-col items-center p-1 rounded bg-emerald-950/40 border border-emerald-500/20">
                  <Wind className="h-3 w-3 text-emerald-400 mb-0.5" />
                  <span className="font-mono-jet font-bold text-foreground">
                    {l.vento_vel !== null ? `${l.vento_vel.toFixed(0)}` : '—'}
                  </span>
                  <span className="text-muted-foreground text-[8px]">{l.vento_dir || 'KM/H'}</span>
                </div>
                <div className="flex flex-col items-center p-1 rounded bg-purple-950/40 border border-purple-500/20">
                  <CloudRain className="h-3 w-3 text-purple-400 mb-0.5" />
                  <span className="font-mono-jet font-bold text-foreground">
                    {l.chuva_1h !== null ? `${l.chuva_1h.toFixed(1)}` : '—'}
                  </span>
                  <span className="text-muted-foreground text-[8px]">MM/H</span>
                </div>
              </div>
              {(l.pressao !== null || l.vento_raj !== null || l.visibilidade !== null) && (
                <div className="flex flex-wrap gap-2 mt-1.5 text-[9px] text-muted-foreground font-mono-jet">
                  {l.pressao !== null && (
                    <span className="flex items-center gap-0.5">
                      <Gauge className="h-2.5 w-2.5" />
                      {l.pressao.toFixed(0)} hPa
                    </span>
                  )}
                  {l.vento_raj !== null && (
                    <span>raj {l.vento_raj.toFixed(0)} km/h</span>
                  )}
                  {l.visibilidade !== null && (
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-2.5 w-2.5" />
                      {l.visibilidade.toFixed(0)} m
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground/70 pt-1 border-t border-border/30">
          INMET — Instituto Nacional de Meteorologia · estações automáticas em tempo real · fallback offline
        </p>
      </CardContent>
    </Card>
  )
}
