'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CloudRain,
  CloudLightning,
  Wind,
  ThermometerSun,
  AlertTriangle,
  RefreshCw,
  Loader2,
  CloudOff,
  Clock,
  ExternalLink,
  ShieldCheck,
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
  'Perigo Potencial': 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/25 dark:text-amber-200',
  'Perigo': 'border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-700/60 dark:bg-orange-950/25 dark:text-orange-200',
  'Grande Perigo': 'border-red-300 bg-red-50 text-red-950 dark:border-red-700/60 dark:bg-red-950/25 dark:text-red-200',
}

const EVENT_ICONS: Record<string, typeof AlertTriangle> = {
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
  return parsed.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function InmetAlerts() {
  const [data, setData] = useState<InmetResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterUf, setFilterUf] = useState('')

  const fetchAlerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/inmet/alerts', { cache: 'no-store' })
      const servedFromCache = res.headers.get('X-Aussy-Cached') === 'true' || res.headers.get('X-Aussy-Offline') === 'true'
      const json: InmetResponse = await res.json()
      const normalized = { ...json, cached: servedFromCache || Boolean(json.cached), servedFromCache }
      setData(normalized)

      if (!silent && res.ok && !normalized.cached && normalized.online && normalized.total > 0) {
        toast.success(`${normalized.total} alerta(s) retornados pelo INMET`)
      }
      if (!silent && !res.ok && !normalized.cached) toast.error('INMET indisponível nesta consulta')
    } catch {
      if (!silent) toast.error('Não foi possível consultar o INMET')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAlerts()
    const interval = window.setInterval(() => void fetchAlerts(true), 30 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [fetchAlerts])

  const filteredAlerts = (data?.alerts || []).filter((alert) => !filterUf || alert.uf === filterUf)
  const ufs = Array.from(new Set((data?.alerts || []).map((alert) => alert.uf).filter(Boolean))).sort()

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-slate-50">
              <CloudLightning className="h-5 w-5 text-orange-700 dark:text-orange-300" />
              Tempestades e alertas · INMET
            </CardTitle>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">Avisos meteorológicos oficiais para o Brasil. A previsão do Aussy é contexto; o alerta oficial vem do INMET.</p>
          </div>
          <Button onClick={() => void fetchAlerts()} size="icon" variant="ghost" className="h-11 w-11 flex-shrink-0" disabled={loading} aria-label="Atualizar alertas do INMET">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> FONTE OFICIAL
          </Badge>
          {data?.sourceUrl && (
            <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/20">
              Abrir alertas oficiais <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {data && (
          <DataProvenance
            quality={data.cached ? 'cached' : data.online ? 'live' : 'unknown'}
            source={data.source || 'INMET'}
            updatedAt={data.fetchedAt}
            note={data.cached ? 'Última resposta válida preservada pelo Service Worker. Alertas em cache podem ter mudado desde a consulta original.' : data.note}
            compact
          />
        )}

        {data?.cached && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div><strong>CACHE.</strong> Esta não é uma consulta ao vivo. Confirme horário e validade de cada aviso quando a conexão voltar.</div>
          </div>
        )}

        {!data?.cached && data?.error && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
            <CloudOff className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div><strong>Fonte indisponível.</strong> {data.message || 'O Aussy não interpreta falha da fonte como ausência de alertas.'}</div>
          </div>
        )}

        {ufs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Filtrar alertas por estado">
            <span className="mr-1 text-xs font-semibold text-slate-600 dark:text-slate-400">UF</span>
            <button onClick={() => setFilterUf('')} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium ${!filterUf ? 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'}`}>Todas</button>
            {ufs.map((uf) => (
              <button key={uf} onClick={() => setFilterUf(uf)} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium ${filterUf === uf ? 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'}`}>{uf}</button>
            ))}
          </div>
        )}

        <div aria-live="polite">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-5 text-sm text-slate-600 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Consultando alertas oficiais…</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center dark:border-slate-800 dark:bg-slate-900">
              <CloudRain className="mx-auto mb-2 h-6 w-6 text-slate-500" />
              <p className="text-sm leading-5 text-slate-700 dark:text-slate-300">
                {data?.error
                  ? 'Sem resposta válida do INMET para concluir se existem alertas.'
                  : data?.cached
                    ? 'A última cópia válida não contém alertas para este filtro.'
                    : 'A resposta atual do INMET não retornou alertas para este filtro.'}
              </p>
            </div>
          ) : (
            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {filteredAlerts.map((alert, index) => {
                const Icon = getEventIcon(alert.evento)
                const severityClass = SEVERITY_COLORS[alert.severidade] || 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/25 dark:text-amber-200'
                return (
                  <article key={`${alert.aviso}-${index}`} className={`rounded-xl border p-3.5 ${severityClass}`} style={{ borderLeftWidth: '4px', borderLeftColor: alert.cor || '#f59e0b' }}>
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold">{alert.evento}</span>
                          {alert.uf && <Badge variant="outline" className="px-2 py-0.5 text-xs font-semibold">{alert.uf}</Badge>}
                        </div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] opacity-80">{alert.severidade || 'Severidade não informada'}</div>
                        {alert.descricao && <p className="mt-2 text-sm leading-5 opacity-95">{alert.descricao}</p>}
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium opacity-80"><Clock className="h-3.5 w-3.5" />{formatDate(alert.inicio)} → {formatDate(alert.fim)}</div>
                        {alert.municipios && alert.municipios.length > 0 && (
                          <details className="mt-2">
                            <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{alert.municipios.length} município(s) afetado(s)</summary>
                            <div className="pb-1 text-sm leading-5 opacity-90">{alert.municipios.slice(0, 30).join(', ')}{alert.municipios.length > 30 && `… +${alert.municipios.length - 30}`}</div>
                          </details>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <span>Fonte: Instituto Nacional de Meteorologia · INMET</span>
          {data?.fetchedAt && <span>{data.cached ? 'consulta original ' : 'consultado '}{new Date(data.fetchedAt).toLocaleTimeString('pt-BR')}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
