'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Satellite, RefreshCw, ExternalLink, Globe } from 'lucide-react'

interface ImagemSatelite {
  id: string
  titulo: string
  url: string
  tipo: 'visivel' | 'infravermelho' | 'vapor' | 'realcada'
  regiao: string
  resolucao: string
  atualizado: string
}

interface CptecSatelliteResponse {
  online: boolean
  fonte: string
  satelite: string
  resolucao: string
  atualizado_em: string
  pagina_base: string
  imagens: ImagemSatelite[]
  aviso: string
}

export function CptecSatellite() {
  const [data, setData] = useState<CptecSatelliteResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [imagemSelecionada, setImagemSelecionada] = useState<string>('goes16-br-real')
  const [imgError, setImgError] = useState(false)

  const fetchSat = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cptec/satellite')
      const json = await res.json()
      setData(json)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSat()
    const interval = setInterval(fetchSat, 600000) // 10 min
    return () => clearInterval(interval)
  }, [])

  const imagem = data?.imagens.find((i) => i.id === imagemSelecionada) || data?.imagens[0]

  if (loading) {
    return (
      <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-background/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-200 text-sm">
            <Satellite className="h-4 w-4 orbit-pulse" />
            Imagens de satélite (GOES-16)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.imagens?.length) {
    return null
  }

  return (
    <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-background/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-cyan-200 text-sm">
            <Satellite className="h-4 w-4 orbit-pulse" />
            Satélite GOES-16 · CPTEC/INPE
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={fetchSat}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="flex flex-wrap gap-1">
          {data.imagens.map((img) => (
            <button
              key={img.id}
              onClick={() => {
                setImagemSelecionada(img.id)
                setImgError(false)
              }}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all active:scale-95 ${
                imagemSelecionada === img.id
                  ? 'bg-cyan-500/30 border border-cyan-500/50 text-cyan-100'
                  : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/60 border border-transparent'
              }`}
            >
              {img.regiao}
            </button>
          ))}
        </div>

        {imagem && (
          <div className="relative aspect-square sm:aspect-video bg-background/40 rounded-lg overflow-hidden border border-border/40">
            {imgError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 space-y-2">
                <Globe className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Imagem não disponível no horário gerado.
                </p>
                <a
                  href={data.pagina_base}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Ver no CPTEC <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagem.url}
                alt={imagem.titulo}
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
                referrerPolicy="no-referrer"
              />
            )}
            <div className="absolute top-1 left-1 bg-background/80 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-mono-jet">
              {imagem.tipo}
            </div>
            <div className="absolute bottom-1 right-1 bg-background/80 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-mono-jet">
              {imagem.resolucao}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] font-mono-jet text-cyan-400 border-cyan-500/40 bg-cyan-500/10">
            {data.satelite}
          </Badge>
          <span className="text-[9px] text-muted-foreground font-mono-jet">
            Atualizado {new Date(data.atualizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <p className="text-[9px] text-muted-foreground/70 pt-1 border-t border-border/30">
          CPTEC/INPE — Imagens reais do satélite GOES-16 atualizadas a cada 10 minutos · Cache 10 min
        </p>
      </CardContent>
    </Card>
  )
}
