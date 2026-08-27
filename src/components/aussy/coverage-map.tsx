'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DataProvenance } from '@/components/aussy/data-provenance'
import { MapPin, Wifi, Radio, RefreshCw, Building2, School, BookOpen, Cross } from 'lucide-react'

interface WifiPoint { id: string; name: string; type: string; city: string; state: string; lat: number; lng: number; distance: number; fee?: string | null }
interface CoverageData {
  observer: { lat: number; lon: number; radius: number } | null
  timestamp: string
  source: string
  dataQuality: { towers: 'unavailable'; wifiPoints: 'live-crowdsourced' | 'unavailable' }
  wifiPoints: WifiPoint[]; wifiTotal: number; towers: []; towersTotal: 0
  byOperator: Array<{ name: string; color: string; towers: 0; closest: null; estimated: false; dataQuality: 'unavailable' }>
  note: string
}

const wifiTypeIcons: Record<string, typeof MapPin> = { praca: MapPin, escola: School, biblioteca: BookOpen, ubs: Cross, equipamento_publico: Building2 }
const wifiTypeLabels: Record<string, string> = { praca: 'Praça/parque', escola: 'Educação', biblioteca: 'Biblioteca', ubs: 'Saúde', equipamento_publico: 'Ponto mapeado' }

export function CoverageMap({ observerLat, observerLon }: { observerLat: number; observerLon: number }) {
  const [data, setData] = useState<CoverageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hasValidObserver = Number.isFinite(observerLat) && Number.isFinite(observerLon) && observerLat >= -90 && observerLat <= 90 && observerLon >= -180 && observerLon <= 180

  const fetchCoverage = async () => {
    if (!hasValidObserver) { setData(null); setError('Localização válida é necessária para consultar a cobertura local.'); return }
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ lat: observerLat.toString(), lon: observerLon.toString(), radius: '30' })
      const res = await fetch(`/api/coverage/towers?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Fonte de Wi-Fi indisponível (${res.status})`)
      setData(await res.json())
    } catch (e) { setData(null); setError(e instanceof Error ? e.message : 'Falha ao carregar dados de cobertura') }
    finally { setLoading(false) }
  }

  useEffect(() => { void fetchCoverage() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [observerLat, observerLon])

  useEffect(() => {
    if (!data?.observer || !canvasRef.current) return
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1; const width = canvas.clientWidth; const height = canvas.clientHeight
    canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#0a0e14'; ctx.fillRect(0, 0, width, height); ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)'; ctx.lineWidth = 1
    for (let x = 0; x < width; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke() }
    for (let y = 0; y < height; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }
    const cx = width / 2; const cy = height / 2; const maxRadius = Math.max(20, Math.min(width, height) / 2 - 20)
    const latRange = data.observer.radius / 111; const lonScale = Math.max(0.2, Math.cos((data.observer.lat * Math.PI) / 180)); const lonRange = data.observer.radius / (111 * lonScale)
    const project = (lat: number, lon: number) => ({ x: cx + ((lon - data.observer!.lon) / lonRange) * maxRadius, y: cy - ((lat - data.observer!.lat) / latRange) * maxRadius })
    for (let i = 1; i <= 4; i += 1) { const r = (maxRadius / 4) * i; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.strokeStyle = `rgba(16, 185, 129, ${0.2 - i * 0.04})`; ctx.stroke(); ctx.fillStyle = 'rgba(107, 114, 128, 0.55)'; ctx.font = '9px monospace'; ctx.fillText(`${((data.observer.radius / 4) * i).toFixed(1)}km`, cx + r + 2, cy - 2) }
    for (const wifi of data.wifiPoints) { const { x, y } = project(wifi.lat, wifi.lng); if (x < 0 || x > width || y < 0 || y > height) continue; ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.fill() }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fill()
  }, [data])

  return <div className="space-y-4">
    <Card className="glass-card border-signal/30"><CardHeader className="pb-3"><div className="flex items-center justify-between gap-2"><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-5 w-5 text-signal" />Cobertura local</CardTitle><Button variant="ghost" size="sm" onClick={fetchCoverage} disabled={loading || !hasValidObserver} className="h-7 w-7 p-0" aria-label="Atualizar dados de cobertura"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></Button></div><div className="flex flex-wrap gap-1.5 pt-1"><DataProvenance quality="live" compact note="Wi-Fi consultado ao vivo no OpenStreetMap/Overpass; disponibilidade física não é garantida." /><DataProvenance quality="unavailable" compact note="ERBs oficiais ainda não estão integradas nesta build." /></div></CardHeader>
      <CardContent className="space-y-3">{error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}. O Aussy não exibe amostra fictícia como substituição.</div>}<canvas ref={canvasRef} className="h-72 w-full rounded-lg border border-border/30" style={{ background: '#0a0e14' }} /><div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="font-mono-jet">{hasValidObserver ? `${observerLat.toFixed(4)}°, ${observerLon.toFixed(4)}°` : 'Localização indisponível'}</span><span>Raio: 30 km</span></div>{data && <DataProvenance quality="live" source={data.source} updatedAt={data.timestamp} note="Registros geográficos reais e colaborativos. Um ponto mapeado pode estar fora de serviço, exigir autenticação ou não ser gratuito; o Aussy não promete conectividade sem confirmação do local." />}</CardContent>
    </Card>
    <Card className="glass-card"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Wifi className="h-4 w-4 text-signal" />Wi-Fi público mapeado<span className="ml-auto flex items-center gap-1.5"><DataProvenance quality="live" compact /><Badge variant="secondary" className="text-[10px]">{data?.wifiTotal ?? 0}</Badge></span></CardTitle></CardHeader><CardContent><ScrollArea className="h-60"><div className="space-y-1.5">{data?.wifiPoints.length ? data.wifiPoints.map((wifi) => { const Icon = wifiTypeIcons[wifi.type] || MapPin; return <div key={wifi.id} className="flex items-center gap-3 rounded-md border border-border/30 bg-secondary/30 p-2.5"><div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-signal/20"><Icon className="h-4 w-4 text-signal" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{wifi.name}</div><div className="text-[10px] text-muted-foreground">{wifiTypeLabels[wifi.type] || 'Ponto mapeado'}{wifi.city !== '—' ? ` · ${wifi.city}${wifi.state !== '—' ? `/${wifi.state}` : ''}` : ''}</div></div><div className="font-mono-jet text-xs text-emerald-400">{wifi.distance.toFixed(1)} km</div></div> }) : <div className="py-8 text-center text-sm text-muted-foreground">{loading ? 'Consultando OpenStreetMap...' : 'Nenhum ponto de Wi-Fi mapeado encontrado em 30 km.'}</div>}</div></ScrollArea><p className="mt-2 border-t border-border/30 pt-2 text-[10px] text-muted-foreground">Fonte colaborativa OpenStreetMap. “Mapeado” não significa necessariamente ativo ou gratuito agora; confirme no local antes de depender da conexão.</p></CardContent></Card>
    <Card className="glass-card border-orange-500/20"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Radio className="h-4 w-4 text-orbit" />Antenas / ERBs<span className="ml-auto"><DataProvenance quality="unavailable" compact /></span></CardTitle></CardHeader><CardContent className="space-y-2 text-xs text-muted-foreground"><p>Nenhuma posição de antena é inferida ou fabricada. O Aussy não exibe posições estimadas ou simuladas de ERBs.</p><p>Enquanto não houver integração oficial verificável, essa camada permanece indisponível. Para localização oficial, consulte a base ERB-Web da ANATEL.</p></CardContent></Card>
  </div>
}