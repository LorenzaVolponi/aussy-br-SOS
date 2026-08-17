'use client'

import { useEffect, useState } from 'react'
import { Share2, MessageCircle, Copy, X, MapPin, Phone, Send, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import { useGeolocation } from '@/hooks/use-geolocation'

interface QuickShareProps {
  /** Quando true, esconde o botão flutuante (ex: já tem outro na tela) */
  hideButton?: boolean
  /** Ponto já detectado externamente — evita re-fetch */
  initialPoint?: { lat: number; lon: number; source?: string } | null
}

/**
 * Botão flutuante + bottom sheet para compartilhar localização instantaneamente.
 * - Gera texto pronto para SMS/WhatsApp
 * - Usa Web Share API quando disponível (abre menu nativo)
 * - Copia para clipboard como fallback
 * - 100% funcional offline depois que GPS é adquirido
 */
export function QuickShare({ hideButton = false, initialPoint = null }: QuickShareProps) {
  const [open, setOpen] = useState(false)
  const [point, setPoint] = useState<{ lat: number; lon: number; source?: string } | null>(initialPoint)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { point: detected, detect, loading: geoLoading } = useGeolocation()

  // Sincroniza com ponto detectado externamente
  useEffect(() => {
    if (initialPoint) setPoint(initialPoint)
  }, [initialPoint])

  useEffect(() => {
    if (detected) {
      setPoint({ lat: detected.lat, lon: detected.lon, source: detected.source })
    }
  }, [detected])

  // Atualiza GPS ao abrir sheet
  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (v && !point) {
      refreshGps()
    }
  }

  const refreshGps = async () => {
    setLoading(true)
    try {
      await detect(true)
    } catch (e) {
      toast.error('Não foi possível obter GPS', {
        description: 'Verifique permissão de localização.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Texto pronto para compartilhamento
  const buildShareText = (): string => {
    if (!point) return 'Aussy Ontech — aguardando GPS...'
    const gmaps = `https://maps.google.com/?q=${point.lat.toFixed(6)},${point.lon.toFixed(6)}`
    const src = point.source === 'gps' ? 'GPS preciso' : point.source === 'ip' ? 'IP aprox.' : 'manual'
    return `🆘 PRECISO DE AJUDA — Aussy Ontech

📍 Localização: ${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}
🎯 Precisão: ${src}
🗺️ Mapa: ${gmaps}

Bateria pode acabar. Por favor, ligue 192 (SAMU) ou 190 (Polícia) e encaminhe esta mensagem.`
  }

  const handleWebShare = async () => {
    if (!point) {
      toast.error('Aguarde o GPS')
      return
    }
    const text = buildShareText()
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Aussy Ontech — SOS Localização',
          text,
          url: `https://maps.google.com/?q=${point.lat},${point.lon}`,
        })
        toast.success('Compartilhado!')
      } catch (e) {
        // user cancelled — silencioso
      }
    } else {
      await copyToClipboard()
    }
  }

  const handleWhatsapp = async () => {
    if (!point) {
      toast.error('Aguarde o GPS')
      return
    }
    const text = encodeURIComponent(buildShareText())
    // Tenta abrir WhatsApp; se não tiver, cai no wa.me
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleSms = () => {
    if (!point) {
      toast.error('Aguarde o GPS')
      return
    }
    // Abre app de SMS nativo com texto pré-preenchido
    const body = encodeURIComponent(buildShareText())
    window.location.href = `sms:?&body=${body}`
  }

  const copyToClipboard = async () => {
    if (!point) {
      toast.error('Aguarde o GPS')
      return
    }
    try {
      await navigator.clipboard.writeText(buildShareText())
      setCopied(true)
      toast.success('Copiado!', {
        description: 'Cole em qualquer app de mensagem.',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      toast.error('Falha ao copiar')
    }
  }

  const mapsUrl = point
    ? `https://maps.google.com/?q=${point.lat},${point.lon}`
    : '#'

  return (
    <>
      {/* Botão flutuante */}
      {!hideButton && (
        <button
          onClick={() => handleOpenChange(true)}
          aria-label="Compartilhar minha localização"
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-signal text-white shadow-lg shadow-signal/30 flex items-center justify-center active:scale-95 transition-all hover:scale-105 hover:shadow-signal/50 group"
        >
          <Share2 className="h-6 w-6" />
          <span className="absolute inset-0 rounded-full border-2 border-signal/40 animate-ping opacity-30" />
          {/* Mini-indicador de status */}
          <span
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
              point?.source === 'gps'
                ? 'bg-emerald-400'
                : point?.source === 'ip'
                ? 'bg-amber-400'
                : 'bg-muted-foreground'
            }`}
          />
        </button>
      )}

      {/* Bottom Sheet */}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-signal" />
              Compartilhar minha localização
            </SheetTitle>
            <SheetDescription>
              Envia sua posição GPS pronta para SMS, WhatsApp ou qualquer app.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            {/* Card de status do GPS */}
            <div className="p-4 rounded-xl border border-border/50 bg-secondary/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-signal" />
                  <span className="text-sm font-mono-jet">
                    {point ? `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}` : 'aguardando...'}
                  </span>
                </div>
                {point && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono-jet ${
                      point.source === 'gps'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : point.source === 'ip'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-signal/10 text-signal border-signal/30'
                    }`}
                  >
                    {point.source === 'gps' ? 'GPS' : point.source === 'ip' ? 'IP' : 'MANUAL'}
                  </Badge>
                )}
              </div>
              <Button
                onClick={refreshGps}
                variant="outline"
                size="sm"
                disabled={loading || geoLoading}
                className="w-full text-xs h-8"
              >
                {loading || geoLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <MapPin className="h-3 w-3 mr-1" />
                )}
                {loading || geoLoading ? 'Adquirindo GPS...' : 'Atualizar GPS'}
              </Button>
            </div>

            {/* Botões de compartilhamento */}
            <div className="grid grid-cols-2 gap-2">
              {/* Web Share nativo */}
              <Button
                onClick={handleWebShare}
                disabled={!point}
                className="h-12 text-xs"
              >
                <Send className="h-4 w-4 mr-1.5" />
                Compartilhar
              </Button>

              {/* WhatsApp */}
              <Button
                onClick={handleWhatsapp}
                disabled={!point}
                variant="outline"
                className="h-12 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                WhatsApp
              </Button>

              {/* SMS */}
              <Button
                onClick={handleSms}
                disabled={!point}
                variant="outline"
                className="h-12 text-xs"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                SMS
              </Button>

              {/* Copiar */}
              <Button
                onClick={copyToClipboard}
                disabled={!point}
                variant="outline"
                className="h-12 text-xs"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-1.5 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4 mr-1.5" />
                )}
                {copied ? 'Copiado!' : 'Copiar texto'}
              </Button>
            </div>

            {/* Preview da mensagem */}
            <div className="p-3 rounded-lg bg-background/50 border border-border/30">
              <div className="text-[10px] font-mono-jet text-muted-foreground mb-1.5">
                PRÉVIA DA MENSAGEM
              </div>
              <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono-jet text-foreground/80">
                {buildShareText()}
              </pre>
            </div>

            {/* Link direto */}
            {point && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center text-xs text-signal hover:underline py-2"
              >
                Abrir no Google Maps →
              </a>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
