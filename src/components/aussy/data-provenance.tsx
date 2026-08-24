'use client'

import { Badge } from '@/components/ui/badge'
import { Database, RadioTower, Clock3, FlaskConical, Archive, CircleHelp, Ban } from 'lucide-react'

export type DataQuality = 'live' | 'cached' | 'sample' | 'synthetic' | 'static' | 'unavailable' | 'unknown'

interface DataProvenanceProps {
  quality: DataQuality
  source?: string
  updatedAt?: string | null
  note?: string
  compact?: boolean
}

const QUALITY_META: Record<DataQuality, { label: string; className: string; icon: typeof Database }> = {
  live: {
    label: 'DADO REAL',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    icon: RadioTower,
  },
  cached: {
    label: 'CACHE',
    className: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    icon: Archive,
  },
  sample: {
    label: 'AMOSTRA',
    className: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    icon: Database,
  },
  synthetic: {
    label: 'SIMULAÇÃO',
    className: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300',
    icon: FlaskConical,
  },
  static: {
    label: 'BASE LOCAL',
    className: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
    icon: Database,
  },
  unavailable: {
    label: 'INDISPONÍVEL',
    className: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
    icon: Ban,
  },
  unknown: {
    label: 'ORIGEM NÃO VERIFICADA',
    className: 'border-red-500/40 bg-red-500/10 text-red-300',
    icon: CircleHelp,
  },
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function DataProvenance({ quality, source, updatedAt, note, compact = false }: DataProvenanceProps) {
  const meta = QUALITY_META[quality] || QUALITY_META.unknown
  const Icon = meta.icon
  const formatted = formatUpdatedAt(updatedAt)

  if (compact) {
    return (
      <Badge variant="outline" className={`gap-1 text-[9px] font-mono-jet ${meta.className}`} title={note || source}>
        <Icon className="h-2.5 w-2.5" />
        {meta.label}
      </Badge>
    )
  }

  return (
    <div className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-[10px] text-muted-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`gap-1 text-[9px] font-mono-jet ${meta.className}`}>
          <Icon className="h-2.5 w-2.5" />
          {meta.label}
        </Badge>
        {source && <span className="min-w-0 truncate">Fonte: {source}</span>}
        {formatted && (
          <span className="ml-auto inline-flex items-center gap-1 font-mono-jet">
            <Clock3 className="h-2.5 w-2.5" />
            {formatted}
          </span>
        )}
      </div>
      {note && <p className="mt-1 leading-relaxed text-muted-foreground/80">{note}</p>}
    </div>
  )
}
