'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Waves, RefreshCw, MapPin, AlertTriangle, ExternalLink } from 'lucide-react'

interface EstacaoRios {
  codigo: string
  nome: string
  rio: string
  uf: string
  lat: number
  lon: number
  nivel_atual: null
  nivel_acima_abaixo: null
  tendencia: 'desconhecido'
  atualizado: null
  distancia: number
}

interface AnaRiosResponse {
  online: boolean
  dataQuality: 'reference-location-only'
  verifiedAt: string
  fonte: string
  total: number
  estacoes: EstacaoRios[]
  atualizado_em: null
  officialApi: string
  aviso: string
}

interface Props {
  lat: number
  lon: number
}

export function AnaRios({ lat, lon }: Props) {
  const [data, setData] = useState<AnaRiosResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchRios = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/ana/rios?lat=${lat}&lon=${lon}&raio=500`)
      const json = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchRios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon])

  if (loading) {
    return (
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-background/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-200 text-sm">
            <Waves className="h-4 w-4" />
            Rios e estações fluviométricas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-background/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-blue-200 text-sm">
            <Waves className="h-4 w-4" />
            Rios · referência ANA / SNIRH
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={fetchRios}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[9px] border-amber-500/40 bg-amber-500/10 text-amber-300">
            LOCALIZAÇÃO DE REFERÊNCIA
          </Badge>
          <span className="text-[10px] text-muted-foreground">sem nível/tendência ao vivo nesta build</span>
        </div>

        {data?.estacoes?.length ? (
          <div className="space-y-2">
            {data.estacoes.slice(0, 6).map((estacao) => (
              <div key={estacao.codigo} className="border border-border/40 rounded-lg p-2.5 bg-secondary/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs truncate flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                      {estacao.nome}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono-jet mt-0.5">
                      Rio {estacao.rio} · {estacao.uf} · {estacao.distancia.toFixed(0)} km
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] text-muted-foreground">
                    {estacao.codigo}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-300/90">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  Nível do rio e tendência não disponíveis sem integração oficial autenticada.
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {data ? 'Nenhuma estação de referência no raio de 500 km.' : 'Referência de estações indisponível.'}
          </p>
        )}

        {data?.aviso && (
          <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-border/30 pt-2">
            {data.aviso}
          </p>
        )}

        {data?.officialApi && (
          <a
            href={data.officialApi}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-blue-300 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            HidroWebservice oficial ANA
          </a>
        )}
      </CardContent>
    </Card>
  )
}
