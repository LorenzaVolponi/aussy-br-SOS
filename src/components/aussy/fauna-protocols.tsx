'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Bug,
  Fish,
  PawPrint,
  Worm,
  TriangleAlert,
  Heart,
  Skull,
  Stethoscope,
  ShieldX,
  ShieldCheck,
  Clock,
  MapPin,
  Syringe,
  Eye,
  ChevronDown,
  ChevronRight,
  Activity,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PROTOCOLOS_FAUNA,
  CATEGORIAS_FAUNA,
  PERIGO_LABELS,
  FAUNA_STATS,
  type ProtocoloFauna,
} from '@/lib/data/fauna'

const ICON_MAP: Record<string, any> = {
  Snake: Worm, // serpentes (não há Snake no lucide)
  Bug,
  Fish,
  PawPrint,
  Caterpillar: Worm, // lagartas (não há Caterpillar)
}

export function FaunaProtocols() {
  const [search, setSearch] = useState('')
  const [categoria, setCategoria] = useState<string>('')
  const [expandido, setExpandido] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return PROTOCOLOS_FAUNA.filter((p) => {
      if (categoria && p.categoria !== categoria) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        p.nomePopular.toLowerCase().includes(q) ||
        p.nomeCientifico?.toLowerCase().includes(q) ||
        p.descricaoIdentificacao.toLowerCase().includes(q) ||
        p.frequenteEm.some((r) => r.toLowerCase().includes(q))
      )
    })
  }, [search, categoria])

  return (
    <Card className="border-orange-500/20 bg-orange-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-orange-400" />
            Fauna Brasileira — Acidentes e Protocolos
          </span>
          <Badge variant="outline" className="text-[9px] font-mono-jet bg-orange-500/10 text-orange-300 border-orange-500/30">
            {FAUNA_STATS.total} espécies · {FAUNA_STATS.criticos} críticas
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Busca */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-background/40">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar espécie (ex: jararaca, tityus, arraia)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              limpar
            </button>
          )}
        </div>

        {/* Filtro por categoria */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setCategoria('')}
            className={`text-[10px] px-2 py-1 rounded-md border font-mono-jet ${
              !categoria
                ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                : 'border-border/40 text-muted-foreground hover:bg-orange-500/10'
            }`}
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
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border font-mono-jet ${
                  active
                    ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                    : 'border-border/40 text-muted-foreground hover:bg-orange-500/10'
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Resultados */}
        {filtered.length === 0 ? (
          <div className="text-center py-6">
            <Bug className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Nenhuma espécie encontrada para &ldquo;{search}&rdquo;
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.map((p) => (
              <ProtocoloCard
                key={p.id}
                protocolo={p}
                expandido={expandido === p.id}
                onToggle={() => setExpandido(expandido === p.id ? null : p.id)}
              />
            ))}
          </div>
        )}

        {/* Aviso médico */}
        <div className="flex items-start gap-2 p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
          <Stethoscope className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Protocolos baseados em:</strong> Manual MS de Acidentes por Animais Peçonhentos,
            Instituto Butantan e Fiocruz. <strong>Não substitui atendimento médico.</strong>{' '}
            Em emergência real, ligue <strong>192</strong> (SAMU) e transporte ao hospital.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProtocoloCard({
  protocolo,
  expandido,
  onToggle,
}: {
  protocolo: ProtocoloFauna
  expandido: boolean
  onToggle: () => void
}) {
  const perigo = PERIGO_LABELS[protocolo.perigo]
  const Icon = ICON_MAP[CATEGORIAS_FAUNA.find((c) => c.id === protocolo.categoria)?.icon || ''] || Bug
  const isCritico = protocolo.perigo === 'critico'

  return (
    <div className={`rounded-lg border ${perigo.bg} ${isCritico ? 'blink-emergency' : ''}`}>
      {/* Header clicável */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-2 p-2.5 text-left"
      >
        <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${perigo.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-medium text-sm">{protocolo.nomePopular}</span>
            {protocolo.nomeCientifico && (
              <span className="text-[10px] italic text-muted-foreground">
                {protocolo.nomeCientifico}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] opacity-70">
            <Badge variant="outline" className={`text-[9px] font-mono-jet px-1 py-0 h-4 ${perigo.color}`}>
              {perigo.label}
            </Badge>
            {protocolo.frequenteEm.slice(0, 2).map((r) => (
              <span key={r} className="flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" />
                {r}
              </span>
            ))}
            {protocolo.frequenteEm.length > 2 && (
              <span className="text-muted-foreground">+{protocolo.frequenteEm.length - 2}</span>
            )}
          </div>
        </div>
        {expandido ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
        )}
      </button>

      {/* Conteúdo expandido */}
      {expandido && (
        <div className="px-2.5 pb-2.5 space-y-3 border-t border-border/20 pt-3">
          {/* Identificação */}
          <Section icon={Eye} title="Identificação" color="text-cyan-400">
            <p className="text-[11px] leading-relaxed opacity-90">
              {protocolo.descricaoIdentificacao}
            </p>
          </Section>

          {/* Sintomas */}
          <Section icon={Activity} title="Sintomas" color="text-amber-400">
            <ul className="text-[11px] space-y-1 opacity-90">
              {protocolo.sintomas.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-400 flex-shrink-0">•</span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] mt-2 text-muted-foreground italic">
              <strong>Gravidade:</strong> {protocolo.gravidade}
            </p>
          </Section>

          {/* Primeiros socorros */}
          <Section icon={Heart} title="Primeiros Socorros" color="text-emerald-400">
            <ol className="space-y-2">
              {protocolo.primeirosSocorros.map((ps, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold text-emerald-300 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 text-[11px]">
                    <div className="font-medium text-emerald-300">{ps.passo}</div>
                    <div className="text-[10px] opacity-80 leading-relaxed">{ps.detalhe}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* O que NÃO fazer */}
          <Section icon={ShieldX} title="NÃO Fazer" color="text-red-400">
            <ul className="text-[11px] space-y-1">
              {protocolo.proibido.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-red-400 flex-shrink-0">✕</span>
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Tratamento médico */}
          <Section icon={Syringe} title="Tratamento Médico" color="text-purple-400">
            {protocolo.antiveneno && (
              <div className="text-[11px] mb-1">
                <strong className="text-purple-300">Antiveneno:</strong> {protocolo.antiveneno}
              </div>
            )}
            {protocolo.sorocruz && (
              <div className="text-[11px] mb-1">
                <strong className="text-purple-300">Soro:</strong> {protocolo.sorocruz}
              </div>
            )}
            <div className="text-[11px] flex items-center gap-1 text-orange-400">
              <Clock className="h-3 w-3" />
              <span><strong>Janela crítica:</strong> {protocolo.tempoMaximoAtendimento}</span>
            </div>
          </Section>

          {/* Prevenção */}
          <Section icon={ShieldCheck} title="Prevenção" color="text-blue-400">
            <ul className="text-[11px] space-y-1 opacity-90">
              {protocolo.prevencao.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-blue-400 flex-shrink-0">✓</span>
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: any
  title: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className={`flex items-center gap-1.5 text-[10px] font-medium ${color} mb-1.5`}>
        <Icon className="h-3 w-3" />
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  )
}
