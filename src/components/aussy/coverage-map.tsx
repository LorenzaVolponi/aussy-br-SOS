'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DataProvenance } from '@/components/aussy/data-provenance'
import {
  MapPin,
  Wifi,
  Radio,
  RefreshCw,
  Signal,
  Building2,
  School,
  BookOpen,
  Cross,
} from 'lucide-react'
import { BRAZIL_OPERATORS } from '@/lib/data/coverage'

interface CoverageData {
  observer: { lat: number; lon: number; radius: number }
  timestamp: string
  source: string
  dataQuality: {
    towers: 'synthetic'
    wifiPoints: 'sample'
  }
  wifiPoints: any[]
  wifiTotal: number
  towers: any[]
  towersTotal: number
  byOperator: any[]
  note: string
}

const wifiTypeIcons: Record<string, any> = {
  praca: MapPin,
  escola: School,
  biblioteca: BookOpen,
  ubs: Cross,
  equipamento_publico: Building2,
}

const wifiTypeLabels: Record<string, string> = {
  praca: 'Praça',
  escola: 'Escola',
  biblioteca: 'Biblioteca',
  ubs: 'UBS',
  equipamento_publico: 'Equipamento Público',
}

export function CoverageMap({ observerLat, observerLon }: { observerLat: number; observerLon: number }) {
  const [data, setData] = useState<CoverageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredItem, setHoveredItem] = useState<any | null>(null)

  const fetchCoverage = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/coverage/towers?lat=${observerLat}&lon=${observerLon}&radius=30`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error(`Falha ao carregar cobertura (${res.status})`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados de cobertura')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoverage()
  }, [observerLat, observerLon])

  // Desenha mapa estilizado (canvas — leve e offline-friendly)
  useEffect(() => {
    if (!data || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#0a0e14'
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)'
    ctx.lineWidth = 1
    const gridSize = 30
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    const cx = w / 2
    const cy = h / 2
    const maxRadius = Math.min(w, h) / 2 - 20

    for (let i = 1; i <= 4; i++) {
      const r = (maxRadius / 4) * i
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, 2 * Math.PI)
      ctx.strokeStyle = `rgba(16, 185, 129, ${0.2 - i * 0.04})`
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = 'rgba(107, 114, 128, 0.5)'
      ctx.font = '9px monospace'
      ctx.fillText(`${(7.5 * i).toFixed(1)}km`, cx + r + 2, cy - 2)
    }

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)'
    ctx.beginPath()
    ctx.moveTo(cx, 5); ctx.lineTo(cx, h - 5)
    ctx.moveTo(5, cy); ctx.lineTo(w - 5, cy)
    ctx.stroke()

    ctx.fillStyle = 'rgba(34, 211, 238, 0.5)'
    ctx.font = 'bold 10px monospace'
    ctx.fillText('N', cx - 3, 14)
    ctx.fillText('S', cx - 3, h - 6)
    ctx.fillText('W', 4, cy + 3)
    ctx.fillText('E', w - 12, cy + 3)

    const range = 0.15
    const project = (lat: number, lon: number) => {
      const x = cx + ((lon - observerLon) / range) * maxRadius
      const y = cy - ((lat - observerLat) / range) * maxRadius
      return { x, y }
    }

    data.towers.forEach((tower) => {
      if (selectedOperator && tower.operator.toLowerCase() !== selectedOperator) return
      const { x, y } = project(tower.lat, tower.lon)
      if (x < 0 || x > w || y < 0 || y > h) return

      const op = BRAZIL_OPERATORS.find((o) => o.name === tower.operator)
      const color = op?.color || '#888'

      ctx.fillStyle = color + 'CC'
      ctx.beginPath()
      ctx.moveTo(x, y - 5)
      ctx.lineTo(x - 4, y + 4)
      ctx.lineTo(x + 4, y + 4)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = color + '40'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, 2 * Math.PI)
      ctx.stroke()

      if (hoveredItem === tower) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, 2 * Math.PI)
        ctx.stroke()
      }
    })

    data.wifiPoints.forEach((wifi) => {
      const { x, y } = project(wifi.lat, wifi.lng)
      if (x < 0 || x > w || y < 0 || y > h) return

      ctx.fillStyle = '#22d3ee'
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.stroke()
    })

    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, 2 * Math.PI)
    ctx.fill()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, 10, 0, 2 * Math.PI)
    ctx.stroke()
  }, [data, hoveredItem, selectedOperator, observerLat, observerLon])

  return (
    <div className="space-y-4">
      <Card className="glass-card border-signal/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5 text-signal" />
              Mapa de Cobertura Local
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCoverage}
              disabled={loading}
              className="h-7 w-7 p-0"
              aria-label="Atualizar dados de cobertura"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <DataProvenance quality="sample" compact note="Pontos de Wi-Fi pertencem a um catálogo demonstrativo local." />
            <DataProvenance quality="synthetic" compact note="ERBs são geradas sinteticamente para demonstrar a interface." />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="w-full h-72 rounded-lg border border-border/30"
            style={{ background: '#0a0e14' }}
          />
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="font-mono-jet">{observerLat.toFixed(4)}°, {observerLon.toFixed(4)}°</span>
            <span>Raio visual: 30 km</span>
          </div>
          {data && (
            <DataProvenance
              quality="synthetic"
              source={data.source}
              updatedAt={data.timestamp}
              note={data.note}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        <Button
          variant={!selectedOperator ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedOperator(null)}
          className={`text-xs h-7 ${!selectedOperator ? 'bg-signal text-background' : ''}`}
        >
          Todas
        </Button>
        {BRAZIL_OPERATORS.map((op) => (
          <Button
            key={op.name}
            variant={selectedOperator === op.name.toLowerCase() ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedOperator(op.name.toLowerCase())}
            className="text-xs h-7"
            style={{
              backgroundColor: selectedOperator === op.name.toLowerCase() ? op.color : undefined,
              color: selectedOperator === op.name.toLowerCase() ? 'white' : undefined,
              borderColor: op.color,
            }}
          >
            <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: op.color }} />
            {op.name}
          </Button>
        ))}
      </div>

      {data?.byOperator && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {data.byOperator.map((op) => (
            <div
              key={op.name}
              className="rounded-lg p-3 border bg-secondary/30"
              style={{ borderColor: op.color + '60' }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: op.color }} />
                <span className="text-sm font-semibold">{op.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-mono-jet text-foreground">{op.towers}</span> pontos simulados
              </div>
              {op.closest && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  simulação mais próxima: <span className="font-mono-jet text-foreground">{op.closest.toFixed(2)} km</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wifi className="h-4 w-4 text-signal" />
            Wi-Fi público — catálogo demonstrativo
            <span className="ml-auto flex items-center gap-1.5">
              <DataProvenance quality="sample" compact />
              <Badge variant="secondary" className="text-[10px]">{data?.wifiTotal ?? 0}</Badge>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-60">
            <div className="space-y-1.5">
              {data?.wifiPoints.length ? (
                data.wifiPoints.map((wifi) => {
                  const Icon = wifiTypeIcons[wifi.type] || MapPin
                  return (
                    <div
                      key={wifi.id}
                      className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/30 hover:bg-secondary/50 border border-border/30 transition-colors cursor-pointer"
                      onMouseEnter={() => setHoveredItem(wifi)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-signal/20 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-signal" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{wifi.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {wifiTypeLabels[wifi.type]} · {wifi.city}/{wifi.state}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono-jet text-xs text-emerald-400">{wifi.distance.toFixed(1)} km</div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center text-muted-foreground text-sm py-8">
                  {loading ? 'Buscando...' : 'Nenhum ponto da amostra encontrado em 30 km.'}
                </div>
              )}
            </div>
          </ScrollArea>
          <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/30">
            Este bloco usa uma amostra local do projeto. Não representa um diretório nacional completo ou atualizado em tempo real.
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Radio className="h-4 w-4 text-orbit" />
            ERBs simuladas por operadora
            <span className="ml-auto flex items-center gap-1.5">
              <DataProvenance quality="synthetic" compact />
              <Badge variant="secondary" className="text-[10px]">
                {selectedOperator ? data?.towers.filter((t) => t.operator.toLowerCase() === selectedOperator).length : data?.towersTotal ?? 0}
              </Badge>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-60">
            <div className="space-y-1.5">
              {(selectedOperator
                ? data?.towers.filter((t) => t.operator.toLowerCase() === selectedOperator)
                : data?.towers
              )?.map((tower) => {
                const op = BRAZIL_OPERATORS.find((o) => o.name === tower.operator)
                return (
                  <div
                    key={tower.id}
                    className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/30 hover:bg-secondary/50 border border-border/30 transition-colors cursor-pointer"
                    onMouseEnter={() => setHoveredItem(tower)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: (op?.color || '#888') + '20' }}
                    >
                      <Signal className="h-4 w-4" style={{ color: op?.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{tower.operator}</div>
                      <div className="text-[10px] text-muted-foreground">{tower.technology} · posição sintética</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-jet text-xs text-signal">{tower.distance.toFixed(2)} km</div>
                    </div>
                  </div>
                )
              })}
              {!data?.towers.length && !loading && (
                <div className="text-center text-muted-foreground text-sm py-8">Sem pontos simulados no raio.</div>
              )}
            </div>
          </ScrollArea>
          <p className="text-[10px] text-fuchsia-300/80 mt-2 pt-2 border-t border-border/30">
            SIMULAÇÃO: estas posições não são ERBs oficiais e não devem orientar deslocamento, segurança ou decisão operacional.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
