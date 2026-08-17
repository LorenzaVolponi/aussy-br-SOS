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

  useEffect(() => {
    void fetchSat()
  }, [])

  if (loading) {
    return (
      <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-background/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-200 text-sm">
            <Satellite className="h-4 w-4 orbit-pulse" />
            Imagens de satélite · CPTEC/INPE
          </CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-28 w-full" /></CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-background/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-cyan-200 text-sm">
            <Satellite className="h-4 w-4 orbit-pulse" />
            Satélite · CPTEC/INPE
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={fetchSat}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[9px] border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
            <ShieldCheck className="h-3 w-3 mr-1" />
            PORTAL OFICIAL
          </Badge>
          <span className="text-[10px] text-muted-foreground">verificado em {data?.verifiedAt || '—'}</span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {data?.aviso || 'Portal oficial CPTEC/INPE indisponível nesta sessão.'}
        </p>

        {data && (
          <div className="grid gap-2 sm:grid-cols-3">
            <OfficialLink href={data.pagina_base} label="SIGMA · agora" />
            <OfficialLink href={data.acervo} label="Acervo HD" />
            <OfficialLink href={data.pagina_satelites} label="Divisão de Satélites" />
          </div>
        )}

        <p className="text-[9px] text-muted-foreground/70 pt-2 border-t border-border/30">
          O Aussy não exibe imagem “atual” se não conseguir confirmar o arquivo real por HTTPS. Isso evita mixed content e timestamps/URLs fabricados.
        </p>
      </CardContent>
    </Card>
  )
}

function OfficialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-[11px] text-cyan-200 hover:bg-cyan-500/10"
    >
      <span>{label}</span>
      <ExternalLink className="h-3 w-3 flex-shrink-0" />
    </a>
  )
}
