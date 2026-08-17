'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, MapPin, Loader2, RefreshCw, Download, X, Share2 } from 'lucide-react'
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
  onOpenChange: (v: boolean) => void
  /** Ponto já detectado externamente */
  initialPoint?: { lat: number; lon: number; source?: string } | null
}

// Converte data URL para Blob — compatível com iOS Safari (não usa fetch(data:))
function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    const mimeType = match[1]
    const base64 = match[2]
    const byteChars = atob(base64)
    const byteNumbers = new Array(byteChars.length)
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  } catch {
    return null
  }
}

/**
 * Gera QR Code da localização atual — escaneável por qualquer celular com câmera,
 * mesmo sem internet. Ao escanear, abre o Google Maps com as coordenadas.
 * - Se online: gera URL curta do Maps
 * - Se offline: gera geo: URI (suportada por muitos celulares) + texto com coords
 */
export function QrLocation({ open, onOpenChange, initialPoint }: QrLocationProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { point, detect, loading: geoLoading } = useGeolocation()
  const [currentPoint, setCurrentPoint] = useState<{ lat: number; lon: number; source?: string } | null>(initialPoint || null)

  useEffect(() => {
    if (initialPoint) setCurrentPoint(initialPoint)
  }, [initialPoint])

  useEffect(() => {
    if (point) setCurrentPoint({ lat: point.lat, lon: point.lon, source: point.source })
  }, [point])

  // Atualiza GPS ao abrir
  useEffect(() => {
    if (open && !currentPoint) {
      refreshGps()
    }
  }, [open])

  const refreshGps = async () => {
    setLoading(true)
    try {
      await detect(true)
    } catch (e) {
      toast.error('Não foi possível obter GPS')
    } finally {
      setLoading(false)
    }
  }

  // Gera o QR code quando muda o ponto
  useEffect(() => {
    if (!currentPoint) {
      setQrDataUrl('')
      return
    }
    // Formato: texto simples com URL do Maps + coords (mais compatível que geo: URI)
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
      .then(setQrDataUrl)
      .catch((e) => {
        console.error('Erro gerando QR:', e)
        toast.error('Erro ao gerar QR Code')
      })
  }, [currentPoint])

  const handleDownload = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `aussy-gps-${Date.now()}.png`
    a.click()
    toast.success('QR Code baixado')
  }

  const handleShareQr = async () => {
    if (!qrDataUrl || !currentPoint) return
    try {
      // Converte dataURL para Blob (iOS-safe — não usa fetch(data:))
      const blob = dataUrlToBlob(qrDataUrl)
      if (!blob) {
        handleDownload()
        return
      }
      const file = new File([blob], 'aussy-gps.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Aussy Ontech — Localização GPS',
          text: `Minha localização: ${currentPoint.lat.toFixed(6)}, ${currentPoint.lon.toFixed(6)}`,
          files: [file],
        })
      } else {
        handleDownload()
      }
    } catch (e) {
      handleDownload()
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-signal" />
            QR Code da localização
          </SheetTitle>
          <SheetDescription>
            Qualquer celular com câmera escaneia e abre o Maps — funciona sem internet.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Status GPS */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/30">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-signal" />
              <span className="text-sm font-mono-jet">
                {currentPoint ? `${currentPoint.lat.toFixed(6)}, ${currentPoint.lon.toFixed(6)}` : 'aguardando GPS...'}
              </span>
            </div>
            {currentPoint && (
              <Badge
                variant="outline"
                className={`text-[10px] font-mono-jet ${
                  currentPoint.source === 'gps'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : currentPoint.source === 'ip'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-signal/10 text-signal border-signal/30'
                }`}
              >
                {currentPoint.source === 'gps' ? 'GPS' : currentPoint.source === 'ip' ? 'IP' : 'MANUAL'}
              </Badge>
            )}
          </div>

          {/* QR Code display */}
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl">
            {loading || geoLoading ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-signal" />
                <p className="text-xs text-muted-foreground">Adquirindo GPS...</p>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code da localização"
                className="w-64 h-64"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <QrCode className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">Aguardando GPS...</p>
              </div>
            )}
          </div>

          {/* Texto explicativo */}
          {currentPoint && (
            <div className="text-center text-xs text-muted-foreground px-2">
              Aponte a câmera de qualquer celular para o QR Code. Ele abrirá o Google Maps com sua localização exata.
            </div>
          )}

          {/* Ações */}
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
            Baixar PNG
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
