'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Siren,
  Phone,
  Shield,
  Flame,
  Ambulance,
  Scale,
  Heart,
  Waves,
  Droplet,
  Wind,
  Zap,
  Moon,
  Bug,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Languages,
} from 'lucide-react'
import { BRAZIL_EMERGENCY_NUMBERS } from '@/lib/data/satellites'
import { FIRST_AID_GUIDES, EMERGENCY_KIT_CHECKLIST, EMERGENCY_PHRASES, type FirstAidGuide } from '@/lib/data/first-aid'

const iconMap: Record<string, any> = {
  ambulance: Ambulance,
  shield: Shield,
  flame: Flame,
  police: Shield,
  heart: Heart,
  scale: Scale,
  phone: Phone,
  alert: AlertTriangle,
  wind: Wind,
  droplet: Droplet,
  zap: Zap,
  moon: Moon,
  waves: Waves,
  bug: Bug,
}

export function EmergencySOS(_location: { observerLat?: number; observerLon?: number }) {
  const [showKit, setShowKit] = useState(false)
  const [showFirstAid, setShowFirstAid] = useState<FirstAidGuide | null>(null)
  const [showPhrases, setShowPhrases] = useState(false)
  const [contacts, setContacts] = useState<any>(null)
  const [sosActive, setSosActive] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close() } catch {}
        audioCtxRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    fetch('/api/emergency/contacts')
      .then((r) => {
        if (!r.ok) throw new Error('Falha')
        return r.json()
      })
      .then(setContacts)
      .catch(() => null)
  }, [])

  const handleSOS = () => {
    setSosActive(true)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200, 100, 500])
    }
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2)
      osc.start()
      osc.stop(ctx.currentTime + 2)
    } catch {}
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card-emergency relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Phone className="h-4 w-4 text-red-400" />
              Ligar agora — toque no número
            </h3>
            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
              atalho de discagem
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {BRAZIL_EMERGENCY_NUMBERS.slice(0, 4).map((num) => {
              const Icon = iconMap[num.icon] || Phone
              return (
                <a
                  key={num.number}
                  href={`tel:${num.number}`}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 transition-all active:scale-95"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-red-300" />
                  </div>
                  <div className="font-mono-jet font-bold text-lg text-red-300">{num.number}</div>
                  <div className="text-[10px] text-muted-foreground text-center leading-tight">{num.name}</div>
                </a>
              )
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
            O atalho não depende de dados móveis, mas a chamada telefônica ainda exige serviço de voz/rede disponível no aparelho.
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card-emergency relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleSOS}
              className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all active:scale-95 ${
                sosActive
                  ? 'bg-red-500 scale-110'
                  : 'bg-red-500/20 border-2 border-red-500 hover:bg-red-500/40'
              }`}
            >
              {sosActive && (
                <>
                  <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping" />
                  <span className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-pulse" />
                </>
              )}
              <Siren className={`h-12 w-12 ${sosActive ? 'text-white' : 'text-red-400'}`} />
              <span className={`text-xs font-bold mt-1 ${sosActive ? 'text-white' : 'text-red-400'}`}>
                SOS
              </span>
            </button>
            <div className="text-center">
              <p className="text-sm font-medium">Ativar Modo de Emergência</p>
              <p className="text-xs text-muted-foreground mt-1">
                Vibra + alerta sonoro. Use para chamar atenção em situação de risco.
              </p>
            </div>

            {sosActive && (
              <div className="w-full pt-3 border-t border-border/50">
                <p className="text-xs text-amber-400 mb-2 text-center">Selecione o serviço:</p>
                <div className="grid grid-cols-2 gap-2">
                  {BRAZIL_EMERGENCY_NUMBERS.slice(0, 4).map((num) => {
                    const Icon = iconMap[num.icon] || Phone
                    return (
                      <a
                        key={num.number}
                        href={`tel:${num.number}`}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary/60 border border-border/30 transition-colors"
                      >
                        <Icon className="h-4 w-4 text-red-400 flex-shrink-0" />
                        <div className="text-left min-w-0">
                          <div className="font-mono-jet font-bold text-sm">{num.number}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{num.name}</div>
                        </div>
                      </a>
                    )
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs"
                  onClick={() => setSosActive(false)}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-5 w-5 text-red-400" />
            Números de Emergência — Brasil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {BRAZIL_EMERGENCY_NUMBERS.map((num) => {
              const Icon = iconMap[num.icon] || Phone
              return (
                <a
                  key={num.number}
                  href={`tel:${num.number}`}
                  className="flex items-center gap-2.5 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 border border-border/30 transition-colors group"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30">
                    <Icon className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono-jet font-bold text-base">{num.number}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{num.name}</div>
                  </div>
                </a>
              )
            })}
          </div>

          {contacts?.satelliteSos && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-3.5 w-3.5 text-signal" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SOS via satélite do aparelho
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-md bg-secondary/30 border border-border/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-foreground">{contacts.satelliteSos.apple.device}</span>
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                      {contacts.satelliteSos.apple.coverage}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    {contacts.satelliteSos.apple.note}
                  </p>
                </div>
                <div className="p-2 rounded-md bg-secondary/30 border border-border/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-foreground">{contacts.satelliteSos.android.device}</span>
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                      {contacts.satelliteSos.android.coverage}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    {contacts.satelliteSos.android.note}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-amber-400 mt-2 leading-relaxed">
                ⚠️ {contacts.satelliteSos.limitations}
              </p>
            </div>
          )}

          {contacts?.smsBroadcast && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {contacts.smsBroadcast.name || 'Defesa Civil Alerta'}
                </span>
              </div>
              <p className="text-xs text-foreground/70 leading-relaxed">
                {contacts.smsBroadcast.description}
              </p>
              {contacts.smsBroadcast.smsRegistration && (
                <div className="mt-2 rounded-md border border-border/30 bg-secondary/30 p-2 text-[10px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">SMS por CEP:</strong> {contacts.smsBroadcast.smsRegistration.instruction}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-5 w-5 text-orbit" />
            Guias de Primeiros Socorros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72">
            <div className="space-y-1.5">
              {FIRST_AID_GUIDES.map((guide) => {
                const Icon = iconMap[guide.icon] || Stethoscope
                return (
                  <button
                    key={guide.id}
                    onClick={() => setShowFirstAid(guide)}
                    className="flex items-center gap-3 p-2.5 w-full rounded-md bg-secondary/30 hover:bg-secondary/50 border border-border/30 transition-colors text-left"
                  >
                    <Icon
                      className={`h-4 w-4 flex-shrink-0 ${
                        guide.severity === 'critico'
                          ? 'text-red-400'
                          : guide.severity === 'urgente'
                          ? 'text-amber-400'
                          : 'text-signal'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{guide.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{guide.summary}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] uppercase flex-shrink-0 ${
                        guide.severity === 'critico'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : guide.severity === 'urgente'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-signal/10 text-signal border-signal/30'
                      }`}
                    >
                      {guide.severity}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </ScrollArea>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={() => setShowKit(true)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Kit Emergência
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPhrases(true)}>
              <Languages className="h-3.5 w-3.5 mr-1.5" />
              Frases PT/EN/ES
            </Button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!showFirstAid} onOpenChange={(v) => !v && setShowFirstAid(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          {showFirstAid && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = iconMap[showFirstAid.icon] || Stethoscope
                    return <Icon className="h-5 w-5 text-red-400" />
                  })()}
                  {showFirstAid.title}
                </SheetTitle>
                <SheetDescription>{showFirstAid.summary}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-emerald-400 mb-2">
                    Passo a passo
                  </h4>
                  <ol className="space-y-2">
                    {showFirstAid.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-signal/20 text-signal flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
                  <h4 className="text-xs uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Atenção
                  </h4>
                  <ul className="space-y-1 text-xs text-foreground/80">
                    {showFirstAid.warnings.map((w, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-red-400">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
                  <h4 className="text-xs uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Quando chamar 192
                  </h4>
                  <ul className="space-y-1 text-xs text-foreground/80">
                    {showFirstAid.whenToCall.map((w, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg bg-secondary/30 border border-border/40 p-3 text-[11px] text-muted-foreground leading-relaxed">
                  <div className="font-medium text-foreground mb-1">Conteúdo educativo — não substitui atendimento profissional</div>
                  <div><strong className="text-foreground">Fonte:</strong> {showFirstAid.sourceLabel}</div>
                  <div><strong className="text-foreground">Verificado:</strong> {showFirstAid.verifiedAt}</div>
                  <div className="mt-2 space-y-1">
                    {showFirstAid.sourceUrls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block text-signal hover:underline break-all">
                        Abrir fonte oficial
                      </a>
                    ))}
                  </div>
                  <p className="mt-2">Em urgência ou emergência, acione o SAMU 192 e siga as orientações do regulador.</p>
                </div>

                <Button asChild className="w-full bg-red-500 hover:bg-red-600 text-white">
                  <a href="tel:192">
                    <Phone className="h-4 w-4 mr-2" />
                    Ligar para SAMU — 192
                  </a>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={showKit} onOpenChange={setShowKit}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Checklist — Kit de Emergência
            </SheetTitle>
            <SheetDescription>Checklist local de preparação. Adapte às orientações oficiais da sua região e ao seu contexto.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {EMERGENCY_KIT_CHECKLIST.map((cat) => (
              <div key={cat.category}>
                <h4 className="text-xs uppercase tracking-wider text-signal mb-2">
                  {cat.category}
                </h4>
                <ul className="space-y-1.5">
                  {cat.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="h-4 w-4 rounded accent-signal" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showPhrases} onOpenChange={setShowPhrases}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-signal" />
              Frases de Emergência
            </SheetTitle>
            <SheetDescription>Para estrangeiros em situação de risco no Brasil</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {EMERGENCY_PHRASES.map((phrase, i) => (
              <div key={i} className="rounded-lg bg-secondary/30 border border-border/30 p-3">
                <div className="text-sm font-medium text-foreground mb-1.5">{phrase.pt}</div>
                <div className="text-xs text-signal font-mono-jet">EN: {phrase.en}</div>
                <div className="text-xs text-orbit font-mono-jet">ES: {phrase.es}</div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
