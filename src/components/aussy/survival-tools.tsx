'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Activity,
  Battery,
  Bell,
  ChevronRight,
  Compass,
  Copy,
  Droplet,
  Flame,
  Flashlight,
  Heart,
  Home,
  Leaf,
  Lightbulb,
  Loader2,
  MapPin,
  Megaphone,
  Moon,
  Phone,
  Play,
  Plus,
  Radio,
  Save,
  Share2,
  Snowflake,
  Square,
  Star,
  Sun,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import {
  BATTERY_TIPS,
  COMMON_PLANTS,
  EMERGENCY_RADIO_CHANNELS,
  MORSE_CODE,
  SURVIVAL_RULE_OF_3,
  SURVIVAL_SKILLS,
  WATER_PER_PERSON_PER_DAY_LITERS,
  type SurvivalSkill,
} from '@/lib/data/survival'
import { useGeolocation } from '@/hooks/use-geolocation'

// ============= IndexedDB local =============
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB não suportado'))
    const req = indexedDB.open('aussy-emergency', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('emergencyCard')) {
        db.createObjectStore('emergencyCard', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const request = tx.objectStore(store).get(key)
    request.onsuccess = () => resolve(request.result as T)
    request.onerror = () => reject(request.error)
  })
}

async function idbPut(store: string, value: unknown): Promise<void> {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ============= Sol/Lua offline =============
function calcSunTimes(lat: number, lon: number, date: Date = new Date()) {
  const rad = Math.PI / 180
  const start = new Date(Date.UTC(date.getFullYear(), 0, 0))
  const diff = date.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / 86400000)
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1)

  const declination = 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma)

  const eqTime = 229.18 * (0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma))

  const zenith = 90.833
  const latRad = lat * rad
  const cosH = (Math.cos(zenith * rad) - Math.sin(latRad) * Math.sin(declination))
    / (Math.cos(latRad) * Math.cos(declination))

  if (cosH > 1 || cosH < -1) return { sunrise: null, sunset: null, solarNoon: null }

  const hourAngle = Math.acos(cosH) * 180 / Math.PI
  const sunriseMin = 720 - 4 * (lon + hourAngle) - eqTime
  const sunsetMin = 720 - 4 * (lon - hourAngle) - eqTime
  const solarNoonMin = 720 - 4 * lon - eqTime
  const baseDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))

  return {
    sunrise: new Date(baseDate.getTime() + sunriseMin * 60000),
    sunset: new Date(baseDate.getTime() + sunsetMin * 60000),
    solarNoon: new Date(baseDate.getTime() + solarNoonMin * 60000),
  }
}

function calcMoonPhase(date: Date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  let r = year % 100
  r %= 19
  if (r > 9) r -= 19
  r = ((r * 11) % 30) + month + day
  if (month < 3) r += 2
  r -= year < 2000 ? 4 : 8.3
  r = Math.floor(r + 0.5) % 30
  const phase = r < 0 ? r + 30 : r

  const phases = [
    { name: 'Nova', emoji: '🌑', illum: 0 },
    { name: 'Crescente Côncava', emoji: '🌒', illum: 12 },
    { name: 'Quarto Crescente', emoji: '🌓', illum: 50 },
    { name: 'Crescente Convexa', emoji: '🌔', illum: 75 },
    { name: 'Cheia', emoji: '🌕', illum: 100 },
    { name: 'Minguante Convexa', emoji: '🌖', illum: 75 },
    { name: 'Quarto Minguante', emoji: '🌗', illum: 50 },
    { name: 'Minguante Côncava', emoji: '🌘', illum: 12 },
  ]
  const idx = Math.floor(((phase % 29.53) / 29.53) * 8) % 8
  return { ...phases[idx], phaseDay: phase }
}

// ============= COMPONENTE PRINCIPAL =============
export function SurvivalTools() {
  const [openTool, setOpenTool] = useState<string | null>(null)

  const tools = [
    { id: 'lantern', icon: Flashlight, title: 'Lanterna + SOS', desc: 'Luz e sinal visual', color: 'amber' },
    { id: 'whistle', icon: Megaphone, title: 'Apito + Sirene', desc: 'Som para chamar atenção local', color: 'red' },
    { id: 'compass', icon: Compass, title: 'Bússola', desc: 'Direção via sensor', color: 'cyan' },
    { id: 'gps', icon: MapPin, title: 'GPS + Compartilhar', desc: 'Coordenadas, copiar, compartilhar e ligar', color: 'green' },
    { id: 'sunmoon', icon: Sun, title: 'Sol & Lua', desc: 'Cálculo com localização real', color: 'amber' },
    { id: 'morse', icon: Bell, title: 'Morse', desc: 'Texto ↔ código morse', color: 'cyan' },
    { id: 'calc', icon: Droplet, title: 'Planejamento de Kit', desc: 'Água por pessoas e dias', color: 'green' },
    { id: 'card', icon: Heart, title: 'Cartão Emergência', desc: 'Dados locais no navegador', color: 'red' },
    { id: 'guide', icon: TriangleAlert, title: 'Guia Sobrevivência', desc: 'Conteúdo offline com fontes', color: 'amber' },
    { id: 'plants', icon: Leaf, title: 'Riscos com Plantas', desc: 'Alertas — não guia de consumo', color: 'green' },
    { id: 'radio', icon: Radio, title: 'Referências de Rádio', desc: 'Escuta e referência regulada', color: 'cyan' },
    { id: 'battery', icon: Battery, title: 'Economia Bateria', desc: 'Preservar carga do celular', color: 'amber' },
  ]

  const colorClasses: Record<string, string> = {
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
    red: 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20',
    cyan: 'border-signal/40 bg-signal/10 text-signal hover:bg-signal/20',
    green: 'border-orbit/40 bg-orbit/10 text-orbit hover:bg-orbit/20',
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card border-signal/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-signal" />
            Kit de Ferramentas
            <Badge variant="outline" className="ml-auto text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">
              12 ferramentas · capacidades offline variam
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {tools.map((tool) => {
              const Icon = tool.icon
              return (
                <button
                  key={tool.id}
                  onClick={() => setOpenTool(tool.id)}
                  className={`group flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left active:scale-95 ${colorClasses[tool.color]}`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0">
                    <div className="font-bold text-sm leading-tight">{tool.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{tool.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
            Recursos locais como lanterna, cartão salvo, Morse e parte dos cálculos podem funcionar sem internet. Chamadas, compartilhamento, mapas e dados externos dependem de rede, cobertura, permissões ou serviços compatíveis.
          </p>
        </CardContent>
      </Card>

      {openTool === 'lantern' && <LanternTool onClose={() => setOpenTool(null)} />}
      {openTool === 'whistle' && <WhistleTool onClose={() => setOpenTool(null)} />}
      {openTool === 'compass' && <CompassTool onClose={() => setOpenTool(null)} />}
      {openTool === 'gps' && <GpsTool onClose={() => setOpenTool(null)} />}
      {openTool === 'sunmoon' && <SunMoonTool onClose={() => setOpenTool(null)} />}
      {openTool === 'morse' && <MorseTool onClose={() => setOpenTool(null)} />}
      {openTool === 'calc' && <KitPlanner onClose={() => setOpenTool(null)} />}
      {openTool === 'card' && <EmergencyCard onClose={() => setOpenTool(null)} />}
      {openTool === 'guide' && <SurvivalGuide onClose={() => setOpenTool(null)} />}
      {openTool === 'plants' && <PlantsGuide onClose={() => setOpenTool(null)} />}
      {openTool === 'radio' && <RadioGuide onClose={() => setOpenTool(null)} />}
      {openTool === 'battery' && <BatteryGuide onClose={() => setOpenTool(null)} />}
    </div>
  )
}

function ToolHeader({ icon: Icon, title, desc, onClose, accent = 'signal' }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  onClose: () => void
  accent?: 'signal' | 'red' | 'amber' | 'green' | 'cyan'
}) {
  const accentColor = accent === 'red'
    ? 'text-red-400'
    : accent === 'amber'
      ? 'text-amber-400'
      : accent === 'green'
        ? 'text-orbit'
        : 'text-signal'

  return (
    <div className="flex items-start justify-between mb-4 gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-10 h-10 rounded-full bg-secondary/60 flex items-center justify-center flex-shrink-0 ${accentColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-base leading-tight">{title}</h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 flex-shrink-0">
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ============= 1. LANTERNA =============
function LanternTool({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'white' | 'red' | 'sos' | 'strobe' | 'off'>('off')
  const [brightness, setBrightness] = useState(100)
  const [pulseOn, setPulseOn] = useState(true)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)

  const activateTorch = async () => {
    try {
      if (!('mediaDevices' in navigator) || !('getUserMedia' in navigator.mediaDevices)) {
        toast.error('Flash traseiro não exposto pelo navegador neste dispositivo')
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraActive(true)
      const track = stream.getVideoTracks()[0]
      const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean }
      if (caps?.torch) {
        await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] })
        setTorchEnabled(true)
      } else {
        toast.info('Câmera disponível, mas o navegador não expôs controle do flash')
      }
    } catch {
      setCameraActive(false)
      toast.error('Não foi possível acessar câmera/flash')
    }
  }

  const deactivateTorch = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraActive(false)
    setTorchEnabled(false)
  }

  useEffect(() => () => deactivateTorch(), [])

  useEffect(() => {
    if (mode !== 'sos' && mode !== 'strobe') {
      setPulseOn(true)
      return
    }

    let cancelled = false
    let timer: number | undefined
    let index = 0
    const dot = 180
    const dash = dot * 3
    const gap = dot
    const letterGap = dot * 3
    const wordGap = dot * 7
    const sos = [
      { on: true, ms: dot }, { on: false, ms: gap },
      { on: true, ms: dot }, { on: false, ms: gap },
      { on: true, ms: dot }, { on: false, ms: letterGap },
      { on: true, ms: dash }, { on: false, ms: gap },
      { on: true, ms: dash }, { on: false, ms: gap },
      { on: true, ms: dash }, { on: false, ms: letterGap },
      { on: true, ms: dot }, { on: false, ms: gap },
      { on: true, ms: dot }, { on: false, ms: gap },
      { on: true, ms: dot }, { on: false, ms: wordGap },
    ]
    const strobe = [{ on: true, ms: 120 }, { on: false, ms: 120 }]
    const pattern = mode === 'sos' ? sos : strobe

    const tick = () => {
      if (cancelled) return
      const step = pattern[index]
      setPulseOn(step.on)
      index = (index + 1) % pattern.length
      timer = window.setTimeout(tick, step.ms)
    }
    tick()

    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [mode])

  const bgClass = mode === 'off'
    ? 'bg-background'
    : mode === 'white'
      ? 'bg-white'
      : mode === 'red'
        ? 'bg-red-600'
        : pulseOn
          ? 'bg-white'
          : 'bg-black'

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Flashlight} title="Lanterna + SOS Visual" desc="Luz de tela, SOS Morse e flash traseiro quando o navegador permitir" onClose={onClose} accent="amber" />

        {mode !== 'off' && (
          <div
            className={`fixed inset-0 z-[60] ${bgClass} flex items-center justify-center transition-colors`}
            style={{ opacity: brightness / 100 }}
            onClick={() => setMode('off')}
          >
            <button className="text-black/70 text-sm bg-white/50 px-4 py-2 rounded-full backdrop-blur">
              Toque para desligar
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Brilho visual: {brightness}%</Label>
            <input
              type="range"
              min="20"
              max="100"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full mt-1 accent-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setMode(mode === 'white' ? 'off' : 'white')} className="bg-white text-black hover:bg-white/90">
              <Lightbulb className="h-4 w-4 mr-2" /> Luz branca
            </Button>
            <Button variant="outline" onClick={() => setMode(mode === 'red' ? 'off' : 'red')} className="bg-red-600 text-white hover:bg-red-700">
              <Flashlight className="h-4 w-4 mr-2" /> Luz vermelha
            </Button>
            <Button variant="outline" onClick={() => setMode(mode === 'sos' ? 'off' : 'sos')} className="bg-amber-500 text-black hover:bg-amber-600">
              <TriangleAlert className="h-4 w-4 mr-2" /> SOS Morse
            </Button>
            <Button variant="outline" onClick={() => setMode(mode === 'strobe' ? 'off' : 'strobe')} className="bg-purple-500 text-white hover:bg-purple-600">
              <Activity className="h-4 w-4 mr-2" /> Estroboscópio
            </Button>
          </div>

          <div className="p-2 rounded-md bg-red-500/10 border border-red-500/30 text-[11px] text-red-300 leading-relaxed">
            <strong>Atenção:</strong> luz estroboscópica pode desencadear sintomas em pessoas fotossensíveis. Use somente quando necessário e evite apontar diretamente para pessoas próximas.
          </div>

          {mode !== 'off' && (
            <Button variant="destructive" className="w-full" onClick={() => setMode('off')}>
              <X className="h-4 w-4 mr-2" /> Desligar luz da tela
            </Button>
          )}

          <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs">
                <div className="font-medium text-amber-300">Flash traseiro (LED)</div>
                <div className="text-[10px] text-muted-foreground">
                  {torchEnabled ? 'Flash ativo' : cameraActive ? 'Câmera ativa; torch indisponível' : 'Disponibilidade depende do navegador/aparelho'}
                </div>
              </div>
              <Button size="sm" variant={torchEnabled ? 'default' : 'outline'} onClick={torchEnabled ? deactivateTorch : activateTorch}>
                {torchEnabled ? 'Desligar' : 'Tentar ativar'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 2. SOM LOCAL =============
function WhistleTool({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<'whistle' | 'siren' | 'alarm' | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const intervalRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    intervalRef.current = null
    try { oscRef.current?.stop() } catch {}
    oscRef.current?.disconnect()
    gainRef.current?.disconnect()
    void ctxRef.current?.close()
    oscRef.current = null
    gainRef.current = null
    ctxRef.current = null
    setActive(null)
  }, [])

  const play = useCallback((type: 'whistle' | 'siren' | 'alarm') => {
    stop()
    try {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextCtor) throw new Error('AudioContext indisponível')
      const ctx = new AudioContextCtor()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      ctxRef.current = ctx
      oscRef.current = osc
      gainRef.current = gain
      gain.gain.value = 0.25

      if (type === 'whistle') {
        osc.type = 'sine'
        osc.frequency.value = 3000
      } else if (type === 'siren') {
        osc.type = 'sawtooth'
        osc.frequency.value = 700
        let direction = 1
        intervalRef.current = window.setInterval(() => {
          const next = osc.frequency.value + direction * 30
          if (next > 1200 || next < 600) direction *= -1
          osc.frequency.value = Math.max(600, Math.min(1200, next))
        }, 50)
      } else {
        osc.type = 'square'
        osc.frequency.value = 880
        let on = true
        intervalRef.current = window.setInterval(() => {
          on = !on
          gain.gain.value = on ? 0.25 : 0
        }, 300)
      }

      osc.start()
      setActive(type)
      navigator.vibrate?.([350, 150, 350, 150, 350])
    } catch {
      toast.error('Áudio não disponível neste dispositivo')
    }
  }, [stop])

  useEffect(() => () => stop(), [stop])

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Megaphone} title="Apito + Sirene" desc="Sinais sonoros locais via Web Audio; alcance não é garantido" onClose={onClose} accent="red" />
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => active === 'whistle' ? stop() : play('whistle')} className="h-20 flex-col bg-red-500 hover:bg-red-600 text-white">
              <Megaphone className="h-5 w-5 mb-1" /><span className="text-[10px]">Tom agudo</span>
            </Button>
            <Button onClick={() => active === 'siren' ? stop() : play('siren')} className="h-20 flex-col bg-amber-500 hover:bg-amber-600 text-black">
              <TriangleAlert className="h-5 w-5 mb-1" /><span className="text-[10px]">Sirene</span>
            </Button>
            <Button onClick={() => active === 'alarm' ? stop() : play('alarm')} className="h-20 flex-col bg-purple-500 hover:bg-purple-600 text-white">
              <Bell className="h-5 w-5 mb-1" /><span className="text-[10px]">Bipes</span>
            </Button>
          </div>

          {active && (
            <Button variant="destructive" className="w-full" onClick={stop}>
              <Square className="h-4 w-4 mr-2" /> Parar som
            </Button>
          )}

          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-[11px] text-red-300 leading-relaxed">
            Estes sons servem para <strong>chamar atenção de pessoas próximas</strong>. Frequência, volume, obstáculos e alto-falante mudam completamente a distância audível; o app não promete alcance nem que o padrão será reconhecido como emergência.
          </div>
          <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-relaxed">
            Proteja a audição: não aproxime o alto-falante do ouvido e reduza o volume quando houver pessoas muito próximas.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 3. BÚSSOLA =============
function CompassTool({ onClose }: { onClose: () => void }) {
  const [heading, setHeading] = useState<number | null>(null)
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied' | 'needs_permission'>('unknown')
  const handlerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null)

  const stopListening = useCallback(() => {
    if (!handlerRef.current) return
    window.removeEventListener('deviceorientation', handlerRef.current, true)
    window.removeEventListener('deviceorientationabsolute', handlerRef.current as EventListener, true)
    handlerRef.current = null
  }, [])

  const startListening = useCallback(() => {
    stopListening()
    const handler = (event: DeviceOrientationEvent) => {
      let next: number | null = null
      if ('webkitCompassHeading' in event && typeof (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading === 'number') {
        next = (event as DeviceOrientationEvent & { webkitCompassHeading: number }).webkitCompassHeading
      } else if (event.alpha !== null) {
        next = (360 - event.alpha) % 360
      }
      if (next !== null && Number.isFinite(next)) setHeading(next)
    }
    handlerRef.current = handler
    window.addEventListener('deviceorientation', handler, true)
    window.addEventListener('deviceorientationabsolute', handler as EventListener, true)
  }, [stopListening])

  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setSupported(false)
      return
    }
    const orientationCtor = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }
    if (typeof orientationCtor.requestPermission === 'function') setPermission('needs_permission')
    else {
      setPermission('granted')
      startListening()
    }
    return stopListening
  }, [startListening, stopListening])

  const requestPermission = async () => {
    try {
      const orientationCtor = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }
      if (typeof orientationCtor.requestPermission === 'function') {
        const result = await orientationCtor.requestPermission()
        setPermission(result)
        if (result === 'granted') startListening()
      } else {
        setPermission('granted')
        startListening()
      }
    } catch {
      setPermission('denied')
    }
  }

  const dir = heading === null ? null : Math.round(heading)
  const cardinal = dir === null ? '—'
    : dir < 22.5 || dir >= 337.5 ? 'N'
      : dir < 67.5 ? 'NE'
        : dir < 112.5 ? 'L'
          : dir < 157.5 ? 'SE'
            : dir < 202.5 ? 'S'
              : dir < 247.5 ? 'SO'
                : dir < 292.5 ? 'O' : 'NO'

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Compass} title="Bússola Magnética" desc="Leitura do sensor do aparelho; sujeita a calibração e interferência" onClose={onClose} accent="cyan" />

        {!supported ? (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-300">Sensor de orientação não disponível.</div>
        ) : permission === 'needs_permission' ? (
          <Button onClick={requestPermission} className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-black">
            <Compass className="h-5 w-5 mr-2" /> Ativar bússola
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="relative mx-auto w-48 h-48 rounded-full border-2 border-signal/40 bg-secondary/30">
              <div className="absolute top-1 left-1/2 -translate-x-1/2 text-signal font-bold text-sm">N</div>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-muted-foreground font-bold text-sm">S</div>
              <div className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">O</div>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">L</div>
              <div className="absolute inset-0 flex items-center justify-center transition-transform duration-150" style={{ transform: `rotate(${dir === null ? 0 : -dir}deg)` }}>
                <div className="w-1 h-32 flex flex-col items-center">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-red-500" />
                  <div className="flex-1 w-full bg-gradient-to-b from-red-500 to-signal" />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center"><div className="w-3 h-3 rounded-full bg-signal border-2 border-background" /></div>
            </div>
            <div className="text-center">
              <div className="font-mono-jet text-3xl font-bold text-signal">{dir === null ? '—' : `${dir}°`}</div>
              <div className="text-sm text-muted-foreground">Direção: <span className="text-foreground font-bold">{cardinal}</span></div>
            </div>
            {permission === 'denied' && <div className="text-xs text-amber-300">Permissão do sensor negada.</div>}
            <div className="p-2 rounded-md bg-signal/10 border border-signal/30 text-[11px] text-signal/80">
              Compare a leitura com outra referência quando a direção for importante. Capas magnéticas, estruturas metálicas e eletrônicos podem afetar o sensor.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============= 4. GPS / LOCALIZAÇÃO =============
function GpsTool({ onClose }: { onClose: () => void }) {
  const { point, detect, loading, error } = useGeolocation()
  const [watching, setWatching] = useState(false)
  const watchRef = useRef<number | null>(null)

  const stopWatch = useCallback(() => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = null
    setWatching(false)
  }, [])

  const startWatch = () => {
    if (!('geolocation' in navigator)) return
    stopWatch()
    setWatching(true)
    watchRef.current = navigator.geolocation.watchPosition(
      () => detect(true),
      (event) => toast.error(event.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
  }

  useEffect(() => stopWatch, [stopWatch])

  const emergencyText = point
    ? `EMERGENCIA - preciso de ajuda. Localizacao: ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}. Precisao aproximada: ${point.accuracy?.toFixed(0) || '?'} m. Via Aussy Ontech.`
    : ''

  const share = async () => {
    if (!point) return
    if (navigator.share) {
      try {
        await navigator.share({ text: emergencyText, title: 'Localização de Emergência' })
        return
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(emergencyText)
      toast.success('Localização copiada')
    } catch {
      toast.error('Não foi possível compartilhar/copiar')
    }
  }

  const copyEmergencyText = async () => {
    if (!point) return
    try {
      await navigator.clipboard.writeText(emergencyText)
      toast.success('Mensagem de emergência copiada')
    } catch {
      toast.error('Não foi possível copiar a mensagem')
    }
  }

  const callSamu = () => { window.location.href = 'tel:192' }

  const openMaps = () => {
    if (!point) return
    window.open(`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=18/${point.lat}/${point.lon}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={MapPin} title="GPS + Compartilhar Localização" desc="Coordenadas do dispositivo, copiar, compartilhar e ligar para emergência" onClose={onClose} accent="green" />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric label="Latitude" value={point ? `${point.lat.toFixed(5)}°` : '—'} accent="text-orbit" />
            <Metric label="Longitude" value={point ? `${point.lon.toFixed(5)}°` : '—'} accent="text-orbit" />
            <Metric label="Precisão" value={point?.accuracy ? `±${point.accuracy.toFixed(0)}m` : '—'} />
            <Metric label="Origem" value={point?.source || '—'} />
          </div>

          {point?.city && (
            <div className="p-2.5 rounded-md bg-orbit/10 border border-orbit/30 text-xs">
              <MapPin className="h-3 w-3 inline mr-1 text-orbit" />
              {point.city}{point.region ? `, ${point.region}` : ''}{point.country ? ` · ${point.country}` : ''}
            </div>
          )}
          {error && <div className="p-2 rounded-md bg-red-500/10 border border-red-500/30 text-[11px] text-red-300">{error}</div>}

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => detect(true)} disabled={loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
              {loading ? 'Detectando...' : 'Atualizar GPS'}
            </Button>
            <Button onClick={watching ? stopWatch : startWatch} variant={watching ? 'default' : 'outline'}>
              <Activity className={`h-4 w-4 mr-2 ${watching ? 'animate-pulse' : ''}`} />
              {watching ? 'Parar' : 'Rastrear'}
            </Button>
          </div>

          <Button onClick={share} disabled={!point} className="w-full bg-orbit hover:bg-orbit/90 text-black">
            <Share2 className="h-4 w-4 mr-2" /> Compartilhar localização
          </Button>
          <Button onClick={copyEmergencyText} disabled={!point} variant="outline" className="w-full">
            <Copy className="h-4 w-4 mr-2" /> Copiar mensagem de emergência
          </Button>
          <Button onClick={callSamu} className="w-full bg-red-600 hover:bg-red-700 text-white">
            <Phone className="h-4 w-4 mr-2" /> Ligar para SAMU 192
          </Button>
          <Button onClick={openMaps} disabled={!point} variant="ghost" size="sm" className="w-full text-xs">Abrir em mapa (requer rede para tiles não cacheados)</Button>

          <div className="p-3 rounded-md bg-orbit/10 border border-orbit/30 text-[11px] text-orbit/90 leading-relaxed">
            O aparelho pode obter coordenadas por GNSS sem internet, mas tempo para fix, precisão e disponibilidade variam por dispositivo, céu visível e ambiente. <strong>O Aussy não envia SMS para 192</strong>; use a ligação oficial e copie/compartilhe as coordenadas quando útil.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value, accent = 'text-foreground' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-2.5 rounded-md bg-secondary/40 border border-border/30 min-w-0">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className={`font-mono-jet font-bold text-xs break-all ${accent}`}>{value}</div>
    </div>
  )
}

// ============= 5. SOL & LUA =============
function SunMoonTool({ onClose }: { onClose: () => void }) {
  const { point, detect, loading, error } = useGeolocation()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  const sun = point ? calcSunTimes(point.lat, point.lon, now) : null
  const moon = calcMoonPhase(now)
  const fmtTime = (date: Date | null | undefined) => date
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '—'

  let daylight = '—'
  if (sun?.sunrise && sun.sunset) {
    const diff = sun.sunset.getTime() - sun.sunrise.getTime()
    daylight = `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}min`
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Sun} title="Sol e Lua — Hoje" desc="Estimativas astronômicas offline; horários solares exigem localização real" onClose={onClose} accent="amber" />
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground text-center">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} · {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>

          {!point ? (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
              <p className="text-xs text-amber-200">Nascer/pôr do sol não é calculado sem uma localização real. O app não assume Brasília ou qualquer cidade padrão.</p>
              <Button onClick={() => detect(true)} disabled={loading} variant="outline" className="w-full">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
                Usar minha localização
              </Button>
              {error && <p className="text-[11px] text-red-300">{error}</p>}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-bold text-amber-300">Sol</span>
                <Badge variant="outline" className="ml-auto text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">{daylight} de luz</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Metric label="Nascer" value={fmtTime(sun?.sunrise)} accent="text-amber-300" />
                <Metric label="Pôr" value={fmtTime(sun?.sunset)} accent="text-amber-300" />
                <Metric label="Meio-dia solar" value={fmtTime(sun?.solarNoon)} />
                <Metric label="Local" value={`${point.lat.toFixed(2)}°, ${point.lon.toFixed(2)}°`} />
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="h-5 w-5 text-indigo-300" />
              <span className="text-sm font-bold text-indigo-300">Lua — aproximação</span>
              <Badge variant="outline" className="ml-auto text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30">Dia {moon.phaseDay}/29.5</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-5xl">{moon.emoji}</div>
              <div><div className="font-bold text-indigo-200">{moon.name}</div><div className="text-[11px] text-muted-foreground">Iluminação aproximada: {moon.illum}%</div></div>
            </div>
          </div>

          <div className="p-2 rounded-md bg-signal/10 border border-signal/30 text-[11px] text-signal/80 leading-relaxed">
            Use Sol/Lua apenas como referência auxiliar. Para deslocamento ou navegação de risco, confirme direção com GPS, bússola e mapa.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 6. MORSE =============
function MorseTool({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('SOS')
  const [morse, setMorse] = useState('')
  const [playing, setPlaying] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)

  const textToMorse = (value: string) => value.toUpperCase().split('').map((char) => {
    if (char === ' ') return '/'
    return MORSE_CODE[char] || ''
  }).filter(Boolean).join(' ')

  const morseToText = (value: string) => value.split(' / ').map((word) =>
    word.split(' ').map((symbol) => {
      const entry = Object.entries(MORSE_CODE).find(([key, code]) => key.length === 1 && code === symbol)
      return entry?.[0] || '?'
    }).join('')
  ).join(' ')

  useEffect(() => setMorse(textToMorse(text)), [text])

  const stop = () => {
    void ctxRef.current?.close()
    ctxRef.current = null
    setPlaying(false)
  }

  const play = async () => {
    if (playing || !morse) return
    setPlaying(true)
    try {
      const ctx = new AudioContext()
      ctxRef.current = ctx
      const unit = 80

      for (const token of morse.split(' ')) {
        if (ctx.state === 'closed') break
        if (token === '/') {
          await new Promise((resolve) => window.setTimeout(resolve, unit * 7))
          continue
        }
        for (const symbol of token) {
          const duration = symbol === '.' ? unit : unit * 3
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = 700
          gain.gain.value = 0.25
          osc.start()
          await new Promise((resolve) => window.setTimeout(resolve, duration))
          osc.stop()
          await new Promise((resolve) => window.setTimeout(resolve, unit))
        }
        await new Promise((resolve) => window.setTimeout(resolve, unit * 2))
      }
      await ctx.close()
      ctxRef.current = null
    } catch {
      toast.error('Áudio não disponível')
    } finally {
      setPlaying(false)
    }
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Bell} title="Código Morse" desc="Conversão local de texto e reprodução sonora" onClose={onClose} accent="cyan" />
        <div className="space-y-3">
          <div><Label className="text-xs">Texto</Label><Input value={text} onChange={(e) => setText(e.target.value)} className="font-mono-jet mt-1" /></div>
          <div>
            <Label className="text-xs">Morse</Label>
            <Textarea value={morse} onChange={(e) => setMorse(e.target.value)} className="font-mono-jet mt-1 text-base" />
            <p className="text-[10px] text-muted-foreground mt-1">Leitura reversa aproximada: {morseToText(morse)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={playing ? stop : play} disabled={!morse} variant={playing ? 'destructive' : 'default'}>
              {playing ? <><Square className="h-4 w-4 mr-2" />Parar</> : <><Play className="h-4 w-4 mr-2" />Tocar</>}
            </Button>
            <Button onClick={() => { setText(''); setMorse('') }} variant="outline"><Trash2 className="h-4 w-4 mr-2" />Limpar</Button>
          </div>
          <div className="p-3 rounded-md bg-signal/10 border border-signal/30 text-[11px] leading-relaxed">
            <strong>SOS em Morse:</strong> <span className="font-mono-jet">... --- ...</span>. Um sinal visual/sonoro não garante que alguém esteja dentro do alcance; continue usando meios oficiais de comunicação quando disponíveis.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 7. PLANEJAMENTO DE KIT =============
function KitPlanner({ onClose }: { onClose: () => void }) {
  const [people, setPeople] = useState(2)
  const [days, setDays] = useState(3)
  const waterTotal = WATER_PER_PERSON_PER_DAY_LITERS * people * days

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Droplet} title="Planejamento de Kit" desc="Referência de estoque de água — não previsão de sobrevivência" onClose={onClose} accent="green" />
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground mb-1">Prioridades</div>
            <div className="grid grid-cols-4 gap-1.5">
              {SURVIVAL_RULE_OF_3.map((rule) => (
                <div key={rule.label} className="p-2 rounded-md bg-secondary/40 border border-border/30 text-center">
                  <div className="text-[9px] text-muted-foreground uppercase">{rule.label}</div>
                  <div className="text-[10px] font-bold text-signal font-mono-jet">{rule.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Pessoas: <span className="text-signal font-mono-jet">{people}</span></Label>
            <input type="range" min="1" max="20" value={people} onChange={(e) => setPeople(Number(e.target.value))} className="w-full accent-orbit" />
          </div>
          <div>
            <Label className="text-xs">Dias de planejamento: <span className="text-signal font-mono-jet">{days}</span></Label>
            <input type="range" min="1" max="30" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-orbit" />
          </div>

          <div className="p-4 rounded-lg bg-orbit/10 border border-orbit/30 text-center">
            <Droplet className="h-5 w-5 text-orbit mx-auto mb-1" />
            <div className="text-[10px] text-muted-foreground uppercase">Água para o kit</div>
            <div className="text-3xl font-bold text-orbit font-mono-jet">{waterTotal.toFixed(0)} L</div>
            <div className="text-[10px] text-muted-foreground">Base: {WATER_PER_PERSON_PER_DAY_LITERS} L/pessoa/dia · Defesa Civil PR</div>
          </div>

          <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
            <strong>Planejamento, não necessidade clínica:</strong> calor, atividade, idade, saúde e condições locais alteram a necessidade de líquidos. Siga orientações da Defesa Civil e autoridades de saúde da sua região. O app não calcula calorias, “tempo sem água” nem prazo para chegada de ajuda.
          </div>
          <a href="https://www.defesacivil.pr.gov.br/Pagina/Kit-de-Emergencia-pessoal" target="_blank" rel="noopener noreferrer" className="block text-center text-[11px] text-signal hover:underline">Abrir referência oficial da Defesa Civil PR</a>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 8. CARTÃO LOCAL =============
interface EmergencyCardData {
  id: string
  name: string
  bloodType: string
  allergies: string
  medications: string
  conditions: string
  emergencyContact: string
  emergencyPhone: string
  organDonor: boolean
  updatedAt: string
}

function EmergencyCard({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<EmergencyCardData>({
    id: 'main',
    name: '',
    bloodType: '',
    allergies: '',
    medications: '',
    conditions: '',
    emergencyContact: '',
    emergencyPhone: '',
    organDonor: false,
    updatedAt: '',
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    idbGet<EmergencyCardData>('emergencyCard', 'main')
      .then((saved) => { if (saved) setData(saved) })
      .finally(() => setLoaded(true))
  }, [])

  const save = async () => {
    try {
      const next = { ...data, updatedAt: new Date().toISOString() }
      await idbPut('emergencyCard', next)
      setData(next)
      toast.success('Cartão salvo localmente neste navegador')
    } catch {
      toast.error('Não foi possível salvar no armazenamento local')
    }
  }

  const field = (label: string, key: keyof EmergencyCardData, placeholder?: string, type = 'text') => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={String(data[key] ?? '')}
        onChange={(e) => setData((current) => ({ ...current, [key]: e.target.value }))}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  )

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Heart} title="Cartão de Emergência" desc="Anotação local no IndexedDB deste navegador" onClose={onClose} accent="red" />
        <div className="space-y-3">
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-[11px] text-red-300 leading-relaxed">
            <TriangleAlert className="h-3 w-3 inline mr-1" />
            <strong>Não é ficha médica nativa do sistema.</strong> Este cartão não aparece automaticamente na tela bloqueada e não substitui Medical ID/Ficha Médica do iOS/Android. Ele só pode ser visto se alguém conseguir abrir este app/navegador no dispositivo.
          </div>

          {field('Nome completo', 'name', 'Nome')}
          {field('Tipo sanguíneo informado', 'bloodType', 'Ex.: O+')}
          {field('Alergias conhecidas', 'allergies', 'Ex.: penicilina')}
          {field('Medicamentos em uso', 'medications', 'Liste nome/dose conforme sua prescrição')}
          {field('Condições médicas importantes', 'conditions', 'Ex.: diabetes, epilepsia')}
          {field('Contato de emergência', 'emergencyContact', 'Nome do contato')}
          {field('Telefone de emergência', 'emergencyPhone', '(00) 00000-0000', 'tel')}

          <label className="flex items-start gap-2 p-2.5 rounded-md bg-secondary/30 border border-border/30 cursor-pointer text-xs">
            <input type="checkbox" checked={data.organDonor} onChange={(e) => setData((current) => ({ ...current, organDonor: e.target.checked }))} className="accent-red-500 mt-0.5" />
            <span>Preferência pessoal sobre doação de órgãos <span className="text-muted-foreground">(apenas anotação local; não equivale a registro/documento oficial)</span></span>
          </label>

          <Button onClick={save} disabled={!loaded} className="w-full bg-red-500 hover:bg-red-600 text-white">
            <Save className="h-4 w-4 mr-2" /> Salvar neste navegador
          </Button>

          {data.updatedAt && <div className="text-[10px] text-muted-foreground text-center">Última atualização local: {new Date(data.updatedAt).toLocaleString('pt-BR')}</div>}

          <div className="p-2 rounded-md bg-orbit/10 border border-orbit/30 text-[11px] text-orbit/80 leading-relaxed">
            <strong>Privacidade:</strong> este componente grava os campos em IndexedDB no navegador. Limpar dados do site/navegador pode apagar o cartão. Para acesso pela tela bloqueada, configure também o recurso nativo de emergência do sistema operacional.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 9. GUIA DE SOBREVIVÊNCIA =============
function SurvivalGuide({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<SurvivalSkill | null>(null)
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    droplet: Droplet,
    flame: Flame,
    home: Home,
    alert: TriangleAlert,
    sun: Sun,
    star: Star,
    leaf: Leaf,
    snow: Snowflake,
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={TriangleAlert} title="Guia de Sobrevivência" desc="Conteúdo local, conservador e com fonte quando a orientação é sensível" onClose={onClose} accent="amber" />
        <div className="space-y-2">
          {SURVIVAL_SKILLS.map((skill) => {
            const Icon = iconMap[skill.icon] || TriangleAlert
            return (
              <button key={skill.id} onClick={() => setSelected(skill)} className="flex items-center gap-3 p-2.5 w-full rounded-md bg-secondary/30 hover:bg-secondary/50 border border-border/30 transition-colors text-left">
                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${skill.severity === 'critico' ? 'bg-red-500/20 text-red-400' : skill.severity === 'urgente' ? 'bg-amber-500/20 text-amber-400' : 'bg-signal/20 text-signal'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium">{skill.title}</div><div className="text-[10px] text-muted-foreground">{skill.duration}</div></div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )
          })}
        </div>

        {selected && (
          <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="max-w-md mx-auto mt-4">
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-2"><X className="h-4 w-4 mr-1" /> Voltar</Button>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {(() => { const Icon = iconMap[selected.icon] || TriangleAlert; return <Icon className="h-5 w-5 text-signal" /> })()}
                    {selected.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <ol className="space-y-2">
                      {selected.steps.map((step, index) => (
                        <li key={index} className="flex gap-2 text-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-signal/20 text-signal flex items-center justify-center text-[10px] font-bold">{index + 1}</span>
                          <span className="leading-relaxed pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>

                    {selected.warnings?.length ? (
                      <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3">
                        <div className="text-xs uppercase tracking-wider text-red-400 mb-1.5 flex items-center gap-1.5"><TriangleAlert className="h-3.5 w-3.5" /> Atenção</div>
                        <ul className="space-y-1 text-xs text-foreground/80">
                          {selected.warnings.map((warning, index) => <li key={index} className="flex gap-1.5"><span className="text-red-400">•</span><span>{warning}</span></li>)}
                        </ul>
                      </div>
                    ) : null}

                    {(selected.verifiedAt || selected.sourceLabel) && (
                      <div className="rounded-md bg-secondary/30 border border-border/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
                        <div><strong className="text-foreground">Fonte:</strong> {selected.sourceLabel || 'referência local'}</div>
                        {selected.verifiedAt && <div><strong className="text-foreground">Verificado:</strong> {selected.verifiedAt}</div>}
                        {selected.sourceUrls?.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block text-signal hover:underline break-all mt-1">Abrir fonte oficial</a>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============= 10. RISCOS COM PLANTAS =============
function PlantsGuide({ onClose }: { onClose: () => void }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Leaf} title="Riscos com Plantas" desc="Referência de perigo; não identifica planta para consumo ou uso medicinal" onClose={onClose} accent="green" />
        <div className="space-y-3">
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-[11px] text-red-300 leading-relaxed">
            <TriangleAlert className="h-3 w-3 inline mr-1" />
            O Aussy <strong>não classifica planta silvestre como segura para comer ou usar como medicamento</strong>. Identificação por foto, nome popular ou descrição curta pode estar errada.
          </div>

          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {COMMON_PLANTS.map((plant) => (
              <div key={plant.scientific} className="p-3 rounded-md border bg-red-500/5 border-red-500/30">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="text-sm font-bold">{plant.name}</div><div className="text-[10px] italic text-muted-foreground">{plant.scientific}</div></div>
                  <Badge variant="outline" className="text-[9px] uppercase bg-red-500/20 text-red-400 border-red-500/40">risco</Badge>
                </div>
                <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">{plant.description}</p>
                {plant.warning && <div className="mt-2 p-2 rounded bg-red-500/10 text-[11px] text-red-300"><TriangleAlert className="h-3 w-3 inline mr-1" />{plant.warning}</div>}
              </div>
            ))}
          </div>

          <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-relaxed">
            Em suspeita de intoxicação ou sintomas após ingestão/exposição, procure orientação profissional e serviço de saúde. Não provoque vômito nem administre receita caseira por conta própria.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 11. RÁDIO =============
function RadioGuide({ onClose }: { onClose: () => void }) {
  const label = {
    livre: 'recepção / referência',
    restrita: 'uso restrito',
    profissional: 'transmissão regulada',
  } as const

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Radio} title="Referências de Rádio" desc="Escuta e frequências de referência — Brasil" onClose={onClose} accent="cyan" />
        <div className="space-y-3">
          <div className="p-2 rounded-md bg-signal/10 border border-signal/30 text-[11px] text-signal/80 leading-relaxed">
            Um rádio receptor AM/FM a pilha pode ajudar a acompanhar informação local quando a internet falhar. Frequência de socorro não é sinônimo de autorização geral para transmitir.
          </div>

          <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
            {EMERGENCY_RADIO_CHANNELS.map((channel) => (
              <div key={channel.freq + channel.name} className="p-2.5 rounded-md bg-secondary/30 border border-border/30">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div><div className="font-mono-jet font-bold text-sm text-signal">{channel.freq}</div><div className="text-[11px] text-foreground/80">{channel.name} · <span className="text-muted-foreground">{channel.band}</span></div></div>
                  <Badge variant="outline" className="text-[9px] uppercase">{label[channel.license]}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{channel.use}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{channel.range}</p>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-relaxed">
            <strong>Canal 16 marítimo (156,800 MHz)</strong> é reconhecido pela Anatel como frequência de socorro e segurança por radiotelefonia. O app não concede licença nem autorização de transmissão: use equipamento/serviço aplicável e siga a autoridade competente. Para emergência em terra no Brasil, priorize 190/192/193/199 quando a rede telefônica estiver disponível.
          </div>
          <a href="https://informacoes.anatel.gov.br/legislacao/component/content/article/165-atos-de-requisitos-tecnicos-de-gestao-do-espectro/2024/1918-ato-883" target="_blank" rel="noopener noreferrer" className="block text-center text-[11px] text-signal hover:underline">Abrir referência Anatel</a>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 12. BATERIA =============
function BatteryGuide({ onClose }: { onClose: () => void }) {
  const [level, setLevel] = useState<number | null>(null)
  const [charging, setCharging] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return
    let unsubscribe: (() => void) | undefined
    ;(navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (type: string, handler: () => void) => void; removeEventListener: (type: string, handler: () => void) => void }> }).getBattery?.().then((battery) => {
      const update = () => {
        setLevel(Math.round(battery.level * 100))
        setCharging(battery.charging)
      }
      update()
      battery.addEventListener('levelchange', update)
      battery.addEventListener('chargingchange', update)
      unsubscribe = () => {
        battery.removeEventListener('levelchange', update)
        battery.removeEventListener('chargingchange', update)
      }
    }).catch(() => undefined)
    return () => unsubscribe?.()
  }, [])

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Battery} title="Economia de Bateria" desc="Preserve energia para comunicação e informação essencial" onClose={onClose} accent="amber" />
        <div className="space-y-3">
          {level !== null ? (
            <div className="p-3 rounded-lg border bg-secondary/30 border-border/30">
              <div className="flex items-center justify-between">
                <div><div className="text-[10px] text-muted-foreground uppercase">Bateria atual</div><div className="text-3xl font-bold font-mono-jet">{level}%</div></div>
                {charging && <Badge variant="outline" className="bg-orbit/20 text-orbit border-orbit/40"><Plus className="h-3 w-3 mr-1" /> Carregando</Badge>}
              </div>
              <div className="mt-2 h-2 bg-secondary/60 rounded-full overflow-hidden"><div className="h-full bg-orbit transition-all" style={{ width: `${level}%` }} /></div>
            </div>
          ) : (
            <div className="p-2 rounded-md bg-secondary/30 border border-border/30 text-xs text-muted-foreground">Battery API não disponível neste navegador.</div>
          )}

          <div className="space-y-1.5">
            {BATTERY_TIPS.map((tip) => (
              <div key={tip.title} className="p-2.5 rounded-md bg-secondary/30 border border-border/30">
                <div className="text-sm font-medium text-amber-300">{tip.title}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-[11px] text-red-300 leading-relaxed">
            Preserve carga para localização, alertas e comunicação. Recarregue somente com fonte, cabo e ambiente seguros e compatíveis com o dispositivo.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
