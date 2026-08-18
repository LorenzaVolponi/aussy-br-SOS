'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  Bug,
  ChevronDown,
  ChevronRight,
  Eye,
  Fish,
  Heart,
  MapPin,
  PawPrint,
  Search,
  ShieldCheck,
  ShieldX,
  Stethoscope,
  TriangleAlert,
  Worm,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CATEGORIAS_FAUNA,
  FAUNA_STATS,
  PERIGO_LABELS,
  PROTOCOLOS_FAUNA,
  type ProtocoloFauna,
} from '@/lib/data/fauna'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Snake: Worm,
  Bug,
  Fish,
  PawPrint,
  Caterpillar: Worm,
}

export function FaunaProtocols() {
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState<string>('')
  const [expandido, setExpandido] = useState<string | null>(null)

  const filtered = useMemo(() => PROTOCOLOS_FAUNA.filter((protocolo) => {
    if (categoria && protocolo.categoria !== categoria) return false
    if (!search) return true
    const query = search.toLowerCase()
    return protocolo.nomePopular.toLowerCase().includes(query)
      || protocolo.nomeCientifico?.toLowerCase().includes(query)
      || protocolo.descricaoIdentificacao.toLowerCase().includes(query)
      || protocolo.frequenteEm.some((regiao) => regiao.toLowerCase().includes(query))
  }), [search, categoria])

  return (
    <Card className="border-orange-500/20 bg-orange-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-orange-400" />
            Fauna Brasileira — orientação inicial
          </span>
          <Badge variant="outline" className="text-[9px] font-mono-jet bg-orange-500/10 text-orange-300 border-orange-500/30">
            {FAUNA_STATS.total} referências
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200">
          <TriangleAlert className="h-3.5 w-3.5 inline mr-1" />
          <strong>Para leigos:</strong> esta seção ajuda a reconhecer riscos e primeiros cuidados. Não decide espécie, gravidade, soro, medicamento, dose ou tratamento hospitalar. Em emergência, acione <strong>SAMU 192</strong>.
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-background/40">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar referência (ex.: jararaca, escorpião, água-viva)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[10px] text-muted-foreground hover:text-foreground">limpar</button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setCategoria('')}
            className={`text-[10px] px-2 py-1 rounded-md border font-mono-jet ${!categoria
              ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
              : 'border-border/40 text-muted-foreground hover:bg-orange-500/10'}`}
          >
            Todas
          </button>
          {CATEGORIAS_FAUNA.map((cat) => {
            const Icon = ICON_MAP[cat.icon] || Bug
            const active = categoria === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setCategoria(active ? '' : cat.id)}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border font-mono-jet ${active
                  ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                  : 'border-border/40 text-muted-foreground hover:bg-orange-500/10'}`}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
              </button>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-6">
            <Bug className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma referência encontrada para “{search}”</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {filtered.map((protocolo) => (
              <ProtocoloCard
                key={protocolo.id}
                protocolo={protocolo}
                expandido={expandido === protocolo.id}
                onToggle={() => setExpandido(expandido === protocolo.id ? null : protocolo.id)}
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
            <a href="tel:192">SAMU 192</a>
          </Button>
          <Button asChild variant="outline">
            <a href="https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/animais-peconhentos/ciatox/" target="_blank" rel="noopener noreferrer">CIATox oficial</a>
          </Button>
        </div>

        <div className="flex items-start gap-2 p-2.5 rounded bg-secondary/30 border border-border/30 text-[11px] text-muted-foreground">
          <Stethoscope className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Curadoria baseada principalmente no <strong className="text-foreground">Ministério da Saúde</strong> e, para Lonomia, no <strong className="text-foreground">Instituto Butantan</strong>. Fontes e data de verificação aparecem dentro de cada referência.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProtocoloCard({ protocolo, expandido, onToggle }: {
  protocolo: ProtocoloFauna
  expandido: boolean
  onToggle: () => void
}) {
  const perigo = PERIGO_LABELS[protocolo.perigo]
  const Icon = ICON_MAP[CATEGORIAS_FAUNA.find((cat) => cat.id === protocolo.categoria)?.icon || ''] || Bug

  return (
    <div className={`rounded-lg border ${perigo.bg}`}>
      <button onClick={onToggle} className="w-full flex items-start gap-2 p-2.5 text-left">
        <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${perigo.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="font-medium text-sm">{protocolo.nomePopular}</span>
            {protocolo.nomeCientifico && <span className="text-[10px] italic text-muted-foreground">{protocolo.nomeCientifico}</span>}
          </div>
          <div className="flex items-center gap-2 text-[10px] opacity-80 flex-wrap">
            <Badge variant="outline" className={`text-[9px] font-mono-jet px-1 py-0 h-4 ${perigo.color}`}>{perigo.label}</Badge>
            {protocolo.frequenteEm.slice(0, 2).map((regiao) => (
              <span key={regiao} className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{regiao}</span>
            ))}
          </div>
        </div>
        {expandido ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />}
      </button>

      {expandido && (
        <div className="px-2.5 pb-2.5 space-y-3 border-t border-border/20 pt-3">
          <Section icon={Eye} title="Identificação aproximada" color="text-cyan-400">
            <p className="text-[11px] leading-relaxed opacity-90">{protocolo.descricaoIdentificacao}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Não se aproxime nem manipule o animal para confirmar espécie.</p>
          </Section>

          <Section icon={Activity} title="Sinais que podem ocorrer" color="text-amber-400">
            <ul className="text-[11px] space-y-1 opacity-90">
              {protocolo.sintomas.map((sintoma) => (
                <li key={sintoma} className="flex items-start gap-1.5"><span className="text-amber-400 flex-shrink-0">•</span><span className="leading-relaxed">{sintoma}</span></li>
              ))}
            </ul>
            <p className="text-[10px] mt-2 text-muted-foreground italic"><strong>Risco:</strong> {protocolo.gravidade}</p>
          </Section>

          <Section icon={Heart} title="O que fazer agora" color="text-emerald-400">
            <ol className="space-y-2">
              {protocolo.primeirosSocorros.map((item, index) => (
                <li key={`${item.passo}-${index}`} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-300 mt-0.5">{index + 1}</span>
                  <div className="flex-1 text-[11px]"><div className="font-medium text-emerald-300">{item.passo}</div><div className="text-[10px] opacity-80 leading-relaxed">{item.detalhe}</div></div>
                </li>
              ))}
            </ol>
          </Section>

          <Section icon={ShieldX} title="Não fazer" color="text-red-400">
            <ul className="text-[11px] space-y-1">
              {protocolo.proibido.map((item) => (
                <li key={item} className="flex items-start gap-1.5"><span className="text-red-400 flex-shrink-0">✕</span><span className="leading-relaxed">{item}</span></li>
              ))}
            </ul>
          </Section>

          <Section icon={Stethoscope} title="Atendimento" color="text-purple-400">
            <p className="text-[11px] leading-relaxed">{protocolo.atendimento}</p>
            <p className="text-[10px] text-muted-foreground mt-1">O app não indica soro, dose, medicação, acesso venoso nem “janela crítica” de tratamento.</p>
          </Section>

          <Section icon={ShieldCheck} title="Prevenção" color="text-blue-400">
            <ul className="text-[11px] space-y-1 opacity-90">
              {protocolo.prevencao.map((item) => (
                <li key={item} className="flex items-start gap-1.5"><span className="text-blue-400 flex-shrink-0">✓</span><span className="leading-relaxed">{item}</span></li>
              ))}
            </ul>
          </Section>

          <div className="rounded-md bg-secondary/30 border border-border/30 p-3 text-[10px] text-muted-foreground leading-relaxed">
            <div><strong className="text-foreground">Fonte:</strong> {protocolo.sourceLabel}</div>
            <div><strong className="text-foreground">Verificado:</strong> {protocolo.verifiedAt}</div>
            {protocolo.sourceUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block text-signal hover:underline mt-1 break-all">Abrir fonte oficial</a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ icon: Icon, title, color, children }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className={`flex items-center gap-1.5 text-[10px] font-medium ${color} mb-1.5`}><Icon className="h-3 w-3" />{title.toUpperCase()}</div>
      {children}
    </div>
  )
}
