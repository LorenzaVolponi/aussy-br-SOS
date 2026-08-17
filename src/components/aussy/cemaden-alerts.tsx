'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Flame,
  CloudRain,
  Mountain,
  Droplets,
  Sun,
  RefreshCw,
  Loader2,
  AlertTriangle,
  MapPin,
  Clock,
  CloudOff,
  Crosshair,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useGeolocation } from '@/hooks/use-geolocation'

interface CemadenAlert {
  id: string
  municipio: string
  uf: string
  evento: string
  severidade: 'Atenção' | 'Alerta' | 'Alerta Máximo'
  probabilidade: number
  inicio: string
  fim: string
  descricao: string
  chuvaAcumulada?: number
  chuvaPrevisao?: number
}

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

interface CemadenResponse {
  alerts: CemadenAlert[]
  total: number
  cached: boolean
  error?: string
  message?: string
  fetchedAt: string
  source?: string
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

const SEVERITY_COLORS: Record<string, string> = {
  'Atenção': 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
  'Alerta': 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  'Alerta Máximo': 'border-red-500/40 bg-red-500/10 text-red-300 blink-emergency',
}

const RISCO_COLORS: Record<string, string> = {
  'Baixo': 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  'Médio': 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
  'Alto': 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  'Crítico': 'border-red-500/40 bg-red-500/10 text-red-300 blink-emergency',
}

const EVENT_ICONS: Record<string, any> = {
  'Deslizamento': Mountain,
  'Enchente': CloudRain,
  'Enxurrada': Droplets,
  'Alagamento': Droplets,
  'Seca': Sun,
}

function getEventIcon(evento: string) {
  return EVENT_ICONS[evento] || AlertTriangle
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
  const [loadingQueimadas, setLoadingQueimadas] = useState(true)
  const { point } = useGeolocation()

  const fetchCemaden = useCallback(async (silent = false) => {
    if (!silent) setLoadingCemaden(true)
    try {
      const res = await fetch('/api/cemaden/alerts', { cache: 'no-store' })
      const json: CemadenResponse = await res.json()
      setCemaden(json)
      if (!silent && !json.error && json.total > 0) {
        toast.success(`${json.total} alerta(s) CEMADEN ativos`)
      }
    } catch {
      if (!silent) toast.error('Erro ao buscar alertas CEMADEN')
    } finally {
      setLoadingCemaden(false)
    }
  }, [])

  const fetchQueimadas = useCallback(async (silent = false) => {
    if (!silent) setLoadingQueimadas(true)
    try {
      const lat = point?.lat ?? -15.7801
      const lon = point?.lon ?? -47.9292
      const res = await fetch(`/api/queimadas/focos?lat=${lat}&lon=${lon}&raio=200`, { cache: 'no-store' })
      const json: QueimadasResponse = await res.json()
      setQueimadas(json)
      if (!silent && !json.error && json.total > 0) {
        const proximos = json.focos.filter(f => (f.distanciaKm || 9999) < 50).length
        if (proximos > 0) {
          toast.warning(`${proximos} foco(s) de queimada a menos de 50 km`)
        }
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
    else fetchQueimadas()
  }, [point, fetchQueimadas])

  // Auto-refresh 30 min
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCemaden(true)
      fetchQueimadas(true)
    }, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchCemaden, fetchQueimadas])

  const totalAlertas = (cemaden?.total || 0) + (queimadas?.total || 0)
  const hasRisk = totalAlertas > 0

  return (
    <Card className="border-red-500/20 bg-red-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-400" />
            Desastres Naturais — CEMADEN + INPE Fogo
          </span>
          <Button
            onClick={() => { fetchCemaden(); fetchQueimadas() }}
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
        {/* Resumo */}
        {hasRisk && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-bold text-red-300">
                {totalAlertas} risco(s) ativos identificados
              </div>
              <div className="text-[11px] text-red-300/70">
                {cemaden?.total || 0} monitoramento(s) CEMADEN · {queimadas?.total || 0} foco(s) de queimada
              </div>
            </div>
          </div>
        )}

        {/* Queimadas INPE */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-orange-400">
            <Flame className="h-3.5 w-3.5" />
            Focos de Queimada — INPE
            <span className="text-[10px] text-muted-foreground font-mono-jet ml-1">
              (raio {queimadas?.raio || 200} km)
            </span>
          </div>

          {queimadas?.error ? (
            <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px]">
              <CloudOff className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{queimadas.message}</span>
            </div>
          ) : loadingQueimadas ? (
            <div className="text-xs text-muted-foreground text-center py-3 flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Buscando focos de queimada próximos...
            </div>
          ) : (queimadas?.focos || []).length === 0 ? (
            <div className="text-center py-3 px-3">
              <Flame className="h-5 w-5 text-emerald-400/50 mx-auto mb-1.5" />
              <p className="text-xs text-emerald-400">Nenhum foco de queimada ativo próximo</p>
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
                            <span className="text-[10px] font-mono-jet opacity-70">
                              {foco.distanciaKm} km
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] opacity-70">
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {foco.bioma}
                          </span>
                          <span className="font-mono-jet">
                            sat: {foco.satellite}
                          </span>
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

        {/* CEMADEN */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-400">
            <CloudRain className="h-3.5 w-3.5" />
            Monitoramento CEMADEN — Deslizamentos e Enchentes
          </div>

          {cemaden?.error ? (
            <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px]">
              <CloudOff className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{cemaden.message}</span>
            </div>
          ) : loadingCemaden ? (
            <div className="text-xs text-muted-foreground text-center py-3 flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Buscando monitoramento CEMADEN...
            </div>
          ) : (cemaden?.alerts || []).length === 0 ? (
            <div className="text-center py-3 px-3">
              <CloudRain className="h-5 w-5 text-muted-foreground/50 mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">Nenhum monitoramento ativo no momento</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {(cemaden?.alerts || []).map((alert) => {
                const Icon = getEventIcon(alert.evento)
                const sevClass = SEVERITY_COLORS[alert.severidade] || ''
                return (
                  <div
                    key={alert.id}
                    className={`p-2.5 rounded-lg border ${sevClass}`}
                    style={{ borderLeftWidth: '3px', borderLeftColor: '#06b6d4' }}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-medium text-sm">{alert.municipio}</span>
                          <Badge variant="outline" className="text-[9px] font-mono-jet px-1 py-0 h-4">
                            {alert.uf}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] opacity-80 mb-1">
                          <span className="font-mono-jet">{alert.evento}</span>
                          <span>·</span>
                          <span className="font-mono-jet">{alert.severidade}</span>
                          {alert.probabilidade > 0 && (
                            <>
                              <span>·</span>
                              <span className="font-mono-jet">prob {alert.probabilidade}%</span>
                            </>
                          )}
                        </div>
                        {alert.descricao && (
                          <p className="text-[11px] opacity-90 leading-relaxed line-clamp-3">
                            {alert.descricao}
                          </p>
                        )}
                        {(alert.chuvaAcumulada !== undefined || alert.chuvaPrevisao !== undefined) && (
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] opacity-70">
                            {alert.chuvaAcumulada !== undefined && (
                              <span className="flex items-center gap-0.5">
                                <Droplets className="h-2.5 w-2.5" />
                                Acum: {alert.chuvaAcumulada} mm
                              </span>
                            )}
                            {alert.chuvaPrevisao !== undefined && (
                              <span className="flex items-center gap-0.5">
                                <CloudRain className="h-2.5 w-2.5" />
                                Prev: {alert.chuvaPrevisao} mm
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <Crosshair className="h-2.5 w-2.5" />
            CEMADEN · INPE Queimadas
          </span>
          <span className="font-mono-jet">
            atualizado {cemaden && new Date(cemaden.fetchedAt).toLocaleTimeString('pt-BR')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
