'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, Phone, Mail, Globe, Search, RefreshCw, AlertTriangle, FileText } from 'lucide-react'

interface ContatoDefesaCivil {
  uf: string
  estado: string
  telefone: string
  email: string | null
  site: string
  coordenadoria: string
}

interface AlertaDefesaCivil {
  uf: string
  estado: string
  tipo: string
  titulo: string
  descricao: string
  inicio: string
  fim: string | null
  severidade: 'info' | 'atencao' | 'alerta' | 'alerta_max'
  municipios: string[]
  fonte: string
}

interface DefesaCivilResponse {
  online: boolean
  fonte: string
  emergencia_numero: string
  alertas: AlertaDefesaCivil[]
  contatos: ContatoDefesaCivil[]
  atualizado_em: string
  documentos_legais: Record<string, string>
  observacao: string
}

export function DefesaCivil() {
  const [data, setData] = useState<DefesaCivilResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  const fetchDC = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/defesacivil/alertas')
      const json = await res.json()
      setData(json)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDC()
    const interval = setInterval(fetchDC, 1800000) // 30 min
    return () => clearInterval(interval)
  }, [])

  const getSeveridadeColor = (s: string) => {
    switch (s) {
      case 'alerta_max':
        return 'border-red-500/60 bg-red-500/10'
      case 'alerta':
        return 'border-orange-500/60 bg-orange-500/10'
      case 'atencao':
        return 'border-amber-500/60 bg-amber-500/10'
      default:
        return 'border-cyan-500/60 bg-cyan-500/10'
    }
  }

  const getSeveridadeBadge = (s: string) => {
    switch (s) {
      case 'alerta_max':
        return <Badge variant="outline" className="text-[10px] text-red-400 border-red-500/40 bg-red-500/10">CALAMIDADE</Badge>
      case 'alerta':
        return <Badge variant="outline" className="text-[10px] text-orange-400 border-orange-500/40 bg-orange-500/10">ALERTA</Badge>
      case 'atencao':
        return <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40 bg-amber-500/10">ATENÇÃO</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/40 bg-cyan-500/10">INFO</Badge>
    }
  }

  const contatosFiltrados = (data?.contatos || []).filter((c) => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return c.estado.toLowerCase().includes(q) || c.uf.toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-background/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-200 text-sm">
            <Shield className="h-4 w-4" />
            Defesa Civil Nacional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-background/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-200 text-sm">
            <Shield className="h-4 w-4" />
            Defesa Civil Nacional · 199
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={fetchDC}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Alertas sazonais */}
        {data.alertas.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-amber-100 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Alertas sazonais
            </h4>
            {data.alertas.map((a, i) => (
              <div key={i} className={`border rounded-lg p-2.5 ${getSeveridadeColor(a.severidade)}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <div className="font-semibold text-xs">{a.titulo}</div>
                    <div className="text-[10px] text-muted-foreground font-mono-jet">
                      {a.estado} · {a.fonte} · {a.tipo}
                    </div>
                  </div>
                  {getSeveridadeBadge(a.severidade)}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{a.descricao}</p>
                {a.municipios.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {a.municipios.slice(0, 4).map((m) => (
                      <span key={m} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 border border-border/40">
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contato de emergência nacional */}
        <div className="border border-red-500/40 rounded-lg p-2.5 bg-red-500/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground font-mono-jet uppercase">Emergência nacional</div>
              <div className="text-lg font-bold text-red-300 font-mono-jet">199</div>
            </div>
            <a href="tel:199">
              <Button size="sm" className="bg-red-500/80 hover:bg-red-500">
                <Phone className="h-3 w-3 mr-1" /> Ligar 199
              </Button>
            </a>
          </div>
        </div>

        {/* Busca por estado */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-amber-100">Coordenadorias Estaduais (CEDEC)</h4>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filtrar por estado ou UF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
            {contatosFiltrados.map((c) => (
              <div key={c.uf} className="border border-border/40 rounded-lg p-2 bg-secondary/30 text-[10px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono-jet font-bold text-amber-200">{c.uf}</span>
                  <span className="text-muted-foreground text-[9px] truncate ml-1">{c.coordenadoria}</span>
                </div>
                <div className="text-foreground font-semibold truncate mb-0.5">{c.estado}</div>
                <div className="flex items-center gap-1 mb-0.5">
                  <Phone className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                  <a href={`tel:${c.telefone.replace(/\D/g, '')}`} className="text-cyan-400 hover:underline truncate">
                    {c.telefone}
                  </a>
                </div>
                {c.email && (
                  <div className="flex items-center gap-1 mb-0.5">
                    <Mail className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                    <a href={`mailto:${c.email}`} className="text-cyan-400 hover:underline truncate">
                      {c.email}
                    </a>
                  </div>
                )}
                <a
                  href={c.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:underline truncate"
                >
                  <Globe className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="truncate">site oficial</span>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Documentos legais */}
        {data.documentos_legais && Object.keys(data.documentos_legais).length > 0 && (
          <div className="border-t border-border/30 pt-2">
            <h4 className="text-xs font-semibold text-amber-100 mb-1.5 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Base legal
            </h4>
            <ul className="space-y-1 text-[10px] text-muted-foreground">
              {Object.entries(data.documentos_legais).map(([key, val]) => (
                <li key={key} className="leading-relaxed">
                  <span className="font-mono-jet text-amber-300">{key.toUpperCase()}</span> — {val}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[9px] text-muted-foreground/70 pt-1 border-t border-border/30">
          SEDEC/MI — Secretaria Nacional de Proteção e Defesa Civil · Coordenadorias Estaduais (CEDEC)
        </p>
      </CardContent>
    </Card>
  )
}
