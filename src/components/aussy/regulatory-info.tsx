'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Landmark,
  FileText,
  Building2,
  Database,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { BRAZIL_REGULATORY } from '@/lib/data/satellites'

export function RegulatoryInfo() {
  return (
    <div className="space-y-4">
      {/* ANATEL status */}
      <Card className="glass-card border-signal/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-5 w-5 text-signal" />
            Regulação Brasileira — D2C
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Agência reguladora
            </div>
            <div className="text-sm font-medium">{BRAZIL_REGULATORY.agency}</div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-amber-400 mb-1">
              Status D2C no Brasil
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {BRAZIL_REGULATORY.d2cStatus}
            </p>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-400 mb-2">
              Operadoras em negociação
            </div>
            <div className="space-y-1.5">
              {BRAZIL_REGULATORY.operatorsInNegotiation.map((op, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/30"
                >
                  <Clock className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-foreground/80">{op}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regulações */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-orbit" />
            Marcos Regulatórios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {BRAZIL_REGULATORY.relevantRegulations.map((reg, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 rounded-md bg-secondary/30 border border-border/30"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-foreground/80">{reg}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Datasets públicos */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-5 w-5 text-signal" />
            Dados Públicos Oficiais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {BRAZIL_REGULATORY.publicDatasets.map((dataset, i) => (
              <div
                key={i}
                className="p-3 rounded-md bg-secondary/30 border border-border/30"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-signal flex-shrink-0" />
                    <span className="text-sm font-medium">{dataset.name}</span>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                    <a href={dataset.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {dataset.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Por que D2C não funcionou ainda no Brasil */}
      <Card className="glass-card border-amber-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-amber-400">
            <XCircle className="h-5 w-5" />
            Por que D2C ainda não funciona no Brasil?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <Block
              num="1"
              title="Espectro licenciado"
              desc="ANATEL ainda não autorizou o uso das bandas celulares (1910-1990 MHz) para retransmissão via satélite. Cada MHz é leiloado — operadoras não cedem gratuitamente."
            />
            <Block
              num="2"
              title="Acordo operadora-satélite"
              desc="Mesmo com autorização da ANATEL, é necessário contrato bilateral entre a operadora brasileira (Vivo/Claro/Tim) e o operador do satélite (SpaceX/AST/Lynk). Negociações em andamento desde 2024."
            />
            <Block
              num="3"
              title="Atualização de firmware"
              desc="Mesmo após acordo, os celulares precisam receber atualização OTA (Over-The-Air) habilitando a conectividade D2C. Isso depende da fabricante (Samsung, Apple, Motorola) trabalhar com a operadora."
            />
            <Block
              num="4"
              title="Modelo de cobrança"
              desc="Ainda não está definido se será: incluso no plano, add-on pago, ou cota gratuita (como T-Mobile faz nos EUA). Esta decisão impacta diretamente se será 'gratuito' para o usuário final."
            />
          </div>

          <div className="pt-3 border-t border-border/30">
            <p className="text-xs text-foreground/70 leading-relaxed">
              <strong className="text-amber-400">Previsão realista:</strong> D2C operacional no Brasil entre Q3 2026 e Q2 2027, com Vivo e AST SpaceMobile como prováveis pioneiros. Até lá, este app oferece o máximo possível com tecnologias ativas hoje.
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
