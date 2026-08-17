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
}

const GROUPS = [
  { id: 'starlink', label: 'D2C LEO (banda larga)', count: '~6500' },
  { id: 'iridium', label: 'Iridium NEXT (M2M/SOS)', count: '66' },
  { id: 'globalstar', label: 'Globalstar (SOS)', count: '48' },
  { id: 'oneweb', label: 'OneWeb (broadband)', count: '648' },
  { id: 'swarm', label: 'Swarm (IoT)', count: '190' },
  { id: 'geo', label: 'GEO (35786km)', count: '~500' },
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
        source: 'erro',
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

  const visibleSats = data?.satellites.filter((s) => s.visibility.above) || []
  const totalSats = data?.total || 0

  return (
    <div className="space-y-4">
      {/* Hero card: visibilidade global */}
      <Card className="glass-card border-signal/30 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute inset-0 signal-sweep" style={{
            background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, oklch(0.78 0.18 195 / 0.15) 90deg, transparent 180deg)'
          }} />
        </div>
        <CardHeader className="relative z-10 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <SatelliteIcon className="h-5 w-5 text-signal orbit-pulse" />
              Rastreador Orbital em Tempo Real
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`h-7 px-2 text-xs ${autoRefresh ? 'text-emerald-400' : 'text-muted-foreground'}`}
              >
                <Activity className="h-3 w-3 mr-1" />
                {autoRefresh ? 'AUTO' : 'MANUAL'}
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
          {/* Métricas grandes */}
          <div className="grid grid-cols-3 gap-3">
            <BigMetric
              value={visibleSats.length.toString()}
              label="Visíveis agora"
              icon={<Eye className="h-4 w-4" />}
              color="text-emerald-400"
            />
            <BigMetric
              value={totalSats.toString()}
              label="Em órbita"
              icon={<Globe2 className="h-4 w-4" />}
              color="text-signal"
            />
            <BigMetric
              value={visibleSats[0]?.visibility.elevation.toFixed(0) || '0'}
              label="Elevação máx (°)"
              icon={<Radar className="h-4 w-4" />}
              color="text-orbit"
            />
          </div>

          {/* Posição do observador */}
          <div className="text-xs text-muted-foreground font-mono-jet text-center">
            OBSERVADOR: {observerLat.toFixed(4)}°, {observerLon.toFixed(4)}° · {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString('pt-BR') : '—'} · {data?.source}
          </div>
        </CardContent>
      </Card>

      {/* Seletor de constelação */}
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
            <Badge variant="secondary" className="ml-1.5 text-[10px] bg-background/20">
              {g.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Aviso de fallback */}
      {data?.fallback && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-400">
          <strong>Feed ao vivo indisponível.</strong> {data.error || 'Celestrak offline.'} Dados podem estar desatualizados.
        </div>
      )}

      {/* Lista de satélites */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Satélites — {GROUPS.find((g) => g.id === group)?.label}</span>
            <span className="text-xs text-muted-foreground font-mono-jet">
              {visibleSats.length} acima do horizonte / {totalSats} total
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
                  Nenhum satélite no feed.
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
  const visible = sat.visibility.above
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-md border ${
        visible
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-muted/20 border-border/20'
      }`}
    >
      <div className="flex-shrink-0">
        {visible ? (
          <Eye className="h-4 w-4 text-emerald-400" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{sat.name}</div>
        <div className="text-[10px] text-muted-foreground font-mono-jet">
          {sat.position.lat.toFixed(2)}°, {sat.position.lon.toFixed(2)}° · {sat.position.altitude.toFixed(0)} km
        </div>
      </div>
      <div className="text-right">
        <div
          className={`font-mono-jet text-sm font-bold ${
            visible ? 'text-emerald-400' : 'text-muted-foreground'
          }`}
        >
          {sat.visibility.elevation.toFixed(0)}°
        </div>
        <div className="text-[10px] text-muted-foreground uppercase">
          {visible ? 'visível' : 'abaixo'}
        </div>
      </div>
    </div>
  )
}

// Informações técnicas das constelações (referência)
export function ConstellationInfo() {
  const [selected, setSelected] = useState<SatelliteConstellation | null>(null)

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <SatelliteIcon className="h-5 w-5 text-signal" />
            Constelações Direct-to-Cell (D2C)
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                        D2C
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sat.operator} · {sat.orbit} · {sat.activeSatellites}/{sat.constellationSize} ativos
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    sat.status === 'operational'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]'
                      : sat.status === 'testing'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]'
                      : 'bg-muted/30 text-muted-foreground text-[10px]'
                  }
                >
                  {sat.status}
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
            <p className="text-muted-foreground leading-relaxed">{selected.description}</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Detail label="Operadora" value={selected.operator} />
              <Detail label="Órbita" value={selected.orbit} />
              <Detail label="Frequência" value={selected.frequency} />
              <Detail label="Banda" value={selected.band} />
              <Detail label="Ativos / Total" value={`${selected.activeSatellites} / ${selected.constellationSize}`} />
              <Detail label="Lançamento" value={selected.launchYear.toString()} />
              <Detail label="Cobertura" value={selected.coverage} />
              <Detail label="Status" value={selected.status} />
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Serviços</h4>
              <div className="flex flex-wrap gap-1.5">
                {selected.services.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Parceiros / Operadoras</h4>
              <div className="flex flex-wrap gap-1.5">
                {selected.partners.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Detalhes técnicos</h4>
              <p className="text-xs text-foreground/80 leading-relaxed">{selected.techDetails}</p>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wider text-amber-400 mb-2">Requisito do celular</h4>
              <p className="text-xs leading-relaxed">{selected.phoneRequirement}</p>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wider text-orbit mb-2">Modelo de custo</h4>
              <p className="text-xs leading-relaxed">{selected.costModel}</p>
            </div>

            <Button asChild variant="outline" size="sm" className="w-full">
              <a href={selected.websiteUrl} target="_blank" rel="noopener noreferrer">
                <Globe2 className="h-3.5 w-3.5 mr-1.5" />
                Visitar site oficial
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
