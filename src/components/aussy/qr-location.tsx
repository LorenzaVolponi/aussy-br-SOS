'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, MapPin, Loader2, RefreshCw, Download, Share2 } from 'lucide-react'
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

interface QrLocationProps {
  open: boolean
  onOpenChange: (value: boolean) => void
  initialPoint?: { lat: number; lon: number; source?: string } | null
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    const mimeType = match[1]
    const base64 = match[2]
    const byteChars = atob(base64)
    const byteNumbers = new Array(byteChars.length)
    for (let index = 0; index < byteChars.length; index += 1) {
      byteNumbers[index] = byteChars.charCodeAt(index)
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType })
  } catch {
    return null
  }
}

export function QrLocation({ open, onOpenChange, initialPoint = null }: QrLocationProps) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const { point, detect, loading: geoLoading } = useGeolocation()
  const [currentPoint, setCurrentPoint] = useState<{ lat: number; lon: number; source?: string } | null>(initialPoint)

  useEffect(() => {
    setCurrentPoint(initialPoint)
  }, [initialPoint])

  useEffect(() => {
    if (point) {
      setCurrentPoint({ lat: point.lat, lon: point.lon, source: point.source })
    }
  }, [point])

  const refreshGps = async () => {
    setLoading(true)
    try {
      const nextPoint = await detect(true)
      if (!nextPoint) {
        toast.error('Não foi possível obter localização', {
          description: 'Verifique a permissão do GPS ou tente novamente quando houver rede.',
        })
        return
      }
      setCurrentPoint({ lat: nextPoint.lat, lon: nextPoint.lon, source: nextPoint.source })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && !currentPoint) {
      void refreshGps()
    }
    // refreshGps depende de detect; disparar apenas na abertura evita loops de aquisição.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentPoint])

  useEffect(() => {
    let cancelled = false

    if (!currentPoint) {
      setQrDataUrl('')
      return () => {
        cancelled = true
      }
    }

    const url = `https://maps.google.com/?q=${currentPoint.lat.toFixed(6)},${currentPoint.lon.toFixed(6)}`
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0a0a0a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        console.error('Erro gerando QR:', error)
        setQrDataUrl('')
        toast.error('Erro ao gerar QR Code')
      })

    return () => {
      cancelled = true
    }
  }, [currentPoint])

  const handleDownload = () => {
    if (!qrDataUrl) return
    const anchor = document.createElement('a')
    anchor.href = qrDataUrl
    anchor.download = `aussy-localizacao-${Date.now()}.png`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    toast.success('QR Code salvo')
  }

  const handleShareQr = async () => {
    if (!qrDataUrl || !currentPoint) return

    const blob = dataUrlToBlob(qrDataUrl)
    if (!blob) {
      handleDownload()
      return
    }

    try {
      const file = new File([blob], 'aussy-localizacao.png', { type: 'image/png' })
      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Aussy Ontech — Localização',
          text: `Minha localização: ${currentPoint.lat.toFixed(6)}, ${currentPoint.lon.toFixed(6)}`,
          files: [file],
        })
        return
      }
      handleDownload()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      handleDownload()
    }
  }

  const provenanceLabel = currentPoint?.source === 'gps'
    ? 'GPS'
    : currentPoint?.source === 'ip'
      ? 'IP'
      : currentPoint?.source === 'cached'
        ? 'CACHE'
        : currentPoint
          ? 'MANUAL'
          : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-signal" />
            QR Code da localização
          </SheetTitle>
          <SheetDescription>
            O QR pode ser gerado e exibido localmente sem rede depois que uma posição estiver disponível. Abrir o link do Google Maps pode exigir internet ou dados já disponíveis no aparelho.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="p-3 rounded-lg border border-border/50 bg-secondary/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 text-signal" />
                <span className="truncate text-sm font-mono-jet">
                  {currentPoint ? `${currentPoint.lat.toFixed(6)}, ${currentPoint.lon.toFixed(6)}` : 'aguardando localização...'}
                </span>
              </div>
              {currentPoint && provenanceLabel && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono-jet ${
                    currentPoint.source === 'gps'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : currentPoint.source === 'ip'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : currentPoint.source === 'cached'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          : 'bg-signal/10 text-signal border-signal/30'
                  }`}
                >
                  {provenanceLabel}
                </Badge>
              )}
            </div>
            {currentPoint?.source === 'cached' && (
              <p className="mt-2 text-[10px] leading-relaxed text-cyan-200/80">
                Última posição conhecida. Atualize o GPS sempre que possível antes de usar este QR em uma emergência.
              </p>
            )}
            {currentPoint?.source === 'ip' && (
              <p className="mt-2 text-[10px] leading-relaxed text-amber-200/80">
                Localização aproximada por IP. Para maior precisão, atualize o GPS antes de compartilhar.
              </p>
            )}
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl">
            {loading || geoLoading ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-signal" />
                <p className="text-xs text-slate-600">Atualizando localização...</p>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code com link para as coordenadas disponíveis"
                className="w-64 h-64"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <QrCode className="h-12 w-12 text-slate-400" />
                <p className="text-xs text-slate-600">Aguardando localização...</p>
              </div>
            )}
          </div>

          {currentPoint && (
            <div className="text-center text-xs text-muted-foreground px-2">
              O QR contém um link com as coordenadas exibidas acima. Confira a origem da posição antes de compartilhar.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={refreshGps} variant="outline" size="sm" className="h-10" disabled={loading || geoLoading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading || geoLoading ? 'animate-spin' : ''}`} />
              Atualizar GPS
            </Button>
            <Button onClick={handleShareQr} size="sm" className="h-10" disabled={!qrDataUrl}>
              <Share2 className="h-4 w-4 mr-1.5" />
              Compartilhar
            </Button>
          </div>

          <Button onClick={handleDownload} variant="ghost" size="sm" className="w-full text-xs" disabled={!qrDataUrl}>
            <Download className="h-3 w-3 mr-1" />
            Salvar PNG
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
