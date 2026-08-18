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
import { DataProvenance } from '@/components/aussy/data-provenance'
import { toast } from 'sonner'

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
  online: boolean
  dataQuality?: 'live-alerts' | 'unavailable'
  alerts: InmetAlert[]
  total: number
  cached: boolean
  servedFromCache?: boolean
  error?: string
  message?: string
  note?: string
  fetchedAt: string
  source?: string
  sourceUrl?: string
}

const SEVERITY_COLORS: Record<string, string> = {
  'Perigo Potencial': 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  'Perigo': 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  'Grande Perigo': 'border-red-500/40 bg-red-500/10 text-red-300',
}

const EVENT_ICONS: Record<string, any> = {
  Chuva: CloudRain,
  Chuvas: CloudRain,
  Tempestade: CloudLightning,
  Vento: Wind,
  Ventos: Wind,
  Calor: ThermometerSun,
  'Onda de Calor': ThermometerSun,
  'Baixa Umidade': ThermometerSun,
}

function getEventIcon(evento: string) {
  const key = Object.keys(EVENT_ICONS).find((item) => evento.includes(item))
  return key ? EVENT_ICONS[key] : AlertTriangle
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function InmetAlerts() {
  const [data, setData] = useState<InmetResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterUf, setFilterUf] = useState<string>('')

  const fetchAlerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/inmet/alerts', { cache: 'no-store' })
      const servedFromCache =
        res.headers.get('X-Aussy-Cached') === 'true' ||
        res.headers.get('X-Aussy-Offline') === 'true'
      const json: InmetResponse = await res.json()
      const normalized: InmetResponse = {
        ...json,
        cached: servedFromCache || Boolean(json.cached),
        servedFromCache,
      }
      setData(normalized)

      if (!silent && res.ok && !normalized.cached && normalized.online && normalized.total > 0) {
        toast.success(`${normalized.total} alerta(s) retornados pelo INMET`)
      }
      if (!silent && !res.ok && !normalized.cached) {
        toast.error('INMET indisponível nesta consulta')
      }
    } catch {
      if (!silent) toast.error('Não foi possível consultar o INMET')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(() => fetchAlerts(true), 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  const filteredAlerts = (data?.alerts || []).filter((alert) => {
    if (!filterUf) return true
    return alert.uf === filterUf
  })

  const ufs = Array.from(new Set((data?.alerts || []).map((alert) => alert.uf).filter(Boolean))).sort()

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
        {data && (
          <DataProvenance
            quality={data.cached ? 'cached' : data.online ? 'live' : 'unknown'}
            source={data.source || 'INMET'}
            updatedAt={data.fetchedAt}
            note={
              data.cached
                ? 'Última resposta válida preservada pelo Service Worker. Os alertas abaixo podem ter expirado desde a consulta original.'
                : data.note
            }
            compact
          />
        )}

        {data?.cached && (
          <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
            <Clock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>CACHE.</strong> Esta não é uma consulta ao vivo. Confirme o horário e a validade de cada alerta assim que a conexão voltar.
            </div>
          </div>
        )}

        {!data?.cached && data?.error && (
          <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px]">
            <CloudOff className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Fonte indisponível.</strong> {data.message || 'O Aussy não interpreta falha da fonte como ausência de alertas.'}
            </div>
          </div>
        )}

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
                ? 'Não há uma resposta válida do INMET para concluir se existem alertas.'
                : data?.cached
                  ? 'A última cópia válida não contém alertas para este filtro.'
                  : 'A resposta atual do INMET não retornou alertas para este filtro.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredAlerts.map((alert, index) => {
              const Icon = getEventIcon(alert.evento)
              const severityClass = SEVERITY_COLORS[alert.severidade] || 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              return (
                <div
                  key={`${alert.aviso}-${index}`}
                  className={`p-2.5 rounded-lg border ${severityClass}`}
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
                      <div className="text-[10px] font-mono-jet opacity-80 mb-1">{alert.severidade}</div>
                      {alert.descricao && (
                        <p className="text-[11px] opacity-90 leading-relaxed line-clamp-3">{alert.descricao}</p>
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

        <div className="flex items-center justify-between pt-2 border-t border-border/30 text-[10px] text-muted-foreground/60 gap-2">
          <span className="flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />
            Fonte: INMET
          </span>
          {data?.fetchedAt && (
            <span className="font-mono-jet text-right">
              {data.cached ? 'consulta original ' : 'consultado '}
              {new Date(data.fetchedAt).toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
