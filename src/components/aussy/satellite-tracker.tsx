'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Satellite as SatelliteIcon,
  RefreshCw,
  Eye,
  EyeOff,
  Activity,
  Globe2,
  Radar,
  AlertTriangle,
} from 'lucide-react'
import { SATELLITE_CONSTELLATIONS, type SatelliteConstellation } from '@/lib/data/satellites'

interface SatellitePosition {
  name: string
  position: { lat: number; lon: number; altitude: number; valid: boolean }
  visibility: { above: boolean; elevation: number }
}

interface TrackerData {
  group: string
  observer: { lat: number; lon: number }
  timestamp: string
  source: string
  total: number
  visible: number
  satellites: SatellitePosition[]
  fallback?: boolean
  error?: string
  note?: string
  dataQuality?: string
}

const GROUPS = [
  { id: 'starlink', label: 'Starlink' },
  { id: 'iridium', label: 'Iridium NEXT' },
  { id: 'globalstar', label: 'Globalstar' },
  { id: 'oneweb', label: 'OneWeb' },
  { id: 'swarm', label: 'Swarm' },
  { id: 'geo', label: 'GEO' },
]

export function SatelliteTracker({ observerLat, observerLon }: { observerLat: number; observerLon: number }) {
  const [group, setGroup] = useState('starlink')
  const [data, setData] = useState<TrackerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchSats = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/satellites/tle?group=${group}&lat=${observerLat}&lon=${observerLon}&limit=100`,
        { cache: 'no-store' }
      )
      const json = await res.json()
      setData(json)
    } catch (e) {
      setData({
        group,
        observer: { lat: observerLat, lon: observerLon },
        timestamp: new Date().toISOString(),
        source: 'indisponível',
        total: 0,
        visible: 0,
        satellites: [],
        fallback: true,
        error: e instanceof Error ? e.message : 'Falha ao buscar',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSats()
  }, [group, observerLat, observerLon])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchSats, 30000)
    return () => clearInterval(id)
  }, [group, observerLat, observerLon, autoRefresh])

  const estimatedAboveHorizon = data?.satellites.filter((s) => s.visibility.above) || []
  const feedObjects = data?.total || 0

  return (
    <div className="space-y-4">
      <Card className="glass-card border-signal/30 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0 signal-sweep" style={{
            background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, oklch(0.78 0.18 195 / 0.15) 90deg, transparent 180deg)'
          }} />
        </div>
        <CardHeader className="relative z-10 pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <SatelliteIcon className="h-5 w-5 text-signal orbit-pulse" />
              Posição orbital aproximada
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`h-7 px-2 text-xs ${autoRefresh ? 'text-emerald-400' : 'text-muted-foreground'}`}
              >
                <Activity className="h-3 w-3 mr-1" />
                {autoRefresh ? 'ATUALIZA' : 'MANUAL'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchSats}
                disabled={loading}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Estimativa, não rastreio operacional.</strong> O feed usa TLE confirmado do CelesTrak quando disponível, mas a posição e a elevação exibidas são aproximações locais. Não use para apontamento de antena, segurança, navegação ou previsão de passagem.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <BigMetric
              value={estimatedAboveHorizon.length.toString()}
              label="Acima do horizonte (est.)"
              icon={<Eye className="h-4 w-4" />}
              color="text-emerald-400"
            />
            <BigMetric
              value={feedObjects.toString()}
              label="Objetos no feed"
              icon={<Globe2 className="h-4 w-4" />}
              color="text-signal"
            />
            <BigMetric
              value={estimatedAboveHorizon[0]?.visibility.elevation.toFixed(0) || '0'}
              label="Elevação estim. (°)"
              icon={<Radar className="h-4 w-4" />}
              color="text-orbit"
            />
          </div>

          <div className="text-xs text-muted-foreground font-mono-jet text-center">
            OBSERVADOR: {observerLat.toFixed(4)}°, {observerLon.toFixed(4)}° · {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString('pt-BR') : '—'} · {data?.source || 'sem fonte'}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <Button
            key={g.id}
            variant={group === g.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroup(g.id)}
            className={`text-xs ${group === g.id ? 'bg-signal text-background' : 'border-border/50'}`}
          >
            {g.label}
          </Button>
        ))}
      </div>

      {data?.fallback && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-400">
          <strong>Feed TLE ao vivo indisponível.</strong> {data.error || data.note || 'CelesTrak indisponível.'} Nenhuma constelação sintética é gerada.
        </div>
      )}

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between gap-3">
            <span>Objetos do feed — {GROUPS.find((g) => g.id === group)?.label}</span>
            <span className="text-xs text-muted-foreground font-mono-jet text-right">
              {estimatedAboveHorizon.length} acima do horizonte (estim.) / {feedObjects} no feed
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <div className="space-y-1.5">
              {(data?.satellites || []).map((sat, i) => (
                <SatelliteRow key={`${sat.name}-${i}`} sat={sat} />
              ))}
              {!data?.satellites.length && !loading && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Nenhum TLE confirmado disponível para este grupo.
                </div>
              )}
              {loading && !data && (
                <div className="space-y-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-md bg-secondary/30 animate-pulse" />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function BigMetric({
  value,
  label,
  icon,
  color,
}: {
  value: string
  label: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="rounded-lg bg-secondary/30 p-3 border border-border/30 text-center">
      <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
      <div className={`font-mono-jet text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  )
}

function SatelliteRow({ sat }: { sat: SatellitePosition }) {
  const estimatedAbove = sat.visibility.above
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-md border ${
        estimatedAbove
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-muted/20 border-border/20'
      }`}
    >
      <div className="flex-shrink-0">
        {estimatedAbove ? (
          <Eye className="h-4 w-4 text-emerald-400" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{sat.name}</div>
        <div className="text-[10px] text-muted-foreground font-mono-jet">
          {sat.position.lat.toFixed(2)}°, {sat.position.lon.toFixed(2)}° · {sat.position.altitude.toFixed(0)} km · posição estimada
        </div>
      </div>
      <div className="text-right">
        <div
          className={`font-mono-jet text-sm font-bold ${
            estimatedAbove ? 'text-emerald-400' : 'text-muted-foreground'
          }`}
        >
          {sat.visibility.elevation.toFixed(0)}°
        </div>
        <div className="text-[10px] text-muted-foreground uppercase">
          {estimatedAbove ? 'acima (est.)' : 'abaixo (est.)'}
        </div>
      </div>
    </div>
  )
}

export function ConstellationInfo() {
  const [selected, setSelected] = useState<SatelliteConstellation | null>(null)

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <SatelliteIcon className="h-5 w-5 text-signal" />
            Catálogo local de constelações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-300">
            <strong>Referência local, não status em tempo real.</strong> Quantidade de satélites, parceiros, cobertura comercial, serviços, compatibilidade de aparelhos e preços podem mudar rapidamente e não são exibidos aqui como fatos atuais. Para estado operacional/comercial, use o site oficial de cada operadora.
          </div>

          <div className="grid gap-2">
            {SATELLITE_CONSTELLATIONS.map((sat) => (
              <button
                key={sat.id}
                onClick={() => setSelected(selected?.id === sat.id ? null : sat)}
                className={`flex items-start justify-between gap-3 p-3 rounded-lg border text-left transition-colors ${
                  selected?.id === sat.id
                    ? 'bg-signal/10 border-signal/40'
                    : 'bg-secondary/30 border-border/30 hover:bg-secondary/50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm">{sat.name}</span>
                    {sat.d2cCompatible && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-signal/10 text-signal border-signal/30">
                        D2C (referência)
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sat.operator} · {sat.orbit}
                  </div>
                </div>
                <Badge variant="outline" className="bg-muted/30 text-muted-foreground text-[10px]">
                  base local
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Card className="glass-card border-signal/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <SatelliteIcon className="h-5 w-5 text-signal" />
                {selected.name}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="h-7 px-2">
                Fechar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border border-border/40 bg-secondary/20 p-3 text-xs text-muted-foreground leading-relaxed">
              Esta ficha mostra apenas atributos locais de referência relativamente estáveis. Dados comerciais, contagens, parceiros, cobertura e disponibilidade por aparelho devem ser confirmados diretamente na fonte oficial antes de qualquer decisão.
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Detail label="Operadora" value={selected.operator} />
              <Detail label="Órbita" value={selected.orbit} />
              <Detail label="Banda" value={selected.band} />
              <Detail label="Frequência (ref.)" value={selected.frequency} />
              <Detail label="Tipo" value={selected.type} />
              <Detail label="Início histórico" value={selected.launchYear.toString()} />
            </div>

            <Button asChild variant="outline" size="sm" className="w-full">
              <a href={selected.websiteUrl} target="_blank" rel="noopener noreferrer">
                <Globe2 className="h-3.5 w-3.5 mr-1.5" />
                Confirmar no site oficial
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/30 rounded-md p-2 border border-border/30">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="font-mono-jet text-xs text-foreground">{value}</div>
    </div>
  )
}
