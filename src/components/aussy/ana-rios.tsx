'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Waves, RefreshCw, MapPin, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

interface EstacaoRios {
  codigo: string
  nome: string
  rio: string
  uf: string
  lat: number
  lon: number
  nivel_atual: number | null
  nivel_acima_abaixo: number | null
  tendencia: 'subindo' | 'descendo' | 'estavel' | 'desconhecido'
  atualizado: string | null
  distancia: number
}

interface AnaRiosResponse {
  online: boolean
  fonte: string
  total: number
  estacoes: EstacaoRios[]
  atualizado_em: string
  aviso: string
}

interface Props {
  lat: number
  lon: number
}

export function AnaRios({ lat, lon }: Props) {
  const [data, setData] = useState<AnaRiosResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchRios = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ana/rios?lat=${lat}&lon=${lon}&raio=500`)
      const json = await res.json()
      setData(json)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRios()
    const interval = setInterval(fetchRios, 3600000) // 1h
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon])

  const getTendenciaIcon = (t: string) => {
    if (t === 'subindo') return <TrendingUp className="h-3 w-3 text-red-400" />
    if (t === 'descendo') return <TrendingDown className="h-3 w-3 text-emerald-400" />
    if (t === 'estavel') return <Minus className="h-3 w-3 text-cyan-400" />
    return <Minus className="h-3 w-3 text-muted-foreground" />
  }

  const getTendenciaColor = (t: string, nivel_acima_abaixo: number | null) => {
    if (nivel_acima_abaixo !== null && Math.abs(nivel_acima_abaixo) > 1) {
      if (t === 'subindo') return 'border-red-500/60 bg-red-500/10'
      if (t === 'descendo' && nivel_acima_abaixo > 0) return 'border-amber-500/60 bg-amber-500/10'
    }
    return 'border-border/40 bg-secondary/30'
  }

  if (loading) {
    return (
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-background/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-200 text-sm">
            <Waves className="h-4 w-4" />
            Rios e fluviométricas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.estacoes?.length) {
    return (
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-background/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-200 text-sm">
            <Waves className="h-4 w-4" />
            Rios e fluviométricas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Nenhuma estação fluviométrica no raio de 500 km.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-background/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-200 text-sm">
            <Waves className="h-4 w-4" />
            Rios · ANA / SNIRH
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={fetchRios}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <p className="text-[10px] text-muted-foreground">
          {data.total} estações em 500 km · {data.fonte}
        </p>
        <div className="space-y-2">
          {data.estacoes.slice(0, 6).map((e, i) => (
            <div
              key={`${e.codigo}-${i}`}
              className={`border rounded-lg p-2.5 ${getTendenciaColor(e.tendencia, e.nivel_acima_abaixo)}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs truncate flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                    {e.nome}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono-jet">
                    Rio {e.rio} · {e.uf} · {e.distancia.toFixed(0)} km
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getTendenciaIcon(e.tendencia)}
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <span className="font-mono-jet font-bold text-base">
                    {e.nivel_atual !== null ? e.nivel_atual.toFixed(2) : '—'}
                  </span>
                  <span className="text-[9px] text-muted-foreground ml-1">m</span>
                </div>
                {e.nivel_acima_abaixo !== null && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-mono-jet ${
                      e.nivel_acima_abaixo > 0.5
                        ? 'text-red-400 border-red-500/40 bg-red-500/10'
                        : e.nivel_acima_abaixo < -0.5
                        ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                        : 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10'
                    }`}
                  >
                    {e.nivel_acima_abaixo > 0 ? '+' : ''}
                    {e.nivel_acima_abaixo.toFixed(2)} m
                  </Badge>
                )}
              </div>
              {e.nivel_acima_abaixo !== null && e.nivel_acima_abaixo > 1 && e.tendencia === 'subindo' && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-red-300">
                  <AlertTriangle className="h-3 w-3" />
                  Risco de transbordamento
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground/70 pt-1 border-t border-border/30">
          ANA — Agência Nacional de Águas · Sistema Nacional de Informações sobre Recursos Hídricos (SNIRH)
        </p>
      </CardContent>
    </Card>
  )
}
