'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  CircleDot,
} from 'lucide-react'
import { BRAZIL_OPERATORS } from '@/lib/data/coverage'

interface CoverageData {
  observer: { lat: number; lon: number; radius: number }
  timestamp: string
  source: string
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredItem, setHoveredItem] = useState<any | null>(null)

  const fetchCoverage = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/coverage/towers?lat=${observerLat}&lon=${observerLon}&radius=30`,
        { cache: 'no-store' }
      )
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
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

    // Fundo espacial
    ctx.fillStyle = '#0a0e14'
    ctx.fillRect(0, 0, w, h)

    // Grid de fundo
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

    // Círculos concêntricos ao redor do observador (range)
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

      // Label de distância
      ctx.fillStyle = 'rgba(107, 114, 128, 0.5)'
      ctx.font = '9px monospace'
      ctx.fillText(`${(7.5 * i).toFixed(1)}km`, cx + r + 2, cy - 2)
    }

    // Linhas cardinais
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)'
    ctx.beginPath()
    ctx.moveTo(cx, 5); ctx.lineTo(cx, h - 5)
    ctx.moveTo(5, cy); ctx.lineTo(w - 5, cy)
    ctx.stroke()

    // Rosa dos ventos
    ctx.fillStyle = 'rgba(34, 211, 238, 0.5)'
    ctx.font = 'bold 10px monospace'
    ctx.fillText('N', cx - 3, 14)
    ctx.fillText('S', cx - 3, h - 6)
    ctx.fillText('W', 4, cy + 3)
    ctx.fillText('E', w - 12, cy + 3)

    // Função para converter lat/lon → x/y (projeção equiretangular simples)
    const range = 0.15 // ~15km em graus
    const project = (lat: number, lon: number) => {
      const x = cx + ((lon - observerLon) / range) * (maxRadius)
      const y = cy - ((lat - observerLat) / range) * (maxRadius)
      return { x, y }
    }

    // Torres de celular
    data.towers.forEach((tower) => {
      if (selectedOperator && tower.operator.toLowerCase() !== selectedOperator) return
      const { x, y } = project(tower.lat, tower.lon)
      if (x < 0 || x > w || y < 0 || y > h) return

      const op = BRAZIL_OPERATORS.find((o) => o.name === tower.operator)
      const color = op?.color || '#888'

      // Triângulo (torre)
      ctx.fillStyle = color + 'CC'
      ctx.beginPath()
      ctx.moveTo(x, y - 5)
      ctx.lineTo(x - 4, y + 4)
      ctx.lineTo(x + 4, y + 4)
      ctx.closePath()
      ctx.fill()

      // Anel de sinal
      ctx.strokeStyle = color + '40'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, 2 * Math.PI)
      ctx.stroke()

      // Hover marker
      if (hoveredItem === tower) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, 2 * Math.PI)
        ctx.stroke()
      }
    })

    // WiFi pontos
    data.wifiPoints.forEach((wifi) => {
      const { x, y } = project(wifi.lat, wifi.lng)
      if (x < 0 || x > w || y < 0 || y > h) return

      ctx.fillStyle = '#22d3ee'
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()

      // Anel
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.stroke()
    })

    // Observador (você)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, 2 * Math.PI)
    ctx.fill()

    // Pulso do observador
    const time = Date.now() / 1000
    const pulse = (time % 2) / 2
    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - pulse})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, 4 + pulse * 15, 0, 2 * Math.PI)
    ctx.stroke()
  }, [data, hoveredItem, selectedOperator, observerLat, observerLon])

  // Re-render contínuo para o pulso
  useEffect(() => {
    if (!data) return
    let id: number
    const animate = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const event = new Event('refresh-canvas')
        canvas.dispatchEvent(event)
      }
      id = requestAnimationFrame(animate)
    }
    // Simples: re-render a cada 100ms
    const interval = setInterval(() => {
      const canvas = canvasRef.current
      if (canvas) {
        // Trigger redraw
        const ctx = canvas.getContext('2d')
        if (ctx) {
          // só redesenha o pulso do observador
        }
      }
    }, 100)
    return () => clearInterval(interval)
  }, [data])

  return (
    <div className="space-y-4">
      {/* Mapa canvas */}
      <Card className="glass-card border-signal/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
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
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <canvas
            ref={canvasRef}
            className="w-full h-72 rounded-lg border border-border/30"
            style={{ background: '#0a0e14' }}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono-jet">{observerLat.toFixed(4)}°, {observerLon.toFixed(4)}°</span>
            <span>Raio: 30 km · Fonte: {data?.source || '...'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Filtro por operadora */}
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

      {/* Estatísticas por operadora */}
      {data?.byOperator && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {data.byOperator.map((op) => (
            <div
              key={op.name}
              className="rounded-lg p-3 border bg-secondary/30"
              style={{ borderColor: op.color + '60' }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: op.color }}
                />
                <span className="text-sm font-semibold">{op.name}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-mono-jet text-foreground">{op.towers}</span> torres próximas
              </div>
              {op.closest && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  mais próxima: <span className="font-mono-jet text-foreground">{op.closest.toFixed(2)} km</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lista WiFi públicos */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wifi className="h-4 w-4 text-signal" />
            WiFi Públicos Próximos
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {data?.wifiTotal ?? 0}
            </Badge>
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
                        <div className="font-mono-jet text-xs text-emerald-400">
                          {wifi.distance.toFixed(1)} km
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center text-muted-foreground text-sm py-8">
                  {loading ? 'Buscando...' : 'Nenhum ponto WiFi público encontrado em 30km.'}
                </div>
              )}
            </div>
          </ScrollArea>
          <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/30">
            Fonte: {data?.source}. Para cobertura nacional completa (87 mil pontos), consulte o programa WiFi Grátis Brasil no gov.br.
          </p>
        </CardContent>
      </Card>

      {/* Lista de torres */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Radio className="h-4 w-4 text-orbit" />
            Torres de Celular Próximas
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {selectedOperator ? data?.towers.filter(t => t.operator.toLowerCase() === selectedOperator).length : data?.towersTotal ?? 0}
            </Badge>
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
                      <div className="text-[10px] text-muted-foreground">
                        {tower.technology} · ERB estimada
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-jet text-xs text-signal">
                        {tower.distance.toFixed(2)} km
                      </div>
                    </div>
                  </div>
                )
              })}
              {!data?.towers.length && !loading && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Sem torres no raio. Aumente o raio ou mova o observador.
                </div>
              )}
            </div>
          </ScrollArea>
          <p className="text-[10px] text-amber-400/70 mt-2 pt-2 border-t border-border/30">
            ⚠️ Posições estimadas para protótipo. Para dados oficiais completos (200k+ torres), baixe a base ERB-Web da ANATEL.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
