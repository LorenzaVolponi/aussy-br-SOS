'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Waves, RefreshCw, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react'

interface HydrologySource {
  id: string
  name: string
  organization: string
  url: string
  kind: string
  description: string
  recommended: boolean
}

interface RiversResponse {
  online: boolean
  automationAvailable: false
  dataQuality: 'official-portals-only' | 'unavailable'
  verifiedAt?: string
  source: string
  reference: { lat: number; lon: number } | null
  sources: HydrologySource[]
  error?: string | null
  note: string
}

interface Props {
  lat: number
  lon: number
}

export function AnaRios({ lat, lon }: Props) {
  const [data, setData] = useState<RiversResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSources = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ana/rios?lat=${lat}&lon=${lon}`, { cache: 'no-store' })
      const json: RiversResponse = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [lat, lon])

  useEffect(() => {
    void fetchSources()
  }, [fetchSources])

  if (loading) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
            <Waves className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            Rios e cheias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-slate-50">
              <Waves className="h-5 w-5 text-blue-700 dark:text-blue-300" />
              Rios e cheias · fontes oficiais
            </CardTitle>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
              SGB/SACE e ANA para níveis, bacias, boletins e eventos hidrológicos.
            </p>
          </div>
          <Button size="icon" variant="ghost" className="h-11 w-11 flex-shrink-0" onClick={fetchSources} aria-label="Atualizar fontes de rios">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> FONTES OFICIAIS
          </Badge>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {data?.verifiedAt ? `referências verificadas em ${data.verifiedAt}` : 'referências oficiais'}
          </span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p><strong>Sem telemetria inventada.</strong> O Aussy ainda não possui integração autenticada para publicar nível ou tendência do rio dentro do app. Os botões abaixo abrem os sistemas oficiais para a situação atual.</p>
          </div>
        </div>

        {data?.sources?.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.sources.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-[92px] items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-950 dark:text-slate-50">{source.name}</span>
                    {source.recommended && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">principal</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">{source.organization}</p>
                  <p className="mt-1.5 text-sm leading-5 text-slate-700 dark:text-slate-300">{source.description}</p>
                </div>
                <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500 transition group-hover:text-blue-700 dark:text-slate-400 dark:group-hover:text-blue-300" />
              </a>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Não foi possível carregar a lista de fontes oficiais nesta consulta.
          </p>
        )}

        {data?.note && <p className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:text-slate-400">{data.note}</p>}
      </CardContent>
    </Card>
  )
}
