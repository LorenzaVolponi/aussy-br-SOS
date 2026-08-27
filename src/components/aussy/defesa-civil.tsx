'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, Phone, MessageSquare, Radio, RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react'

interface DefesaCivilResponse {
  online: boolean
  fonte: string
  dataQuality: 'official-channels-only'
  verifiedAt?: string
  emergencia_numero: string
  alertas: unknown[]
  contatos: Array<{ uf: string; estado: string; telefone: string; email: string | null; site: string; coordenadoria: string }>
  alertChannels?: {
    cellBroadcast?: { registrationRequired: boolean; description: string }
    sms?: { number: string; instruction: string }
    whatsapp?: { number: string; instruction: string }
  }
  sourceUrls?: string[]
  atualizado_em: string
  observacao: string
}

export function DefesaCivil() {
  const [data, setData] = useState<DefesaCivilResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDC = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/defesacivil/alertas', { cache: 'no-store' })
      const json = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchDC()
    const interval = window.setInterval(() => void fetchDC(), 30 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [fetchDC])

  if (loading) {
    return <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="h-5 w-5 text-blue-800 dark:text-blue-300" />Defesa Civil</CardTitle></CardHeader><CardContent className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></CardContent></Card>
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-slate-50"><Shield className="h-5 w-5 text-blue-800 dark:text-blue-300" />Defesa Civil · canais oficiais</CardTitle>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">Emergência e inscrição em alertas. Esta tela não inventa uma lista de ocorrências ativas.</p>
          </div>
          <Button size="icon" variant="ghost" className="h-11 w-11 flex-shrink-0" onClick={() => void fetchDC()} aria-label="Atualizar canais da Defesa Civil"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> CANAIS VERIFICADOS</Badge>
          {data?.verifiedAt && <span className="text-xs text-slate-600 dark:text-slate-400">verificados em {data.verifiedAt}</span>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/25">
          <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-red-800 dark:text-red-300">Emergência nacional</p><p className="mt-1 text-3xl font-bold text-red-700 dark:text-red-300">199</p><p className="mt-1 text-sm text-red-900 dark:text-red-200">Defesa Civil</p></div>
          <a href="tel:199" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"><Phone className="mr-2 h-5 w-5" />Ligar 199</a>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <ChannelCard icon={<Radio className="h-5 w-5" />} title="Cell Broadcast" text={data?.alertChannels?.cellBroadcast?.description || 'Alertas de emergência do sistema em aparelhos e redes compatíveis.'} />
          <ChannelCard icon={<MessageSquare className="h-5 w-5" />} title={`SMS ${data?.alertChannels?.sms?.number || '40199'}`} text={data?.alertChannels?.sms?.instruction || 'Envie o CEP da área de interesse para 40199.'} href={`sms:${data?.alertChannels?.sms?.number || '40199'}`} />
          <ChannelCard icon={<MessageSquare className="h-5 w-5" />} title="WhatsApp" text={data?.alertChannels?.whatsapp?.instruction || 'Use o canal oficial Defesa Civil Alertas.'} href={data?.alertChannels?.whatsapp?.number ? `https://wa.me/${data.alertChannels.whatsapp.number.replace(/\D/g, '')}` : undefined} />
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-5 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200">
          {data?.observacao || 'O Aussy mostra canais oficiais nesta tela; alertas meteorológicos ativos ficam no módulo Clima e alertas.'}
        </div>

        {data?.sourceUrls?.length ? (
          <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-400">Referências oficiais</p>
            <div className="flex flex-wrap gap-2">{data.sourceUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-blue-800 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:text-blue-300">Fonte {index + 1}<ExternalLink className="h-4 w-4" /></a>)}</div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ChannelCard({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href?: string }) {
  const content = <><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">{icon}</span><div><p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</p><p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">{text}</p></div></>
  return href ? <a href={href} className="flex min-h-[120px] flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800">{content}</a> : <div className="flex min-h-[120px] flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900">{content}</div>
}
