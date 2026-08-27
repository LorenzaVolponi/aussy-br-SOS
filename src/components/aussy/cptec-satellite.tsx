'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Satellite, RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react'

interface CptecSatelliteResponse {
  online: boolean
  dataQuality: 'official-portal'
  verifiedAt: string
  fonte: string
  satelite: string
  resolucao: null
  atualizado_em: null
  pagina_base: string
  acervo: string
  pagina_satelites: string
  imagens: []
  aviso: string
}

export function CptecSatellite() {
  const [data, setData] = useState<CptecSatelliteResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSat = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cptec/satellite', { cache: 'no-store' })
      const json = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchSat() }, [])

  if (loading) {
    return <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Satellite className="h-5 w-5 text-blue-800 dark:text-blue-300" />Satélite · CPTEC/INPE</CardTitle></CardHeader><CardContent><Skeleton className="h-28 w-full" /></CardContent></Card>
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div><CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-slate-50"><Satellite className="h-5 w-5 text-blue-800 dark:text-blue-300" />Satélite · CPTEC/INPE</CardTitle><p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">Referência oficial para imagens e acervos. O Aussy não inventa uma imagem “atual” quando não consegue confirmar o arquivo.</p></div>
          <Button size="icon" variant="ghost" className="h-11 w-11 flex-shrink-0" onClick={() => void fetchSat()} aria-label="Atualizar referência CPTEC"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> PORTAL OFICIAL</Badge><span className="text-xs text-slate-600 dark:text-slate-400">verificado em {data?.verifiedAt || '—'}</span></div>
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-5 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200">{data?.aviso || 'Portal oficial CPTEC/INPE indisponível nesta sessão.'}</p>
        {data && <div className="grid gap-2 sm:grid-cols-3"><OfficialLink href={data.pagina_base} label="SIGMA · agora" /><OfficialLink href={data.acervo} label="Acervo HD" /><OfficialLink href={data.pagina_satelites} label="Divisão de Satélites" /></div>}
        <p className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:text-slate-400">Fonte complementar para contexto visual. Alertas meteorológicos oficiais permanecem no INMET; a previsão do Aussy usa modelo meteorológico identificado separadamente.</p>
      </CardContent>
    </Card>
  )
}

function OfficialLink({ href, label }: { href: string; label: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:text-blue-300"><span>{label}</span><ExternalLink className="h-4 w-4 flex-shrink-0" /></a>
}
