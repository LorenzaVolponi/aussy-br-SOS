'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Flame,
  CloudRain,
  RefreshCw,
  Loader2,
  AlertTriangle,
  MapPin,
  Clock,
  CloudOff,
  Crosshair,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useGeolocation } from '@/hooks/use-geolocation'

interface FocoQueimada {
  id: string
  lat: number
  lon: number
  municipio: string
  uf: string
  bioma: string
  satellite: string
  dataHora: string
  distanciaKm?: number
  risco: 'Baixo' | 'Médio' | 'Alto' | 'Crítico'
}

interface OfficialPortal {
  name: string
  url: string
}

interface CemadenResponse {
  online: false
  automationAvailable: false
  dataQuality: 'official-portal'
  alerts: []
  total: 0
  error: null
  message: string
  note: string
  fetchedAt: string
  source: string
  sourceUrl: string
  verifiedAt: string
  portals: OfficialPortal[]
}

interface QueimadasResponse {
  focos: FocoQueimada[]
  total: number
  raio: number
  error?: string
  message?: string
  fetchedAt: string
  source?: string
}

const RISCO_COLORS: Record<string, string> = {
  Baixo: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  Médio: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
  Alto: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  Crítico: 'border-red-500/40 bg-red-500/10 text-red-300 blink-emergency',
}

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function CemadenAlerts() {
  const [cemaden, setCemaden] = useState<CemadenResponse | null>(null)
  const [queimadas, setQueimadas] = useState<QueimadasResponse | null>(null)
  const [loadingCemaden, setLoadingCemaden] = useState(true)
  const [loadingQueimadas, setLoadingQueimadas] = useState(false)
  const { point } = useGeolocation()

  const fetchCemaden = useCallback(async (silent = false) => {
    if (!silent) setLoadingCemaden(true)
    try {
      const res = await fetch('/api/cemaden/alerts', { cache: 'no-store' })
      if (!res.ok) throw new Error('CEMADEN reference unavailable')
      const json: CemadenResponse = await res.json()
      setCemaden(json)
    } catch {
      if (!silent) toast.error('Não foi possível carregar os canais oficiais CEMADEN')
    } finally {
      setLoadingCemaden(false)
    }
  }, [])

  const fetchQueimadas = useCallback(async (silent = false) => {
    if (!point) {
      setQueimadas(null)
      setLoadingQueimadas(false)
      return
    }

    if (!silent) setLoadingQueimadas(true)
    try {
      const res = await fetch(`/api/queimadas/focos?lat=${point.lat}&lon=${point.lon}&raio=200`, { cache: 'no-store' })
      const json: QueimadasResponse = await res.json()
      setQueimadas(json)
      if (!silent && !json.error && json.total > 0) {
        const proximos = json.focos.filter((f) => (f.distanciaKm ?? 9999) < 50).length
        if (proximos > 0) toast.warning(`${proximos} foco(s) de queimada a menos de 50 km`)
      }
    } catch {
      if (!silent) toast.error('Erro ao buscar focos de queimada')
    } finally {
      setLoadingQueimadas(false)
    }
  }, [point])

  useEffect(() => {
    fetchCemaden()
  }, [fetchCemaden])

  useEffect(() => {
    if (point) fetchQueimadas()
    else {
      setQueimadas(null)
      setLoadingQueimadas(false)
    }
  }, [point, fetchQueimadas])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCemaden(true)
      if (point) fetchQueimadas(true)
    }, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchCemaden, fetchQueimadas, point])

  const totalFocos = queimadas?.total || 0

  return (
    <Card className="border-red-500/20 bg-red-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm gap-3">
          <span className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-400" />
            Desastres Naturais — CEMADEN oficial + INPE Fogo
          </span>
          <Button
            onClick={() => {
              fetchCemaden()
              if (point) fetchQueimadas()
            }}
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            disabled={loadingCemaden || loadingQueimadas}
          >
            {(loadingCemaden || loadingQueimadas) ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Atualizar
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {totalFocos > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-bold text-red-300">
                {totalFocos} foco(s) de queimada no raio consultado
              </div>
              <div className="text-[11px] text-red-300/70">
                Fonte INPE. O CEMADEN é consultado pelos portais oficiais abaixo, sem contagem automatizada nesta build.
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-orange-400">
            <Flame className="h-3.5 w-3.5" />
            Focos de Queimada — INPE
            {point && (
              <span className="text-[10px] text-muted-foreground font-mono-jet ml-1">
                (raio {queimadas?.raio || 200} km)
              </span>
            )}
          </div>

          {!point ? (
            <div className="flex items-start gap-2 p-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px]">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>Aguardando localização válida. Nenhuma cidade padrão é assumida para consultar queimadas.</span>
            </div>
          ) : queimadas?.error ? (
            <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px]">
              <CloudOff className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{queimadas.message || 'Dados de queimadas indisponíveis.'}</span>
            </div>
          ) : loadingQueimadas ? (
            <div className="text-xs text-muted-foreground text-center py-3 flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Buscando focos de queimada próximos...
            </div>
          ) : queimadas && queimadas.focos.length === 0 ? (
            <div className="text-center py-3 px-3">
              <Flame className="h-5 w-5 text-emerald-400/50 mx-auto mb-1.5" />
              <p className="text-xs text-emerald-400">Nenhum foco retornado pela consulta atual neste raio</p>
              <p className="text-[10px] text-muted-foreground mt-1">Isso descreve apenas a resposta da fonte para esta consulta, não uma garantia de ausência de incêndio.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {(queimadas?.focos || []).slice(0, 8).map((foco) => {
                const riscoClass = RISCO_COLORS[foco.risco] || ''
                return (
                  <div
                    key={foco.id}
                    className={`p-2 rounded-lg border ${riscoClass}`}
                    style={{ borderLeftWidth: '3px', borderLeftColor: '#ef4444' }}
                  >
                    <div className="flex items-start gap-2">
                      <Flame className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-medium text-xs">{foco.municipio || 'Sem município'}</span>
                          {foco.uf && (
                            <Badge variant="outline" className="text-[9px] font-mono-jet px-1 py-0 h-4">
                              {foco.uf}
                            </Badge>
                          )}
                          {foco.distanciaKm !== undefined && (
                            <span className="text-[10px] font-mono-jet opacity-70">{foco.distanciaKm} km</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] opacity-70">
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {foco.bioma}
                          </span>
                          <span className="font-mono-jet">sat: {foco.satellite}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] opacity-70">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDate(foco.dataHora)}
                          </span>
                          <Badge variant="outline" className={`text-[9px] font-mono-jet px-1 py-0 h-4 ${riscoClass}`}>
                            risco {foco.risco}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {(queimadas?.focos || []).length > 8 && (
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  +{queimadas!.focos.length - 8} focos adicionais
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-400">
            <CloudRain className="h-3.5 w-3.5" />
            CEMADEN / MCTI — canais oficiais
            <Badge variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-300">PORTAL OFICIAL</Badge>
          </div>

          {loadingCemaden ? (
            <div className="text-xs text-muted-foreground text-center py-3 flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Carregando referências oficiais CEMADEN...
            </div>
          ) : !cemaden ? (
            <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px]">
              <CloudOff className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>Não foi possível carregar as referências oficiais CEMADEN agora.</span>
            </div>
          ) : (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-3">
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                {cemaden.note}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {cemaden.portals.map((portal) => (
                  <a
                    key={portal.url}
                    href={portal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-2.5 py-2 text-[11px] hover:bg-muted/30"
                  >
                    <span>{portal.name}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground/70">
                Fonte: {cemaden.source} · verificado em {cemaden.verifiedAt}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/30 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <Crosshair className="h-2.5 w-2.5" />
            CEMADEN oficial · INPE Queimadas
          </span>
          <span className="font-mono-jet">
            {cemaden ? `ref. ${cemaden.verifiedAt}` : 'referência não carregada'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
