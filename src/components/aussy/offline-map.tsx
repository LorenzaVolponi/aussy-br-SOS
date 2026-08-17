'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Map as MapIcon,
  Download,
  Trash2,
  Loader2,
  CloudOff,
  CheckCircle2,
  AlertCircle,
  Layers,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { useGeolocation } from '@/hooks/use-geolocation'

/**
 * Mapa offline usando tiles OpenStreetMap.
 *
 * Estratégia:
 * - Renderiza tiles OSM em um grid de 3x3 (centro + 8 vizinhos) na zoom atual
 * - "Baixar mapa offline" pré-cacheia tiles para múltiplos níveis de zoom (14-16)
 *   numa área de ~5km ao redor do usuário
 * - Cache API do Service Worker serve os tiles offline
 * - Quando offline e sem tiles em cache, mostra mensagem clara
 * - Marcador no centro mostra posição do usuário
 */

const TILE_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`

// Converte lat/lon para tile x/y (algoritmo Web Mercator)
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
  initialLat?: number
  initialLon?: number
}

export function OfflineMap({ initialLat = -15.7801, initialLon = -47.9292 }: OfflineMapProps) {
  const { point, detect, loading: geoLoading } = useGeolocation()
  const [zoom, setZoom] = useState(15)
  const [centerLat, setCenterLat] = useState(initialLat)
  const [centerLon, setCenterLon] = useState(initialLon)
  const [caching, setCaching] = useState(false)
  const [cacheProgress, setCacheProgress] = useState(0)
  const [cacheInfo, setCacheInfo] = useState<{ count: number; sizeBytes: number } | null>(null)
  const [tilesLoaded, setTilesLoaded] = useState<Set<string>>(new Set())
  const [failedTiles, setFailedTiles] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // Sincroniza com GPS
  useEffect(() => {
    if (point) {
      setCenterLat(point.lat)
      setCenterLon(point.lon)
    }
  }, [point])

  // Calcula tiles do grid 3x3 centrado na posição atual
  const centerTileX = lonToTileX(centerLon, zoom)
  const centerTileY = latToTileY(centerLat, zoom)
  const tiles: { z: number; x: number; y: number; offsetX: number; offsetY: number }[] = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = centerTileX + dx
      const y = centerTileY + dy
      // Verifica limites válidos
      const max = Math.pow(2, zoom) - 1
      if (x < 0 || y < 0 || x > max || y > max) continue
      tiles.push({ z: zoom, x, y, offsetX: dx, offsetY: dy })
    }
  }

  // Marca tile como carregado
  const handleTileLoad = useCallback((key: string) => {
    setTilesLoaded((prev) => new Set(prev).add(key))
  }, [])

  const handleTileError = useCallback((key: string) => {
    setFailedTiles((prev) => new Set(prev).add(key))
  }, [])

  // Pré-carrega tiles para a área (5km ao redor, zoom 14-16)
  const handleDownloadOffline = async () => {
    setCaching(true)
    setCacheProgress(0)

    const zooms = [14, 15, 16]
    const tilesToFetch: { z: number; x: number; y: number }[] = []
    for (const z of zooms) {
      const cx = lonToTileX(centerLon, z)
      const cy = latToTileY(centerLat, z)
      // 5x5 em cada zoom = ~2.5km raio em zoom 14
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const x = cx + dx
          const y = cy + dy
          const max = Math.pow(2, z) - 1
          if (x < 0 || y < 0 || x > max || y > max) continue
          tilesToFetch.push({ z, x, y })
        }
      }
    }

    const cache = await caches.open(CACHE_NAME)
    let done = 0
    let added = 0
    for (const { z, x, y } of tilesToFetch) {
      const url = TILE_URL(z, x, y)
      try {
        // Verifica se já está em cache
        const cached = await cache.match(url)
        if (!cached) {
          const res = await fetch(url, { cache: 'no-store' })
          if (res.ok) {
            await cache.put(url, res.clone())
            added++
          }
        }
      } catch (e) {
        // ignora — tiles individuais podem falhar
      }
      done++
      setCacheProgress((done / tilesToFetch.length) * 100)
    }

    setCaching(false)
    setCacheProgress(0)
    toast.success('Mapa offline pronto!', {
      description: `${added} novos tiles cacheados (${tilesToFetch.length} totais em 3 níveis de zoom).`,
    })
    refreshCacheInfo()
  }

  // Limpa cache de tiles
  const handleClearTiles = async () => {
    if (!confirm('Apagar todos os tiles de mapa offline?')) return
    const cache = await caches.open(CACHE_NAME)
    const keys = await cache.keys()
    await Promise.all(keys.map((k) => cache.delete(k)))
    toast.success('Tiles apagados')
    refreshCacheInfo()
  }

  // Informações de cache
  const refreshCacheInfo = useCallback(async () => {
    try {
      const cache = await caches.open(CACHE_NAME)
      const keys = await cache.keys()
      let size = 0
      for (const k of keys) {
        const res = await cache.match(k)
        if (res) {
          const blob = await res.blob()
          size += blob.size
        }
      }
      setCacheInfo({ count: keys.length, sizeBytes: size })
    } catch (e) {
      setCacheInfo({ count: 0, sizeBytes: 0 })
    }
  }, [])

  useEffect(() => {
    refreshCacheInfo()
  }, [refreshCacheInfo])

  // Recenter
  const handleRecenter = async () => {
    await detect(true)
  }

  // Mover mapa (pan)
  const pan = (dir: 'n' | 's' | 'e' | 'w') => {
    const step = 1 // 1 tile
    if (dir === 'n') {
      const newLat = tileYToLat(centerTileY - step, zoom) + (centerLat - tileYToLat(centerTileY, zoom))
      setCenterLat(newLat)
    } else if (dir === 's') {
      const newLat = tileYToLat(centerTileY + step, zoom) + (centerLat - tileYToLat(centerTileY, zoom))
      setCenterLat(newLat)
    } else if (dir === 'e') {
      const newLon = tileXToLon(centerTileX + step, zoom) + (centerLon - tileXToLon(centerTileX, zoom))
      setCenterLon(newLon)
    } else if (dir === 'w') {
      const newLon = tileXToLon(centerTileX - step, zoom) + (centerLon - tileXToLon(centerTileX, zoom))
      setCenterLon(newLon)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-emerald-400" />
            Mapa offline (OpenStreetMap)
          </span>
          <div className="flex gap-1">
            <Button onClick={handleDownloadOffline} size="sm" variant="outline" className="h-7 text-xs" disabled={caching}>
              {caching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
              {caching ? 'Baixando...' : 'Baixar offline'}
            </Button>
            {cacheInfo && cacheInfo.count > 0 && (
              <Button onClick={handleClearTiles} size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Visualização do mapa */}
        <div
          ref={containerRef}
          className="relative w-full aspect-square sm:aspect-video overflow-hidden rounded-lg border border-border/40 bg-background/50"
          style={{ minHeight: '280px' }}
        >
          {/* Grid de tiles 3x3 */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {tiles.map(({ z, x, y, offsetX, offsetY }) => {
              const key = `${z}/${x}/${y}`
              const isFailed = failedTiles.has(key)
              return (
                <div
                  key={key}
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{
                    gridColumn: offsetX + 2,
                    gridRow: offsetY + 2,
                  }}
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

          {/* Marcador central do usuário */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-signal border-2 border-white shadow-lg" />
              <div className="absolute inset-0 w-4 h-4 rounded-full bg-signal/40 animate-ping" />
            </div>
          </div>

          {/* Controles de zoom */}
          <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-20">
            <Button
              onClick={() => setZoom((z) => Math.min(18, z + 1))}
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0"
              title="Aproximar"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={() => setZoom((z) => Math.max(2, z - 1))}
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0"
              title="Afastar"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={handleRecenter}
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0"
              title="Centralizar no GPS"
              disabled={geoLoading}
            >
              <LocateFixed className={`h-3.5 w-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Controles de pan (setas) */}
          <div className="absolute top-2 left-2 flex flex-col items-center gap-1 z-20">
            <Button onClick={() => pan('n')} size="sm" variant="secondary" className="h-6 w-6 p-0 text-[10px]">↑</Button>
            <div className="flex gap-1">
              <Button onClick={() => pan('w')} size="sm" variant="secondary" className="h-6 w-6 p-0 text-[10px]">←</Button>
              <Button onClick={() => pan('e')} size="sm" variant="secondary" className="h-6 w-6 p-0 text-[10px]">→</Button>
            </div>
            <Button onClick={() => pan('s')} size="sm" variant="secondary" className="h-6 w-6 p-0 text-[10px]">↓</Button>
          </div>

          {/* Badge de zoom + coords */}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-20">
            <Badge variant="outline" className="text-[10px] font-mono-jet bg-background/80">
              z{zoom}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono-jet bg-background/80">
              {centerLat.toFixed(4)}, {centerLon.toFixed(4)}
            </Badge>
          </div>

          {/* Estado vazio (sem tiles carregados) */}
          {tilesLoaded.size === 0 && failedTiles.size > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-30 text-center px-4">
              <CloudOff className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground mb-3">
                Sem tiles em cache. Toque em &quot;Baixar offline&quot; para pré-carregar o mapa da sua região.
              </p>
            </div>
          )}
        </div>

        {/* Progress de cacheamento */}
        {caching && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono-jet">
              <span>Baixando tiles OpenStreetMap...</span>
              <span>{Math.round(cacheProgress)}%</span>
            </div>
            <Progress value={cacheProgress} className="h-1.5" />
          </div>
        )}

        {/* Info de cache + dicas */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
            {cacheInfo && cacheInfo.count > 0 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            )}
            <div>
              <div className="font-mono-jet text-[10px] text-muted-foreground">TILES EM CACHE</div>
              <div className="font-medium">{cacheInfo?.count ?? 0} tiles</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <div>
              <div className="font-mono-jet text-[10px] text-muted-foreground">TAMANHO</div>
              <div className="font-medium">{formatBytes(cacheInfo?.sizeBytes ?? 0)}</div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          🗺️ Tiles OpenStreetMap (CC-BY-SA). Botão &quot;Baixar offline&quot; cacheia 75 tiles em 3 níveis de zoom (14, 15, 16) — ~2.5km ao redor. Funciona 100% offline após download.
        </p>
      </CardContent>
    </Card>
  )
}
