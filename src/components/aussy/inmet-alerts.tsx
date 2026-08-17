'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CloudRain,
  CloudLightning,
  Wind,
  ThermometerSun,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Loader2,
  CloudOff,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useGeolocation } from '@/hooks/use-geolocation'

interface InmetAlert {
  aviso: string
  evento: string
  severidade: string
  descricao: string
  inicio: string
  fim: string
  uf: string
  municipios?: string[]
  cor: string
}

interface InmetResponse {
  alerts: InmetAlert[]
  total: number
  cached: boolean
  error?: string
  message?: string
  fetchedAt: string
  source?: string
}

const SEVERITY_COLORS: Record<string, string> = {
  'Perigo Potencial': 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  'Perigo': 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  'Grande Perigo': 'border-red-500/40 bg-red-500/10 text-red-300',
}

// Mapeia evento → ícone
const EVENT_ICONS: Record<string, any> = {
  'Chuva': CloudRain,
  'Chuvas': CloudRain,
  'Tempestade': CloudLightning,
  'Vento': Wind,
  'Ventos': Wind,
  'Calor': ThermometerSun,
  'Onda de Calor': ThermometerSun,
  'Baixa Umidade': ThermometerSun,
}

function getEventIcon(evento: string) {
  const key = Object.keys(EVENT_ICONS).find((k) => evento.includes(k))
  return key ? EVENT_ICONS[key] : AlertTriangle
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

export function InmetAlerts() {
  const [data, setData] = useState<InmetResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterUf, setFilterUf] = useState<string>('')
  const { point } = useGeolocation()

  const fetchAlerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/inmet/alerts', { cache: 'no-store' })
      if (!res.ok) throw new Error('Falha')
      const json: InmetResponse = await res.json()
      setData(json)
      if (!silent && !json.error && json.total > 0) {
        toast.success(`${json.total} alerta(s) ativos no Brasil`)
      }
    } catch (e) {
      if (!silent) toast.error('Erro ao buscar alertas INMET')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    // Auto-refresh a cada 30 min
    const interval = setInterval(() => fetchAlerts(true), 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  // Filtra alertas por UF se o usuário tiver GPS
  const filteredAlerts = (data?.alerts || []).filter((a) => {
    if (!filterUf) return true
    return a.uf === filterUf
  })

  // Lista de UFs únicas para o filtro
  const ufs = Array.from(new Set((data?.alerts || []).map((a) => a.uf).filter(Boolean))).sort()

  // Detecta UF do usuário (se coords baterem com Brasil)
  const userUf = (() => {
    if (!point) return null
    // Heurística simples: não temos UF direta do GPS, mas mantemos filterUf manual
    return null
  })()

  return (
    <Card className="border-cyan-500/20 bg-cyan-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <CloudRain className="h-4 w-4 text-cyan-400" />
            Alertas meteorológicos — INMET
          </span>
          <Button
            onClick={() => fetchAlerts()}
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Atualizar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status */}
        {data?.error && (
          <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px]">
            <CloudOff className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Offline.</strong> {data.message || 'Mostrando último cache disponível.'}
            </div>
          </div>
        )}

        {/* Filtro por UF */}
        {ufs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono-jet text-muted-foreground">FILTRAR UF:</span>
            <button
              onClick={() => setFilterUf('')}
              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                !filterUf
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'border-border/40 text-muted-foreground hover:bg-cyan-500/10'
              }`}
            >
              Todos
            </button>
            {ufs.map((uf) => (
              <button
                key={uf}
                onClick={() => setFilterUf(uf)}
                className={`text-[10px] px-1.5 py-0.5 rounded border font-mono-jet ${
                  filterUf === uf
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'border-border/40 text-muted-foreground hover:bg-cyan-500/10'
                }`}
              >
                {uf}
              </button>
            ))}
          </div>
        )}

        {/* Lista de alertas */}
        {loading ? (
          <div className="text-xs text-muted-foreground text-center py-4 flex items-center justify-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Buscando alertas INMET...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-4 px-3">
            <CloudRain className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {data?.error
                ? 'Sem dados disponíveis.'
                : 'Nenhum alerta meteorológico ativo no momento.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredAlerts.map((alert, i) => {
              const Icon = getEventIcon(alert.evento)
              const sevClass = SEVERITY_COLORS[alert.severidade] || 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              return (
                <div
                  key={`${alert.aviso}-${i}`}
                  className={`p-2.5 rounded-lg border ${sevClass}`}
                  style={{ borderLeftWidth: '3px', borderLeftColor: alert.cor || '#f59e0b' }}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{alert.evento}</span>
                        {alert.uf && (
                          <Badge variant="outline" className="text-[9px] font-mono-jet px-1 py-0 h-4">
                            {alert.uf}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] font-mono-jet opacity-80 mb-1">
                        {alert.severidade}
                      </div>
                      {alert.descricao && (
                        <p className="text-[11px] opacity-90 leading-relaxed line-clamp-3">
                          {alert.descricao}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] opacity-70">
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDate(alert.inicio)} → {formatDate(alert.fim)}
                        </span>
                      </div>
                      {alert.municipios && alert.municipios.length > 0 && (
                        <details className="mt-1.5">
                          <summary className="text-[10px] cursor-pointer opacity-70 hover:opacity-100">
                            {alert.municipios.length} município(s) afetado(s)
                          </summary>
                          <div className="text-[10px] opacity-70 mt-1 leading-relaxed">
                            {alert.municipios.slice(0, 20).join(', ')}
                            {alert.municipios.length > 20 && `... +${alert.municipios.length - 20}`}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />
            Fonte: INMET apitempo.inmet.gov.br
          </span>
          {data?.fetchedAt && (
            <span className="font-mono-jet">
              atualizado {new Date(data.fetchedAt).toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
