'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataProvenance } from '@/components/aussy/data-provenance'
import {
  Landmark,
  FileText,
  Building2,
  Database,
  ExternalLink,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import { BRAZIL_REGULATORY } from '@/lib/data/satellites'

export function RegulatoryInfo() {
  return (
    <div className="space-y-4">
      <Card className="glass-card border-signal/30">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-5 w-5 text-signal" />
              Regulação Brasileira — D2C
            </CardTitle>
            <DataProvenance quality="static" compact note="Conteúdo regulatório armazenado no projeto; não é consulta em tempo real à ANATEL." />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataProvenance
            quality="static"
            source="Base regulatória local do Aussy Ontech"
            note="Status regulatório e negociações podem mudar. Antes de qualquer decisão operacional, comercial ou jurídica, confirme diretamente nas fontes oficiais listadas abaixo."
          />

          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Agência reguladora</div>
            <div className="text-sm font-medium">{BRAZIL_REGULATORY.agency}</div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-amber-400 mb-1">Status registrado na base local</div>
            <p className="text-sm text-foreground/80 leading-relaxed">{BRAZIL_REGULATORY.d2cStatus}</p>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-400 mb-2">Referências cadastradas para acompanhamento</div>
            <div className="space-y-1.5">
              {BRAZIL_REGULATORY.operatorsInNegotiation.map((op, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/30">
                  <Clock className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-foreground/80">{op}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-orbit" />
            Marcos Regulatórios cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {BRAZIL_REGULATORY.relevantRegulations.map((reg, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-secondary/30 border border-border/30">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-foreground/80">{reg}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-5 w-5 text-signal" />
            Fontes públicas para verificação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {BRAZIL_REGULATORY.publicDatasets.map((dataset, i) => (
              <div key={i} className="p-3 rounded-md bg-secondary/30 border border-border/30">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-signal flex-shrink-0" />
                    <span className="text-sm font-medium">{dataset.name}</span>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                    <a href={dataset.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir fonte ${dataset.name}`}>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{dataset.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-amber-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-amber-400">
            <ShieldAlert className="h-5 w-5" />
            Barreiras técnicas e regulatórias do D2C
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <Block
              num="1"
              title="Espectro e autorização"
              desc="Serviços D2C dependem de regras de uso de espectro e autorizações aplicáveis. A situação deve ser confirmada na regulação vigente antes de qualquer implantação."
            />
            <Block
              num="2"
              title="Acordos entre operadora e satélite"
              desc="A conectividade comercial depende de acordos técnicos e comerciais entre redes móveis, operadores de satélite e demais participantes do ecossistema."
            />
            <Block
              num="3"
              title="Compatibilidade dos dispositivos"
              desc="A experiência final depende de hardware, firmware, sistema operacional, bandas suportadas e habilitação da operadora; não basta haver cobertura orbital."
            />
            <Block
              num="4"
              title="Modelo de serviço"
              desc="Disponibilidade, franquia, preço e prioridade de mensagens de emergência dependem do produto comercial e da regulação aplicável em cada lançamento."
            />
          </div>

          <div className="pt-3 border-t border-border/30">
            <p className="text-xs text-foreground/70 leading-relaxed">
              <strong className="text-amber-400">Governança:</strong> o Aussy não deve exibir previsão de lançamento, autorização ou parceria como fato atual sem uma fonte oficial consultada e uma data de verificação associada.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Block({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
        {num}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold mb-0.5">{title}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
