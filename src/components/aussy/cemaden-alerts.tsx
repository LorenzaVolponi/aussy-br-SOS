'use client'

import { useCallback, useEffect, useState } from 'react'
import { Flame, CloudRain, RefreshCw, Loader2, AlertTriangle, MapPin, Clock, CloudOff, ExternalLink, ShieldCheck } from 'lucide-react'
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

interface OfficialPortal { name: string; url: string }
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
interface QueimadasResponse { focos: FocoQueimada[]; total: number; raio: number; error?: string; message?: string; fetchedAt: string; source?: string }

const RISCO_COLORS: Record<string, string> = {
  Baixo: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-200',
  Médio: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-200',
  Alto: 'border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-800 dark:bg-orange-950/25 dark:text-orange-200',
  Crítico: 'border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/25 dark:text-red-200',
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
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
      setCemaden(await res.json())
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
        const proximos = json.focos.filter((foco) => (foco.distanciaKm ?? 9999) < 50).length
        if (proximos > 0) toast.warning(`${proximos} foco(s) de queimada a menos de 50 km`)
      }
    } catch {
      if (!silent) toast.error('Erro ao buscar focos de queimada')
    } finally {
      setLoadingQueimadas(false)
    }
  }, [point])

  useEffect(() => { void fetchCemaden() }, [fetchCemaden])
  useEffect(() => { if (point) void fetchQueimadas(); else setQueimadas(null) }, [point, fetchQueimadas])
  useEffect(() => {
    const interval = window.setInterval(() => { void fetchCemaden(true); if (point) void fetchQueimadas(true) }, 30 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [fetchCemaden, fetchQueimadas, point])

  const totalFocos = queimadas?.total || 0

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div><CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-slate-50"><AlertTriangle className="h-5 w-5 text-orange-700 dark:text-orange-300" />Riscos naturais · fontes oficiais</CardTitle><p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">INPE para focos de fogo e CEMADEN como referência oficial de monitoramento e risco.</p></div>
          <Button onClick={() => { void fetchCemaden(); if (point) void fetchQueimadas() }} size="icon" variant="ghost" className="h-11 w-11 flex-shrink-0" disabled={loadingCemaden || loadingQueimadas} aria-label="Atualizar riscos naturais">{loadingCemaden || loadingQueimadas ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><Flame className="h-4 w-4 text-red-700 dark:text-red-300" />Focos de queimada · INPE</div>{point && <Badge variant="outline" className="px-2 py-1 text-xs">raio {queimadas?.raio || 200} km</Badge>}</div>

          {!point ? (
            <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-5 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200"><MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" /><span><strong>Aguardando localização válida.</strong> Nenhuma cidade padrão é assumida para consultar queimadas.</span></div>
          ) : queimadas?.error ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200"><CloudOff className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{queimadas.message || 'Dados de queimadas indisponíveis.'}</span></div>
          ) : loadingQueimadas ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-600 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Buscando focos na fonte oficial…</div>
          ) : totalFocos === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-5 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">A consulta atual do INPE não retornou focos neste raio. Isso não é garantia de ausência de incêndio.</div>
          ) : (
            <div className="space-y-2">
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-950 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-200">{totalFocos} foco(s) retornado(s) pelo INPE no raio consultado.</div>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">{(queimadas?.focos || []).slice(0, 8).map((foco) => (
                <article key={foco.id} className={`rounded-xl border p-3 ${RISCO_COLORS[foco.risco] || RISCO_COLORS.Médio}`}>
                  <div className="flex items-start gap-2"><Flame className="mt-0.5 h-4 w-4 flex-shrink-0" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{foco.municipio || 'Sem município'}</span>{foco.uf && <Badge variant="outline" className="px-2 py-0.5 text-xs">{foco.uf}</Badge>}{foco.distanciaKm !== undefined && <span className="text-xs font-medium">{foco.distanciaKm} km</span>}</div><div className="mt-1 text-xs leading-5 opacity-80">{foco.bioma} · satélite {foco.satellite} · {formatDate(foco.dataHora)} · risco {foco.risco}</div></div></div>
                </article>
              ))}</div>
            </div>
          )}
        </section>

        <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"><CloudRain className="h-4 w-4 text-blue-800 dark:text-blue-300" />CEMADEN / MCTI — canais oficiais<Badge variant="outline" className="border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> PORTAL OFICIAL</Badge></div>

          {loadingCemaden ? <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-600 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Carregando referências oficiais…</div> : !cemaden ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">Não foi possível carregar as referências oficiais CEMADEN agora.</div> : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm leading-5 text-slate-700 dark:text-slate-300">{cemaden.note}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">{cemaden.portals.map((portal) => <a key={portal.url} href={portal.url} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-blue-800 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-300"><span>{portal.name}</span><ExternalLink className="h-4 w-4 flex-shrink-0" /></a>)}</div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">Fonte: {cemaden.source} · verificado em {cemaden.verifiedAt}. O Aussy não transforma uma lista vazia de portal em “sem alertas”.</p>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
