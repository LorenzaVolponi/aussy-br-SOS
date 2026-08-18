'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Map as MapIcon,
  Trash2,
  CloudOff,
  CheckCircle2,
  AlertCircle,
  Layers,
  ZoomIn,
  ZoomOut,
  LocateFixed,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useGeolocation } from '@/hooks/use-geolocation'

/**
 * Visualizador interativo usando os tiles raster padrão do OpenStreetMap.
 *
 * Regras de uso:
 * - carrega somente os tiles necessários para a visualização atual;
 * - NÃO oferece pré-download/prefetch de área ou múltiplos níveis de zoom;
 * - o Service Worker pode preservar tiles que o usuário efetivamente visualizou;
 * - quando offline, somente tiles já visualizados/cacheados podem reaparecer;
 * - a atribuição OpenStreetMap permanece visível no mapa.
 *
 * Para mapas offline completos, o projeto precisa de um provedor que autorize
 * explicitamente offline/prefetch ou de infraestrutura de tiles própria.
 */

const TILE_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`

function lonToTileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, z))
}

function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z)
  )
}

function tileXToLon(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180
}

function tileYToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
  return (180 / Math.PI) * Math.atan(Math.sinh(n))
}

const CACHE_NAME = 'aussy-v2-osm-tiles'

interface OfflineMapProps {
  initialLat: number
  initialLon: number
}

export function OfflineMap({ initialLat, initialLon }: OfflineMapProps) {
  const { point, detect, loading: geoLoading } = useGeolocation()
  const [zoom, setZoom] = useState(15)
  const [centerLat, setCenterLat] = useState(initialLat)
  const [centerLon, setCenterLon] = useState(initialLon)
  const [cacheInfo, setCacheInfo] = useState<{ count: number; sizeBytes: number } | null>(null)
  const [tilesLoaded, setTilesLoaded] = useState<Set<string>>(new Set())
  const [failedTiles, setFailedTiles] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (point) {
      setCenterLat(point.lat)
      setCenterLon(point.lon)
    }
  }, [point])

  const centerTileX = lonToTileX(centerLon, zoom)
  const centerTileY = latToTileY(centerLat, zoom)
  const tiles: { z: number; x: number; y: number; offsetX: number; offsetY: number }[] = []

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = centerTileX + dx
      const y = centerTileY + dy
      const max = Math.pow(2, zoom) - 1
      if (x < 0 || y < 0 || x > max || y > max) continue
      tiles.push({ z: zoom, x, y, offsetX: dx, offsetY: dy })
    }
  }

  const handleTileLoad = useCallback((key: string) => {
    setTilesLoaded((previous) => new Set(previous).add(key))
    setFailedTiles((previous) => {
      if (!previous.has(key)) return previous
      const next = new Set(previous)
      next.delete(key)
      return next
    })
  }, [])

  const handleTileError = useCallback((key: string) => {
    setFailedTiles((previous) => new Set(previous).add(key))
  }, [])

  const refreshCacheInfo = useCallback(async () => {
    try {
      const cache = await caches.open(CACHE_NAME)
      const keys = await cache.keys()
      let size = 0

      for (const key of keys) {
        try {
          const response = await cache.match(key)
          if (response && response.type !== 'opaque') {
            size += (await response.blob()).size
          }
        } catch {
          // Respostas opacas podem não expor o corpo/tamanho, mas seguem contadas.
        }
      }

      setCacheInfo({ count: keys.length, sizeBytes: size })
    } catch {
      setCacheInfo({ count: 0, sizeBytes: 0 })
    }
  }, [])

  useEffect(() => {
    void refreshCacheInfo()
  }, [refreshCacheInfo, tilesLoaded])

  const handleClearTiles = async () => {
    if (!confirm('Apagar os tiles OpenStreetMap já visualizados e guardados em cache?')) return
    const cache = await caches.open(CACHE_NAME)
    const keys = await cache.keys()
    await Promise.all(keys.map((key) => cache.delete(key)))
    toast.success('Cache de tiles apagado')
    void refreshCacheInfo()
  }

  const handleRecenter = async () => {
    await detect(true)
  }

  const pan = (dir: 'n' | 's' | 'e' | 'w') => {
    const step = 1
    if (dir === 'n') {
      setCenterLat(tileYToLat(centerTileY - step, zoom) + (centerLat - tileYToLat(centerTileY, zoom)))
    } else if (dir === 's') {
      setCenterLat(tileYToLat(centerTileY + step, zoom) + (centerLat - tileYToLat(centerTileY, zoom)))
    } else if (dir === 'e') {
      setCenterLon(tileXToLon(centerTileX + step, zoom) + (centerLon - tileXToLon(centerTileX, zoom)))
    } else if (dir === 'w') {
      setCenterLon(tileXToLon(centerTileX - step, zoom) + (centerLon - tileXToLon(centerTileX, zoom)))
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const visibleLoaded = tiles.filter(({ z, x, y }) => tilesLoaded.has(`${z}/${x}/${y}`)).length
  const visibleFailed = tiles.filter(({ z, x, y }) => failedTiles.has(`${z}/${x}/${y}`)).length

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <MapIcon className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span className="truncate">Mapa OSM · cache de visualização</span>
          </span>
          {cacheInfo && cacheInfo.count > 0 && (
            <Button
              onClick={handleClearTiles}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-400 flex-shrink-0"
              title="Limpar tiles visualizados"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div
          ref={containerRef}
          className="relative w-full aspect-square sm:aspect-video overflow-hidden rounded-lg border border-border/40 bg-background/50"
          style={{ minHeight: '280px' }}
        >
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {tiles.map(({ z, x, y, offsetX, offsetY }) => {
              const key = `${z}/${x}/${y}`
              const isFailed = failedTiles.has(key)
              return (
                <div
                  key={key}
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{ gridColumn: offsetX + 2, gridRow: offsetY + 2 }}
                >
                  {!isFailed ? (
                    <img
                      src={TILE_URL(z, x, y)}
                      alt=""
                      loading="lazy"
                      onLoad={() => handleTileLoad(key)}
                      onError={() => handleTileError(key)}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                      <CloudOff className="h-5 w-5" />
                      <span className="text-[9px]">sem tile</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-signal border-2 border-white shadow-lg" />
              <div className="absolute inset-0 w-4 h-4 rounded-full bg-signal/40 animate-ping" />
            </div>
          </div>

          <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-20">
            <Button onClick={() => setZoom((value) => Math.min(18, value + 1))} size="sm" variant="secondary" className="h-7 w-7 p-0" title="Aproximar">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button onClick={() => setZoom((value) => Math.max(2, value - 1))} size="sm" variant="secondary" className="h-7 w-7 p-0" title="Afastar">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button onClick={handleRecenter} size="sm" variant="secondary" className="h-7 w-7 p-0" title="Centralizar no GPS" disabled={geoLoading}>
              <LocateFixed className={`h-3.5 w-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="absolute top-2 left-2 flex flex-col items-center gap-1 z-20">
            <Button onClick={() => pan('n')} size="sm" variant="secondary" className="h-6 w-6 p-0 text-[10px]">↑</Button>
            <div className="flex gap-1">
              <Button onClick={() => pan('w')} size="sm" variant="secondary" className="h-6 w-6 p-0 text-[10px]">←</Button>
              <Button onClick={() => pan('e')} size="sm" variant="secondary" className="h-6 w-6 p-0 text-[10px]">→</Button>
            </div>
            <Button onClick={() => pan('s')} size="sm" variant="secondary" className="h-6 w-6 p-0 text-[10px]">↓</Button>
          </div>

          <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-20">
            <Badge variant="outline" className="text-[10px] font-mono-jet bg-background/80">z{zoom}</Badge>
            <Badge variant="outline" className="text-[10px] font-mono-jet bg-background/80">
              {centerLat.toFixed(4)}, {centerLon.toFixed(4)}
            </Badge>
          </div>

          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-1 left-1 z-20 rounded bg-background/85 px-1.5 py-0.5 text-[9px] text-foreground/80 underline-offset-2 hover:underline"
          >
            © OpenStreetMap contributors
          </a>

          {visibleLoaded === 0 && visibleFailed > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-30 text-center px-4">
              <CloudOff className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">
                Sem tile armazenado para esta visualização. Conecte-se e navegue pelo mapa para que apenas os tiles efetivamente vistos possam ficar em cache.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
            {cacheInfo && cacheInfo.count > 0 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            )}
            <div>
              <div className="font-mono-jet text-[10px] text-muted-foreground">TILES JÁ VISTOS</div>
              <div className="font-medium">{cacheInfo?.count ?? 0} tiles</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <div>
              <div className="font-mono-jet text-[10px] text-muted-foreground">TAMANHO LEGÍVEL</div>
              <div className="font-medium">{formatBytes(cacheInfo?.sizeBytes ?? 0)}</div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          O servidor padrão do OpenStreetMap é usado somente para visualização interativa. O Aussy não pré-baixa áreas nem pilhas de zoom: o cache guarda apenas tiles solicitados pela navegação do usuário. Para pacotes de mapa offline completos será necessário usar um provedor que autorize prefetch/offline ou infraestrutura própria.
        </p>
      </CardContent>
    </Card>
  )
}
