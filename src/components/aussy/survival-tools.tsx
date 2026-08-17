'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Flashlight,
  Megaphone,
  Compass,
  MapPin,
  Sun,
  Moon,
  Radio,
  TriangleAlert,
  Heart,
  Droplet,
  Flame,
  Home,
  Star,
  Leaf,
  Battery,
  Save,
  Share2,
  Send,
  Activity,
  ChevronRight,
  Loader2,
  X,
  Snowflake,
  Utensils,
  Wind,
  Bell,
  Square,
  Play,
  Square as Stop,
  Lightbulb,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  EMERGENCY_RADIO_CHANNELS,
  MORSE_CODE,
  SURVIVAL_SKILLS,
  COMMON_PLANTS,
  BATTERY_TIPS,
  SURVIVAL_RULE_OF_3,
  WATER_PER_PERSON_PER_DAY_LITERS,
  type SurvivalSkill,
} from '@/lib/data/survival'
import { useGeolocation } from '@/hooks/use-geolocation'

// ============= Utilitário: IndexedDB simples (sem libs) =============
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB não suportado'))
    const req = indexedDB.open('aussy-emergency', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('emergencyCard')) db.createObjectStore('emergencyCard', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const r = tx.objectStore(store).get(key)
    r.onsuccess = () => resolve(r.result as T)
    r.onerror = () => reject(r.error)
  })
}

async function idbPut(store: string, value: any): Promise<void> {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ============= Utilitário: sunrise/sunset/moon phase (offline) =============
// NOAA Solar Position Algorithm — versão simplificada corrigida
function calcSunTimes(lat: number, lon: number, date: Date = new Date()) {
  const rad = Math.PI / 180

  // Dia do ano (1-365)
  const start = new Date(Date.UTC(date.getFullYear(), 0, 0))
  const diff = date.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / 86400000)

  // Fração do ano (gamma) — Spencer 1971
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1)

  // Declinação solar (rad) — Spencer 1971
  const declination = 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma)

  // Equação do tempo (minutos) — corrige órbita elíptica + obliquidade
  const eqTime = 229.18 * (0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma))

  // Ângulo horário para nascer/pôr do sol (graus)
  const zenith = 90.833 // ângulo oficial nascer/pôr
  const latRad = lat * rad
  const cosH = (Math.cos(zenith * rad) - Math.sin(latRad) * Math.sin(declination))
    / (Math.cos(latRad) * Math.cos(declination))

  if (cosH > 1 || cosH < -1) {
    // Noite polar ou sol da meia-noite
    return { sunrise: null, sunset: null, solarNoon: null }
  }

  const H = Math.acos(cosH) * 180 / Math.PI // graus

  // Minutos desde meia-noite UTC
  const sunriseMin = 720 - 4 * (lon + H) - eqTime
  const sunsetMin = 720 - 4 * (lon - H) - eqTime
  const solarNoonMin = 720 - 4 * lon - eqTime

  // Converte para Date (UTC)
  const baseDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const sunrise = new Date(baseDate.getTime() + sunriseMin * 60000)
  const sunset = new Date(baseDate.getTime() + sunsetMin * 60000)
  const solarNoon = new Date(baseDate.getTime() + solarNoonMin * 60000)

  return { sunrise, sunset, solarNoon }
}

function calcMoonPhase(date: Date = new Date()) {
  // Moon phase algorithm (John Walker)
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

  // 0 = new moon, 15 = full moon
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
    { id: 'lantern', icon: Flashlight, title: 'Lanterna + SOS', desc: 'Tela branca + morse SOS', color: 'amber' },
    { id: 'whistle', icon: Megaphone, title: 'Apito + Sirene', desc: 'Som de emergência', color: 'red' },
    { id: 'compass', icon: Compass, title: 'Bússola', desc: 'Direção magnética', color: 'cyan' },
    { id: 'gps', icon: MapPin, title: 'GPS + Compartilhar', desc: 'Coords + SMS + Share', color: 'green' },
    { id: 'sunmoon', icon: Sun, title: 'Sol & Lua', desc: 'Nascer/pôr do sol + fase lunar', color: 'amber' },
    { id: 'morse', icon: Bell, title: 'Morse', desc: 'Texto ↔ código morse', color: 'cyan' },
    { id: 'calc', icon: Droplet, title: 'Calculadora Sobrev.', desc: 'Água e comida por dias', color: 'green' },
    { id: 'card', icon: Heart, title: 'Cartão Emergência', desc: 'Dados médicos salvos no celular', color: 'red' },
    { id: 'guide', icon: TriangleAlert, title: 'Guia Sobrevivência', desc: 'Água, fogo, abrigo, sinalização', color: 'amber' },
    { id: 'plants', icon: Leaf, title: 'Plantas BR', desc: 'Comestíveis e tóxicas', color: 'green' },
    { id: 'radio', icon: Radio, title: 'Rádios Emergência', desc: 'Frequências VHF/UHF/CB', color: 'cyan' },
    { id: 'battery', icon: Battery, title: 'Economia Bateria', desc: 'Como estender carga do celular', color: 'amber' },
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
            Kit de Ferramentas Offline
            <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              12 ferramentas · 100% offline
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
        </CardContent>
      </Card>

      {/* Renderiza a ferramenta aberta */}
      {openTool === 'lantern' && <LanternTool onClose={() => setOpenTool(null)} />}
      {openTool === 'whistle' && <WhistleTool onClose={() => setOpenTool(null)} />}
      {openTool === 'compass' && <CompassTool onClose={() => setOpenTool(null)} />}
      {openTool === 'gps' && <GpsTool onClose={() => setOpenTool(null)} />}
      {openTool === 'sunmoon' && <SunMoonTool onClose={() => setOpenTool(null)} />}
      {openTool === 'morse' && <MorseTool onClose={() => setOpenTool(null)} />}
      {openTool === 'calc' && <SurvivalCalculator onClose={() => setOpenTool(null)} />}
      {openTool === 'card' && <EmergencyCard onClose={() => setOpenTool(null)} />}
      {openTool === 'guide' && <SurvivalGuide onClose={() => setOpenTool(null)} />}
      {openTool === 'plants' && <PlantsGuide onClose={() => setOpenTool(null)} />}
      {openTool === 'radio' && <RadioGuide onClose={() => setOpenTool(null)} />}
      {openTool === 'battery' && <BatteryGuide onClose={() => setOpenTool(null)} />}
    </div>
  )
}

// ============= MODAL HEADER compartilhado =============
function ToolHeader({ icon: Icon, title, desc, onClose, accent = 'signal' }: {
  icon: any
  title: string
  desc: string
  onClose: () => void
  accent?: string
}) {
  const accentColor = accent === 'red' ? 'text-red-400' : accent === 'amber' ? 'text-amber-400' : accent === 'green' ? 'text-orbit' : 'text-signal'
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className={`w-10 h-10 rounded-full bg-secondary/60 flex items-center justify-center ${accentColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-base leading-tight">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ============= 1. LANTERNA =============
function LanternTool({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'white' | 'red' | 'sos' | 'strobe' | 'off'>('off')
  const [brightness, setBrightness] = useState(100)
  const flashRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)

  // Aplica torch API quando habilitado (chamado do onClick do botão "Ativar Flash")
  const activateTorch = async () => {
    try {
      if (!('mediaDevices' in navigator) || !('getUserMedia' in navigator.mediaDevices)) return
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      setCameraActive(true)
      const track = stream.getVideoTracks()[0]
      const caps = track.getCapabilities?.() as any
      if (caps?.torch) {
        await track.applyConstraints({ advanced: [{ torch: true } as any] })
        setTorchEnabled(true)
      }
    } catch (e) {
      // Sem acesso à câmera/torch — usa só a tela
      setCameraActive(false)
    }
  }

  const deactivateTorch = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    setTorchEnabled(false)
  }

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // SOS morse pattern: ... --- ...
  useEffect(() => {
    if (mode !== 'sos' && mode !== 'strobe') return
    let isOn = true
    let step = 0
    const sosPattern = [200, 200, 200, 200, 200, 200, 600, 600, 600, 600, 600, 600, 200, 200, 200, 200, 200, 200, 1000]
    const strobePattern = [100, 100]

    const tick = () => {
      isOn = !isOn
      step++
    }

    const pattern = mode === 'sos' ? sosPattern : strobePattern
    let i = 0
    const interval = setInterval(() => {
      tick()
      i = (i + 1) % pattern.length
    }, pattern[i] || 200)

    flashRef.current = interval
    return () => clearInterval(interval)
  }, [mode])

  const bgClass = mode === 'off'
    ? 'bg-background'
    : mode === 'white'
    ? 'bg-white'
    : mode === 'red'
    ? 'bg-red-600'
    : mode === 'sos' || mode === 'strobe'
    ? ((Date.now() / 200) % 2 < 1 ? 'bg-white' : 'bg-black')
    : 'bg-background'

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Flashlight} title="Lanterna + SOS Visual" desc="Tela virou lanterna · SOS em morse via flash" onClose={onClose} accent="amber" />

        {/* Tela de luz — overlay */}
        {mode !== 'off' && (
          <div
            className={`fixed inset-0 z-[60] ${bgClass} flex items-center justify-center transition-colors`}
            style={{ opacity: brightness / 100 }}
            onClick={() => setMode('off')}
          >
            <button className="text-black/50 text-sm bg-black/20 px-4 py-2 rounded-full backdrop-blur">
              Toque para desligar
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Brilho da tela: {brightness}%</Label>
            <input
              type="range"
              min="20"
              max="100"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full mt-1 accent-amber-400"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Aumente o brilho no celular para máximo efeito.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === 'white' ? 'default' : 'outline'}
              onClick={() => setMode(mode === 'white' ? 'off' : 'white')}
              className="bg-white text-black hover:bg-white/90"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Luz Branca
            </Button>
            <Button
              variant={mode === 'red' ? 'default' : 'outline'}
              onClick={() => setMode(mode === 'red' ? 'off' : 'red')}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <Flashlight className="h-4 w-4 mr-2" />
              Luz Vermelha (não atrapalha visão noturna)
            </Button>
            <Button
              variant={mode === 'sos' ? 'default' : 'outline'}
              onClick={() => setMode(mode === 'sos' ? 'off' : 'sos')}
              className="bg-amber-500 text-black hover:bg-amber-600"
            >
              <TriangleAlert className="h-4 w-4 mr-2" />
              SOS Morse (piscar)
            </Button>
            <Button
              variant={mode === 'strobe' ? 'default' : 'outline'}
              onClick={() => setMode(mode === 'strobe' ? 'off' : 'strobe')}
              className="bg-purple-500 text-white hover:bg-purple-600"
            >
              <Activity className="h-4 w-4 mr-2" />
              Estroboscópio
            </Button>
          </div>

          {mode !== 'off' && (
            <Button variant="destructive" className="w-full" onClick={() => setMode('off')}>
              <X className="h-4 w-4 mr-2" />
              Desligar
            </Button>
          )}

          {/* Ativar flash traseiro (iOS exige gesto explícito) */}
          <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs">
                <div className="font-medium text-amber-300">Flash traseiro (LED)</div>
                <div className="text-[10px] text-muted-foreground">
                  {torchEnabled ? '✓ Flash ativo' : cameraActive ? 'Câmera ativa, sem torch' : 'Toque para ativar'}
                </div>
              </div>
              <Button
                size="sm"
                variant={torchEnabled ? 'default' : 'outline'}
                onClick={torchEnabled ? deactivateTorch : activateTorch}
                aria-label={torchEnabled ? 'Desativar flash' : 'Ativar flash traseiro'}
                className="h-10 min-w-[80px]"
              >
                {torchEnabled ? 'Desligar' : 'Ativar Flash'}
              </Button>
            </div>
          </div>

          <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-relaxed">
            <strong>Dica:</strong> Em celular com flash traseiro (LED), use o botão acima para ativar a torcha via API WebRTC. Autorize o acesso à câmera quando perguntado. iOS exige gesto explícito no botão.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 2. APITO / SIRENE =============
function WhistleTool({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<'whistle' | 'siren' | 'alarm' | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<any>(null)
  const gainRef = useRef<any>(null)
  const intervalRef = useRef<any>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (oscRef.current) {
      try { oscRef.current.stop() } catch {}
      oscRef.current.disconnect()
      oscRef.current = null
    }
    if (gainRef.current) {
      gainRef.current.disconnect()
      gainRef.current = null
    }
    if (ctxRef.current) {
      ctxRef.current.close()
      ctxRef.current = null
    }
    setActive(null)
  }, [])

  const play = useCallback((type: 'whistle' | 'siren' | 'alarm') => {
    stop()
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      ctxRef.current = ctx
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      oscRef.current = osc
      gainRef.current = gain

      gain.gain.value = 0.4

      if (type === 'whistle') {
        // Apito agudo contínuo — 3000Hz
        osc.type = 'sine'
        osc.frequency.value = 3000
      } else if (type === 'siren') {
        // Sirene ondulante 600-1200Hz
        osc.type = 'sawtooth'
        let dir = 1
        intervalRef.current = setInterval(() => {
          let f = osc.frequency.value
          f += dir * 30
          if (f > 1200 || f < 600) dir *= -1
          osc.frequency.value = f
        }, 50)
      } else if (type === 'alarm') {
        // Alarme intermitente 880Hz — bip bip bip
        osc.type = 'square'
        osc.frequency.value = 880
        let on = true
        intervalRef.current = setInterval(() => {
          on = !on
          gain.gain.value = on ? 0.4 : 0
        }, 300)
      }

      osc.start()
      setActive(type)
      // Vibração se suportado
      if ('vibrate' in navigator) {
        navigator.vibrate(type === 'whistle' ? 10000 : [500, 100, 500, 100, 500])
      }
    } catch (e) {
      toast.error('Áudio não disponível neste dispositivo')
    }
  }, [stop])

  useEffect(() => () => stop(), [stop])

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Megaphone} title="Apito + Sirene" desc="Som de emergência via Web Audio API" onClose={onClose} accent="red" />

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={active === 'whistle' ? 'default' : 'outline'}
              onClick={() => active === 'whistle' ? stop() : play('whistle')}
              className="h-20 flex-col bg-red-500 hover:bg-red-600 text-white"
            >
              <Megaphone className="h-5 w-5 mb-1" />
              <span className="text-[10px]">Apito 3000Hz</span>
            </Button>
            <Button
              variant={active === 'siren' ? 'default' : 'outline'}
              onClick={() => active === 'siren' ? stop() : play('siren')}
              className="h-20 flex-col bg-amber-500 hover:bg-amber-600 text-black"
            >
              <TriangleAlert className="h-5 w-5 mb-1" />
              <span className="text-[10px]">Sirene 600-1200Hz</span>
            </Button>
            <Button
              variant={active === 'alarm' ? 'default' : 'outline'}
              onClick={() => active === 'alarm' ? stop() : play('alarm')}
              className="h-20 flex-col bg-purple-500 hover:bg-purple-600 text-white"
            >
              <Bell className="h-5 w-5 mb-1" />
              <span className="text-[10px]">Alarme bip-bip</span>
            </Button>
          </div>

          {active && (
            <Button variant="destructive" className="w-full" onClick={stop}>
              <Square className="h-4 w-4 mr-2" />
              Parar som
            </Button>
          )}

          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-[11px] text-red-300 leading-relaxed">
            <strong>Como usar:</strong>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li><strong>Apito 3000Hz:</strong> alta frequência alcança mais longe. Use para chamar atenção de pessoas próximas.</li>
              <li><strong>Sirene:</strong> padrão reconhecido de emergência. Use para resgate em áreas remotas.</li>
              <li><strong>Alarme bip-bip:</strong> mais audível entre ruídos urbanos.</li>
            </ul>
          </div>

          <div className="p-3 rounded-md bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300/80 leading-relaxed">
            <TriangleAlert className="h-3 w-3 inline mr-1" />
            Aumente o volume do celular ao máximo. Conecte a caixa de som Bluetooth se disponível.
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
  const handlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null)

  // Verifica suporte no mount, NÃO pede permissão automaticamente
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('DeviceOrientation' in window)) {
      setSupported(false)
      return
    }
    // iOS 13+ requer requestPermission (gesture)
    const anyDOE = DeviceOrientationEvent as any
    if (typeof anyDOE.requestPermission === 'function') {
      setPermission('needs_permission')
    } else {
      // Android: não precisa de permissão explícita
      startListening()
      setPermission('granted')
    }

    return () => stopListening()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startListening = () => {
    const handler = (event: DeviceOrientationEvent) => {
      let h: number | null = null
      // iOS 13+ usa webkitCompassHeading (graus)
      if ('webkitCompassHeading' in event) {
        h = (event as any).webkitCompassHeading
      } else if (event.alpha !== null) {
        // Android: alpha em radianos (0-360)
        h = 360 - (event.alpha || 0)
      }
      if (h !== null) setHeading(h)
    }
    handlerRef.current = handler
    window.addEventListener('deviceorientation', handler, true)
    window.addEventListener('deviceorientationabsolute', handler as any, true)
    window.addEventListener('compassneedscalibration', handler as any, true)
  }

  const stopListening = () => {
    if (handlerRef.current) {
      window.removeEventListener('deviceorientation', handlerRef.current, true)
      window.removeEventListener('deviceorientationabsolute', handlerRef.current as any, true)
      window.removeEventListener('compassneedscalibration', handlerRef.current as any, true)
      handlerRef.current = null
    }
  }

  // DEVE ser chamado de um gesture do usuário (onClick do botão)
  const requestPermission = async () => {
    try {
      const anyDOE = DeviceOrientationEvent as any
      if (typeof anyDOE.requestPermission === 'function') {
        const result = await anyDOE.requestPermission()
        setPermission(result)
        if (result === 'granted') {
          startListening()
        }
      } else {
        startListening()
        setPermission('granted')
      }
    } catch (e) {
      setPermission('denied')
    }
  }

  const dir = heading !== null ? Math.round(heading) : null
  const cardinal = dir === null ? '—' :
    dir < 22.5 || dir >= 337.5 ? 'N' :
    dir < 67.5 ? 'NE' :
    dir < 112.5 ? 'L' :
    dir < 157.5 ? 'SE' :
    dir < 202.5 ? 'S' :
    dir < 247.5 ? 'SO' :
    dir < 292.5 ? 'O' : 'NO'

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Compass} title="Bússola Magnética" desc="Direção via sensor do celular" onClose={onClose} accent="cyan" />

        {!supported ? (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            Sensor de orientação não disponível neste dispositivo.
          </div>
        ) : permission === 'needs_permission' ? (
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-300 leading-relaxed">
              <strong>iOS exige permissão explícita.</strong> Toque no botão abaixo para ativar a bússola. Funciona 100% offline após ativação.
            </div>
            <Button
              onClick={requestPermission}
              className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-black"
              aria-label="Ativar bússola"
            >
              <Compass className="h-5 w-5 mr-2" />
              Ativar Bússola
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bússola visual */}
            <div className="relative mx-auto w-48 h-48 rounded-full border-2 border-signal/40 bg-secondary/30">
              {/* Marca do topo (Norte) */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 text-signal font-bold text-sm">N</div>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-muted-foreground font-bold text-sm">S</div>
              <div className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">O</div>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">L</div>

              {/* Agulha */}
              <div
                className="absolute inset-0 flex items-center justify-center transition-transform duration-150"
                style={{ transform: `rotate(${dir !== null ? -dir : 0}deg)` }}
              >
                <div className="w-1 h-32 flex flex-col items-center">
                  <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-red-500" />
                  <div className="flex-1 w-full bg-gradient-to-b from-red-500 to-signal" />
                </div>
              </div>

              {/* Centro */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-signal border-2 border-background" />
              </div>
            </div>

            {/* Leitura numérica */}
            <div className="text-center">
              <div className="font-mono-jet text-3xl font-bold text-signal">
                {dir !== null ? `${dir}°` : '—'}
              </div>
              <div className="text-sm text-muted-foreground">
                Direção: <span className="text-foreground font-bold">{cardinal}</span>
              </div>
            </div>

            {permission === 'denied' && (
              <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                Permissão negada. Recarregue a página e autorize o sensor.
              </div>
            )}

            <div className="p-2 rounded-md bg-signal/10 border border-signal/30 text-[11px] text-signal/80 leading-relaxed">
              <strong>Calibração:</strong> Se a leitura estiver instável, faça movimento em forma de "8" com o celular no ar.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============= 4. GPS + COMPARTILHAR =============
function GpsTool({ onClose }: { onClose: () => void }) {
  const { point, detect, loading, error } = useGeolocation()
  const [watching, setWatching] = useState(false)
  const watchRef = useRef<number | null>(null)

  const startWatch = () => {
    if (!('geolocation' in navigator)) return
    setWatching(true)
    watchRef.current = navigator.geolocation.watchPosition(
      () => detect(true),
      (e) => toast.error(e.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
  }
  const stopWatch = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setWatching(false)
  }

  useEffect(() => () => stopWatch(), [])

  const share = async () => {
    if (!point) return
    const text = `EMERGENCIA - minha localizacao: ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)} (precisao ${point.accuracy?.toFixed(0) || '?'}m) - via Aussy Ontech`
    if (navigator.share) {
      try {
        await navigator.share({ text, title: 'Localização de Emergência' })
        return
      } catch {}
    }
    // Fallback: copia para clipboard
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Localização copiada para área de transferência')
    } catch {
      toast.error('Não foi possível compartilhar')
    }
  }

  const sendSms = () => {
    if (!point) return
    const msg = `EMERGENCIA - preciso de ajuda. Localizacao: ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}. Via Aussy Ontech.`
    const url = `sms:192?body=${encodeURIComponent(msg)}`
    window.location.href = url
  }

  const openMaps = () => {
    if (!point) return
    window.open(`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=18/${point.lat}/${point.lon}`, '_blank')
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={MapPin} title="GPS + Compartilhar Localização" desc="Coordenadas precisas + SMS + Share API" onClose={onClose} accent="green" />

        <div className="space-y-3">
          {/* Status */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-md bg-secondary/40 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase">Latitude</div>
              <div className="font-mono-jet font-bold text-orbit">{point ? point.lat.toFixed(5) + '°' : '—'}</div>
            </div>
            <div className="p-2.5 rounded-md bg-secondary/40 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase">Longitude</div>
              <div className="font-mono-jet font-bold text-orbit">{point ? point.lon.toFixed(5) + '°' : '—'}</div>
            </div>
            <div className="p-2.5 rounded-md bg-secondary/40 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase">Precisão</div>
              <div className="font-mono-jet font-bold">{point?.accuracy ? `±${point.accuracy.toFixed(0)}m` : '—'}</div>
            </div>
            <div className="p-2.5 rounded-md bg-secondary/40 border border-border/30">
              <div className="text-[10px] text-muted-foreground uppercase">Origem</div>
              <div className="font-mono-jet font-bold uppercase text-[11px]">{point?.source || '—'}</div>
            </div>
          </div>

          {point?.city && (
            <div className="p-2.5 rounded-md bg-orbit/10 border border-orbit/30 text-xs">
              <MapPin className="h-3 w-3 inline mr-1 text-orbit" />
              {point.city}{point.region ? `, ${point.region}` : ''}{point.country ? ` · ${point.country}` : ''}
            </div>
          )}

          {error && (
            <div className="p-2 rounded-md bg-red-500/10 border border-red-500/30 text-[11px] text-red-300">
              {error}
            </div>
          )}

          {/* Ações */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => detect(true)} disabled={loading} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
              {loading ? 'Detectando...' : 'Atualizar GPS'}
            </Button>
            <Button onClick={watching ? stopWatch : startWatch} variant={watching ? 'default' : 'outline'}>
              <Activity className={`h-4 w-4 mr-2 ${watching ? 'animate-pulse' : ''}`} />
              {watching ? 'Rastreando...' : 'Rastrear'}
            </Button>
          </div>

          <Button onClick={share} disabled={!point} className="w-full bg-orbit hover:bg-orbit/90 text-black">
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar localização
          </Button>
          <Button onClick={sendSms} disabled={!point} variant="outline" className="w-full border-red-500/40 text-red-300 hover:bg-red-500/10">
            <Send className="h-4 w-4 mr-2" />
            Enviar SMS de emergência para 192
          </Button>
          <Button onClick={openMaps} disabled={!point} variant="ghost" size="sm" className="w-full text-xs">
            Abrir em mapa (online)
          </Button>

          <div className="p-3 rounded-md bg-orbit/10 border border-orbit/30 text-[11px] text-orbit/90 leading-relaxed">
            <strong>Importante:</strong> GPS funciona OFFLINE (satélites GPS são independentes da operadora). Mesmo sem sinal celular, você verá suas coordenadas. Para enviar, use SMS (precisa de sinal mínimo) ou compartilhe com alguém pessoalmente.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 5. SOL & LUA =============
function SunMoonTool({ onClose }: { onClose: () => void }) {
  const { point } = useGeolocation()
  const [now, setNow] = useState(new Date())
  const lat = point?.lat ?? -15.7801
  const lon = point?.lon ?? -47.9292

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const sun = calcSunTimes(lat, lon, now)
  const moon = calcMoonPhase(now)

  const fmtTime = (d: Date | null) => d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'

  // Daylight duration
  let daylight = '—'
  if (sun.sunrise && sun.sunset) {
    const diff = sun.sunset.getTime() - sun.sunrise.getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    daylight = `${h}h ${m}min`
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Sun} title="Sol e Lua — Hoje" desc="Calculado offline com fórmulas astronômicas" onClose={onClose} accent="amber" />

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground text-center">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} · {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* Sol */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="h-5 w-5 text-amber-400" />
              <span className="text-sm font-bold text-amber-300">Sol</span>
              <Badge variant="outline" className="ml-auto text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30">
                {daylight} de luz
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Nascer</div>
                <div className="font-mono-jet font-bold text-amber-300 text-base">{fmtTime(sun.sunrise)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Pôr</div>
                <div className="font-mono-jet font-bold text-amber-300 text-base">{fmtTime(sun.sunset)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Meio-dia solar</div>
                <div className="font-mono-jet text-amber-300/80">{fmtTime(sun.solarNoon)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase">Local</div>
                <div className="font-mono-jet text-amber-300/80 text-[11px]">{lat.toFixed(2)}°, {lon.toFixed(2)}°</div>
              </div>
            </div>
          </div>

          {/* Lua */}
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="h-5 w-5 text-indigo-300" />
              <span className="text-sm font-bold text-indigo-300">Lua</span>
              <Badge variant="outline" className="ml-auto text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                Dia {moon.phaseDay}/29.5
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-5xl">{moon.emoji}</div>
              <div className="flex-1">
                <div className="font-bold text-base text-indigo-200">{moon.name}</div>
                <div className="text-[11px] text-muted-foreground">Iluminação: {moon.illum}%</div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-md bg-signal/10 border border-signal/30 text-[11px] text-signal/80 leading-relaxed">
            <strong>Navegação:</strong> Sol nasce a Leste e se põe a Oeste. Lua Cheia fica oposta ao Sol — nasce ao pôr do sol. Use a Lua Cheia para se orientar à noite.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// helper pra evitar typo
// (removed — use onClose directly)

// ============= 6. MORSE =============
function MorseTool({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('SOS')
  const [morse, setMorse] = useState('')
  const [playing, setPlaying] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)

  const textToMorse = (t: string): string => {
    return t.toUpperCase().split('').map((ch) => {
      if (ch === ' ') return ' / '
      return MORSE_CODE[ch] || ''
    }).filter(Boolean).join(' ')
  }

  const morseToText = (m: string): string => {
    return m.split(' / ').map((word) =>
      word.split(' ').map((sym) => {
        const entry = Object.entries(MORSE_CODE).find(([, v]) => v === sym)
        return entry ? entry[0] : '?'
      }).join('')
    ).join(' ')
  }

  useEffect(() => {
    setMorse(textToMorse(text))
  }, [text])

  const play = async () => {
    if (playing || !morse) return
    setPlaying(true)
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      ctxRef.current = ctx
      const unit = 80 // ms — ponto
      const dash = unit * 3
      const betweenSym = unit
      const betweenLetter = unit * 3
      const betweenWord = unit * 7

      for (const word of morse.split(' / ')) {
        for (let i = 0; i < word.split(' ').length; i++) {
          const sym = word.split(' ')[i]
          for (let j = 0; j < sym.length; j++) {
            const c = sym[j]
            const dur = c === '.' ? unit : dash
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 700
            gain.gain.value = 0.4
            osc.start()
            await new Promise((r) => setTimeout(r, dur))
            osc.stop()
            await new Promise((r) => setTimeout(r, unit))
          }
          if (i < word.split(' ').length - 1) {
            await new Promise((r) => setTimeout(r, betweenLetter - unit * 2))
          }
        }
        await new Promise((r) => setTimeout(r, betweenWord - betweenLetter))
      }
      ctx.close()
    } catch (e) {
      toast.error('Áudio não disponível')
    }
    setPlaying(false)
  }

  const stop = () => {
    ctxRef.current?.close()
    setPlaying(false)
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Bell} title="Código Morse" desc="Texto ↔ morse com áudio e visual" onClose={onClose} accent="cyan" />

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Texto</Label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite texto (ex: SOS, AJUDA, EMERGENCIA)"
              className="font-mono-jet mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Morse</Label>
            <Textarea
              value={morse}
              onChange={(e) => setMorse(e.target.value)}
              placeholder=". --. .." className="font-mono-jet mt-1 text-base"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Tradução reversa: {morseToText(morse)}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={playing ? stop : play} disabled={!morse} variant={playing ? 'destructive' : 'default'}>
              {playing ? <><Square className="h-4 w-4 mr-2" />Parar</> : <><Play className="h-4 w-4 mr-2" />Tocar morse</>}
            </Button>
            <Button
              onClick={() => {
                setText('')
                setMorse('')
              }}
              variant="outline"
            >
              <Trash2 className="h-4 w-4 mr-2" />Limpar
            </Button>
          </div>

          <div className="p-3 rounded-md bg-signal/10 border border-signal/30 text-[11px] leading-relaxed">
            <div className="text-signal font-semibold mb-1">Sinais de emergência:</div>
            <div className="grid grid-cols-2 gap-1 font-mono-jet text-xs">
              <span><strong>SOS</strong> = ...---...</span>
              <span><strong>AJUDA</strong> = .- .--- ..- -.. -{`.-`}</span>
            </div>
            <p className="mt-2 text-muted-foreground">
              Regra 3: três de qualquer coisa (luz/som/fumaça) = SOS internacional.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 7. CALCULADORA DE SOBREVIVÊNCIA =============
function SurvivalCalculator({ onClose }: { onClose: () => void }) {
  const [people, setPeople] = useState(2)
  const [days, setDays] = useState(3)
  const [hotClimate, setHotClimate] = useState(false)
  const [walking, setWalking] = useState(false)

  // Água: 3L base + 1L se calor + 0.5L se caminhando, por pessoa/dia
  const waterPerDay = WATER_PER_PERSON_PER_DAY_LITERS + (hotClimate ? 1 : 0) + (walking ? 0.5 : 0)
  const waterTotal = waterPerDay * people * days
  // Calorias: 2000 kcal/pessoa/dia (mantenção)
  const calories = 2000 * people * days
  // Refeições: 3/dia
  const meals = 3 * people * days

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Droplet} title="Calculadora de Sobrevivência" desc="Água, comida e duração" onClose={onClose} accent="green" />

        <div className="space-y-3">
          {/* Regra do 3 */}
          <div className="grid grid-cols-4 gap-1.5">
            {SURVIVAL_RULE_OF_3.map((rule) => (
              <div key={rule.label} className="p-2 rounded-md bg-secondary/40 border border-border/30 text-center">
                <div className="text-[9px] text-muted-foreground uppercase">{rule.label}</div>
                <div className="text-xs font-bold text-signal font-mono-jet">{rule.time}</div>
              </div>
            ))}
          </div>

          {/* Inputs */}
          <div>
            <Label className="text-xs">Pessoas: <span className="text-signal font-mono-jet">{people}</span></Label>
            <input type="range" min="1" max="20" value={people} onChange={(e) => setPeople(Number(e.target.value))} className="w-full accent-orbit" />
          </div>
          <div>
            <Label className="text-xs">Dias: <span className="text-signal font-mono-jet">{days}</span></Label>
            <input type="range" min="1" max="30" value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full accent-orbit" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/30 cursor-pointer text-xs">
              <input type="checkbox" checked={hotClimate} onChange={(e) => setHotClimate(e.target.checked)} className="accent-orbit" />
              Clima quente
            </label>
            <label className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/30 cursor-pointer text-xs">
              <input type="checkbox" checked={walking} onChange={(e) => setWalking(e.target.checked)} className="accent-orbit" />
              Caminhando
            </label>
          </div>

          {/* Resultados */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-orbit/10 border border-orbit/30">
              <Droplet className="h-5 w-5 text-orbit mb-1" />
              <div className="text-[10px] text-muted-foreground uppercase">Água total</div>
              <div className="text-2xl font-bold text-orbit font-mono-jet">{waterTotal.toFixed(0)}L</div>
              <div className="text-[10px] text-muted-foreground">{waterPerDay}L/pessoa/dia</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Utensils className="h-5 w-5 text-amber-400 mb-1" />
              <div className="text-[10px] text-muted-foreground uppercase">Calorias</div>
              <div className="text-2xl font-bold text-amber-400 font-mono-jet">{(calories / 1000).toFixed(0)}k</div>
              <div className="text-[10px] text-muted-foreground">{meals} refeições</div>
            </div>
          </div>

          <div className="p-3 rounded-md bg-signal/10 border border-signal/30 text-[11px] text-signal/80 leading-relaxed">
            <strong>Recomendação Defesa Civil:</strong> Estoque <strong>3 dias</strong> de água e comida para cada pessoa da casa. Em desastres, ajuda pode demorar até 72h para chegar.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 8. CARTÃO DE EMERGÊNCIA (IndexedDB) =============
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
    name: '', bloodType: '', allergies: '', medications: '', conditions: '',
    emergencyContact: '', emergencyPhone: '', organDonor: false, updatedAt: '',
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    idbGet<EmergencyCardData>('emergencyCard', 'main')
      .then((d) => { if (d) setData(d); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  const save = async () => {
    const toSave = { ...data, updatedAt: new Date().toISOString() }
    await idbPut('emergencyCard', toSave)
    setData(toSave)
    toast.success('Cartão salvo no celular (offline)')
  }

  const field = (label: string, key: keyof EmergencyCardData, placeholder?: string, type: string = 'text') => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={data[key] as string}
        onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))}
        placeholder={placeholder}
        className="mt-1"
      />
    </div>
  )

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Heart} title="Cartão de Emergência" desc="Dados médicos salvos no celular (IndexedDB)" onClose={onClose} accent="red" />

        <div className="space-y-3">
          <div className="p-2 rounded-md bg-red-500/10 border border-red-500/30 text-[11px] text-red-300 leading-relaxed">
            <TriangleAlert className="h-3 w-3 inline mr-1" />
            Preencha isto ANTES de precisar. Socorristas podem acessar seu celular mesmo com tela bloqueada se habilitado.
          </div>

          {field('Nome completo', 'name', 'João da Silva')}
          {field('Tipo sanguíneo', 'bloodType', 'O+, A-, B+, AB+, etc')}
          {field('Alergias', 'allergies', 'Penicilina, amendoim, etc')}
          {field('Medicamentos em uso', 'medications', 'Losartana 50mg, metformina...')}
          {field('Condições médicas', 'conditions', 'Diabético, hipertenso, epilético...')}
          {field('Contato de emergência', 'emergencyContact', 'Nome do contato')}
          {field('Telefone de emergência', 'emergencyPhone', '(11) 99999-9999', 'tel')}

          <label className="flex items-center gap-2 p-2.5 rounded-md bg-secondary/30 border border-border/30 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={data.organDonor}
              onChange={(e) => setData((d) => ({ ...d, organDonor: e.target.checked }))}
              className="accent-red-500"
            />
            Doador de órgãos
          </label>

          <Button onClick={save} className="w-full bg-red-500 hover:bg-red-600 text-white">
            <Save className="h-4 w-4 mr-2" />
            Salvar no celular
          </Button>

          {data.updatedAt && (
            <div className="text-[10px] text-muted-foreground text-center">
              Última atualização: {new Date(data.updatedAt).toLocaleString('pt-BR')}
            </div>
          )}

          <div className="p-2 rounded-md bg-orbit/10 border border-orbit/30 text-[11px] text-orbit/80 leading-relaxed">
            <strong>Privacidade:</strong> Dados ficam apenas no seu celular (IndexedDB). Não enviamos para nenhum servidor. Funciona 100% offline após salvar.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 9. GUIA DE SOBREVIVÊNCIA =============
function SurvivalGuide({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<SurvivalSkill | null>(null)

  const iconMap: Record<string, any> = {
    droplet: Droplet, flame: Flame, home: Home, alert: TriangleAlert, sun: Sun, star: Star, leaf: Leaf, snow: Snowflake,
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={TriangleAlert} title="Guia de Sobrevivência" desc="Água, fogo, abrigo, sinalização, navegação" onClose={onClose} accent="amber" />

        <div className="space-y-2">
          {SURVIVAL_SKILLS.map((skill) => {
            const Icon = iconMap[skill.icon] || TriangleAlert
            return (
              <button
                key={skill.id}
                onClick={() => setSelected(skill)}
                className="flex items-center gap-3 p-2.5 w-full rounded-md bg-secondary/30 hover:bg-secondary/50 border border-border/30 transition-colors text-left"
              >
                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                  skill.severity === 'critico' ? 'bg-red-500/20 text-red-400' :
                  skill.severity === 'urgente' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-signal/20 text-signal'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{skill.title}</div>
                  <div className="text-[10px] text-muted-foreground">{skill.duration}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )
          })}
        </div>

        {/* Modal com detalhes */}
        {selected && (
          <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="max-w-md mx-auto mt-4">
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-2">
                <X className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const Icon = iconMap[selected.icon] || TriangleAlert
                      return <Icon className="h-5 w-5 text-signal" />
                    })()}
                    {selected.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <ol className="space-y-2">
                      {selected.steps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-signal/20 text-signal flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>

                    {selected.warnings && selected.warnings.length > 0 && (
                      <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3">
                        <div className="text-xs uppercase tracking-wider text-red-400 mb-1.5 flex items-center gap-1.5">
                          <TriangleAlert className="h-3.5 w-3.5" /> Atenção
                        </div>
                        <ul className="space-y-1 text-xs text-foreground/80">
                          {selected.warnings.map((w, i) => (
                            <li key={i} className="flex gap-1.5">
                              <span className="text-red-400">•</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
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

// ============= 10. PLANTAS =============
function PlantsGuide({ onClose }: { onClose: () => void }) {
  const [filter, setFilter] = useState<'all' | 'comestivel' | 'toxica' | 'medicinal'>('all')

  const filtered = filter === 'all' ? COMMON_PLANTS : COMMON_PLANTS.filter((p) => p.type === filter)

  const typeColor = {
    comestivel: 'bg-orbit/20 text-orbit border-orbit/40',
    toxica: 'bg-red-500/20 text-red-400 border-red-500/40',
    medicinal: 'bg-signal/20 text-signal border-signal/40',
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Leaf} title="Plantas do Brasil" desc="Comestíveis, tóxicas e medicinais" onClose={onClose} accent="green" />

        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'comestivel', 'toxica', 'medicinal'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  filter === t ? 'bg-signal/20 text-signal border-signal/50' : 'bg-secondary/30 text-muted-foreground border-border/30'
                }`}
              >
                {t === 'all' ? 'Todas' : t === 'comestivel' ? 'Comestíveis' : t === 'toxica' ? 'Tóxicas' : 'Medicinais'}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map((plant) => (
              <div
                key={plant.scientific}
                className={`p-3 rounded-md border bg-secondary/30 ${typeColor[plant.type]}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold">{plant.name}</div>
                    <div className="text-[10px] italic text-muted-foreground">{plant.scientific}</div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] uppercase ${typeColor[plant.type]}`}>
                    {plant.type}
                  </Badge>
                </div>
                <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed">{plant.description}</p>
                {plant.warning && (
                  <div className="mt-2 p-2 rounded bg-red-500/10 text-[11px] text-red-300">
                    <TriangleAlert className="h-3 w-3 inline mr-1" />
                    {plant.warning}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-relaxed">
            <TriangleAlert className="h-3 w-3 inline mr-1" />
            Esta lista é apenas para referência. Nunca consuma uma planta sem 100% de certeza da identificação. Em caso de ingestão acidental, ligue 192.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 11. RÁDIOS =============
function RadioGuide({ onClose }: { onClose: () => void }) {
  const licenseColor = {
    'livre': 'bg-orbit/20 text-orbit border-orbit/40',
    'restrita': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    'profissional': 'bg-red-500/20 text-red-400 border-red-500/40',
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Radio} title="Frequências de Rádio de Emergência" desc="VHF, UHF, CB, AM/FM — Brasil" onClose={onClose} accent="cyan" />

        <div className="space-y-3">
          <div className="p-2 rounded-md bg-signal/10 border border-signal/30 text-[11px] text-signal/80 leading-relaxed">
            Em desastre, rádios amadores e CB (cidadão) são os primeiros a voltar. FM/AM comerciais transmitem alertas da Defesa Civil. Tenha um rádio a pilha no kit.
          </div>

          <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
            {EMERGENCY_RADIO_CHANNELS.map((ch) => (
              <div key={ch.freq + ch.name} className="p-2.5 rounded-md bg-secondary/30 border border-border/30">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <div className="font-mono-jet font-bold text-sm text-signal">{ch.freq}</div>
                    <div className="text-[11px] text-foreground/80">{ch.name} · <span className="text-muted-foreground">{ch.band}</span></div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] uppercase ${licenseColor[ch.license]}`}>
                    {ch.license}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{ch.use}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">Alcance: {ch.range}</p>
              </div>
            ))}
          </div>

          <div className="p-2 rounded-md bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300/80 leading-relaxed">
            <strong>Em emergência:</strong> Mesmo sem licença, qualquer pessoa pode transmitir "MAYDAY" no Canal 16 VHF (156.800 MHz) ou Canal 9 CB (27.065 MHz). A lei internacional permite isso.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============= 12. ECONOMIA DE BATERIA =============
function BatteryGuide({ onClose }: { onClose: () => void }) {
  const [level, setLevel] = useState<number | null>(null)
  const [charging, setCharging] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return
    let battery: any
    let unsub: (() => void) | undefined

    (navigator as any).getBattery?.().then((b: any) => {
      battery = b
      setLevel(Math.round(b.level * 100))
      setCharging(b.charging)
      const update = () => { setLevel(Math.round(b.level * 100)); setCharging(b.charging) }
      b.addEventListener('levelchange', update)
      b.addEventListener('chargingchange', update)
      unsub = () => {
        b.removeEventListener('levelchange', update)
        b.removeEventListener('chargingchange', update)
      }
    })

    return () => { unsub?.() }
  }, [])

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <ToolHeader icon={Battery} title="Economia de Bateria" desc="Estenda a carga do celular em emergência" onClose={onClose} accent="amber" />

        <div className="space-y-3">
          {/* Status atual */}
          {level !== null && (
            <div className={`p-3 rounded-lg border ${
              charging ? 'bg-orbit/10 border-orbit/30' :
              level > 50 ? 'bg-emerald-500/10 border-emerald-500/30' :
              level > 20 ? 'bg-amber-500/10 border-amber-500/30' :
              'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Bateria atual</div>
                  <div className="text-3xl font-bold font-mono-jet">{level}%</div>
                </div>
                {charging && (
                  <Badge variant="outline" className="bg-orbit/20 text-orbit border-orbit/40">
                    <Plus className="h-3 w-3 mr-1" /> Carregando
                  </Badge>
                )}
              </div>
              <div className="mt-2 h-2 bg-secondary/60 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    charging ? 'bg-orbit' : level > 50 ? 'bg-emerald-500' : level > 20 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${level}%` }}
                />
              </div>
            </div>
          )}

          {level === null && (
            <div className="p-2 rounded-md bg-secondary/30 border border-border/30 text-xs text-muted-foreground">
              Battery API não disponível. Aplique as dicas abaixo mesmo assim.
            </div>
          )}

          {/* Lista de dicas */}
          <div className="space-y-1.5">
            {BATTERY_TIPS.map((tip) => (
              <div key={tip.title} className="p-2.5 rounded-md bg-secondary/30 border border-border/30">
                <div className="text-sm font-medium text-amber-300">{tip.title}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-[11px] text-red-300 leading-relaxed">
            <TriangleAlert className="h-3 w-3 inline mr-1" />
            <strong>Crítico:</strong> Em emergência, economia de bateria pode ser diferença entre pedir socorro ou não. Carregue sempre que possível — qualquer tomada funciona.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
