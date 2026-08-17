'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Compass,
  Mountain,
  Navigation,
  Crosshair,
  AlertCircle,
  Gauge,
  TrendingUp,
  TrendingDown,
  Sun,
  Sunrise,
  Sunset,
  Moon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface CompassReading {
  heading: number // 0-360 graus, 0=Norte
  accuracy: number | null
  source: 'magnetometer' | 'absolute' | 'gps'
  timestamp: number
}

interface AltitudeReading {
  altitude: number // metros
  pressure: number // hPa
  source: 'barometer' | 'gps'
  trend: 'up' | 'down' | 'stable'
  timestamp: number
}

interface SunPosition {
  azimuth: number // graus
  elevation: number // graus
  phase: 'night' | 'dawn' | 'sunrise' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'dusk'
  nextEvent: string
  nextEventTime: string
}

const DIRECOES = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO']

function getDirecao(heading: number): string {
  const idx = Math.round(heading / 45) % 8
  return DIRECOES[idx]
}

// Cálculo simples da posição do sol ( NOAA Solar Calculator simplificado )
function calcularPosicaoSol(lat: number, lon: number): SunPosition {
  const now = new Date()
  const julianDay = (now.getTime() / 86400000) + 2440587.5
  const n = julianDay - 2451545.0 + 0.0008
  const Jstar = n - lon / 360
  const M = (357.5291 + 0.98560028 * Jstar) % 360
  const C = 1.9148 * Math.sin(M * Math.PI / 180) + 0.0200 * Math.sin(2 * M * Math.PI / 180) + 0.0003 * Math.sin(3 * M * Math.PI / 180)
  const lambda = (M + C + 180 + 102.9372) % 360
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(M * Math.PI / 180) - 0.0069 * Math.sin(2 * lambda * Math.PI / 180)
  const delta = Math.asin(Math.sin(lambda * Math.PI / 180) * Math.sin(23.44 * Math.PI / 180)) * 180 / Math.PI

  const hourAngle = ((now.getTime() / 86400000 + 2440587.5) - Jtransit) * 360
  const phi = lat
  const elevation = Math.asin(
    Math.sin(phi * Math.PI / 180) * Math.sin(delta * Math.PI / 180) +
    Math.cos(phi * Math.PI / 180) * Math.cos(delta * Math.PI / 180) * Math.cos(hourAngle * Math.PI / 180)
  ) * 180 / Math.PI
  const azimuth = (
    Math.atan2(
      Math.sin(hourAngle * Math.PI / 180),
      Math.cos(hourAngle * Math.PI / 180) * Math.sin(phi * Math.PI / 180) -
      Math.tan(delta * Math.PI / 180) * Math.cos(phi * Math.PI / 180)
    ) * 180 / Math.PI + 180
  ) % 360

  // Determina fase
  let phase: SunPosition['phase'] = 'night'
  if (elevation < -6) phase = 'night'
  else if (elevation < 0) phase = elevation < -3 ? 'dawn' : 'sunrise'
  else if (elevation < 6) phase = 'sunrise'
  else if (elevation < 30) {
    phase = now.getHours() < 12 ? 'morning' : 'afternoon'
  } else if (elevation < 60) {
    phase = now.getHours() < 12 ? 'morning' : 'afternoon'
  } else phase = 'noon'

  if (elevation < -0.83 && elevation > -6) {
    phase = now.getHours() < 12 ? 'dawn' : 'dusk'
  }

  // Próximo evento: nascer ou pôr
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  let nextEvent = ''
  let nextEventTime = ''
  if (elevation < 0) {
    nextEvent = 'Nascer do sol'
    // Estimativa grosseira: 6h local (não há calibração sem libs externas)
    const sunrise = new Date(now)
    sunrise.setHours(6, 0, 0, 0)
    if (sunrise < now) sunrise.setDate(sunrise.getDate() + 1)
    nextEventTime = sunrise.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } else {
    nextEvent = 'Pôr do sol'
    const sunset = new Date(now)
    sunset.setHours(18, 0, 0, 0)
    if (sunset < now) sunset.setDate(sunset.getDate() + 1)
    nextEventTime = sunset.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return { azimuth, elevation, phase, nextEvent, nextEventTime }
}

export function CompassAltimeter({ observerLat = -15.7801, observerLon = -47.9292 }: { observerLat?: number; observerLon?: number }) {
  const [compass, setCompass] = useState<CompassReading | null>(null)
  const [altitude, setAltitude] = useState<AltitudeReading | null>(null)
  const [sun, setSun] = useState<SunPosition | null>(null)
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt')
  const [error, setError] = useState<string | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Calcula sol periodicamente
  useEffect(() => {
    setSun(calcularPosicaoSol(observerLat, observerLon))
    const interval = setInterval(() => setSun(calcularPosicaoSol(observerLat, observerLon)), 60000)
    return () => clearInterval(interval)
  }, [observerLat, observerLon])

  // Histórico de altitude para detectar tendência
  const altHistoryRef = useRef<{ alt: number; ts: number }[]>([])

  const startSensors = useCallback(async () => {
    setError(null)

    try {
      // Tenta obter permissão de orientação (iOS exige gesto)
      type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }
      const DOE = window.DeviceOrientationEvent as DeviceOrientationEventWithPermission
      if (DOE?.requestPermission) {
        const result = await DOE.requestPermission()
        if (result !== 'granted') {
          setPermission('denied')
          setError('Permissão de sensores negada. Habilite em Configurações.')
          return
        }
      }
      setPermission('granted')

      // Bússola via DeviceOrientation (alpha = rotação em Z)
      const handleOrientation = (event: DeviceOrientationEvent & { webkitCompassHeading?: number; absolute?: boolean }) => {
        let heading = 0
        let source: CompassReading['source'] = 'magnetometer'
        if (event.webkitCompassHeading !== undefined) {
          // iOS: heading direto em graus a partir do norte
          heading = event.webkitCompassHeading
          source = 'absolute'
        } else if (event.alpha !== null && event.alpha !== undefined) {
          // Android: alpha é a rotação em torno de Z (complemento do heading)
          heading = 360 - event.alpha
          source = 'magnetometer'
        }
        setCompass({
          heading: Math.round((heading + 360) % 360),
          accuracy: null,
          source,
          timestamp: Date.now(),
        })
      }
      window.addEventListener('deviceorientationabsolute', handleOrientation as any)
      window.addEventListener('deviceorientation', handleOrientation as any)

      // Barômetro via PressureSensor (Chrome Android, alguns iOS)
      type PressureSensorInstance = {
        start: () => Promise<void> | void
        stop: () => void
        addEventListener: (type: string, cb: (e?: any) => void) => void
        pressure?: number
      }
      type PressureSensorConstructor = {
        new (options: { frequency: number }): PressureSensorInstance
      }
      const PressureSensor = (window as any).PressureSensor as PressureSensorConstructor | undefined
      let pressureSensor: PressureSensorInstance | null = null
      let barometerActive = false

      if (PressureSensor) {
        try {
          pressureSensor = new PressureSensor({ frequency: 1 })
          pressureSensor.addEventListener('reading', () => {
            if (pressureSensor?.pressure) {
              // Fórmula barométrica padrão:
              // h = 44330 * (1 - (P/P0)^(1/5.255))
              const P0 = 1013.25 // hPa ao nível do mar
              const pressure = pressureSensor.pressure * 10 // kPa → hPa
              const alt = 44330 * (1 - Math.pow(pressure / P0, 1 / 5.255))

              // Mantém histórico (últimas 10 leituras ~10s)
              altHistoryRef.current.push({ alt, ts: Date.now() })
              if (altHistoryRef.current.length > 10) altHistoryRef.current.shift()

              // Detecta tendência (compara primeiro e último)
              let trend: 'up' | 'down' | 'stable' = 'stable'
              if (altHistoryRef.current.length >= 3) {
                const first = altHistoryRef.current[0].alt
                const last = altHistoryRef.current[altHistoryRef.current.length - 1].alt
                const delta = last - first
                if (Math.abs(delta) > 1.5) trend = delta > 0 ? 'up' : 'down'
              }

              setAltitude({
                altitude: Math.round(alt),
                pressure: Math.round(pressure * 10) / 10,
                source: 'barometer',
                trend,
                timestamp: Date.now(),
              })
              barometerActive = true
            }
          })
          await pressureSensor.start()
        } catch (e) {
          // Barômetro indisponível: fallback GPS
          barometerActive = false
        }
      }

      // Fallback: usa altitude do GPS se barômetro não estiver ativo
      if (!barometerActive) {
        // observerLat/observerLon já vêm do GPS; altitude seria necessário passar como prop
        // Aqui mantemos pressão N/A
        setAltitude(null)
      }

      cleanupRef.current = () => {
        window.removeEventListener('deviceorientationabsolute', handleOrientation as any)
        window.removeEventListener('deviceorientation', handleOrientation as any)
        pressureSensor?.stop()
      }
    } catch (e: any) {
      setError(e?.message || 'Sensores não disponíveis neste dispositivo')
      setPermission('unsupported')
    }
  }, [])

  // Limpa ao desmontar
  useEffect(() => {
    return () => {
      cleanupRef.current?.()
    }
  }, [])

  const heading = compass?.heading ?? 0
  const direcao = getDirecao(heading)

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-emerald-400" />
            Bússola + Altímetro
          </span>
          <Badge variant="outline" className={`text-[9px] font-mono-jet ${
            permission === 'granted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : ''
          }`}>
            {permission === 'granted' ? 'ATIVO' : permission === 'denied' ? 'NEGADO' : permission === 'unsupported' ? 'N/D' : 'INATIVO'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {permission !== 'granted' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-2.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px]">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Ative os sensores do dispositivo para navegação por bússola e leitura de altitude barométrica.
                Funciona <strong>100% offline</strong> — sem GPS ou internet necessários.
                {permission === 'denied' && (
                  <span className="block mt-1 text-amber-400">
                    Permissão negada. Recarregue a página e tente novamente.
                  </span>
                )}
              </div>
            </div>
            <Button
              onClick={startSensors}
              className="w-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
              disabled={permission === 'denied'}
            >
              <Compass className="h-4 w-4 mr-2" />
              Ativar Bússola + Altímetro
            </Button>
            {error && (
              <p className="text-[10px] text-amber-400 text-center">{error}</p>
            )}
          </div>
        )}

        {permission === 'granted' && (
          <>
            {/* Bússola visual */}
            <div className="relative mx-auto w-44 h-44">
              {/* Rosa dos ventos */}
              <div
                className="absolute inset-0 rounded-full border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-950/50 to-slate-950/50"
                style={{ transform: `rotate(${-heading}deg)` }}
              >
                {/* Marcações N/S/L/O */}
                <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-red-400 text-xs font-bold">N</span>
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-emerald-300/70 text-xs font-bold">S</span>
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-emerald-300/70 text-xs font-bold">O</span>
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-300/70 text-xs font-bold">L</span>

                {/* Sub-marcações */}
                {[30, 60, 120, 150, 210, 240, 300, 330].map(deg => (
                  <span
                    key={deg}
                    className="absolute text-[8px] text-emerald-300/40 font-mono-jet"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${deg}deg) translateY(-78px) rotate(${-deg}deg)`,
                    }}
                  >
                    ·
                  </span>
                ))}

                {/* Ponteiro */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-32 origin-bottom"
                  style={{ transform: `translate(-50%, -100%) rotate(180deg)` }}
                >
                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[80px] border-l-transparent border-r-transparent border-b-red-500 mx-auto" />
                </div>
              </div>

              {/* Indicador fixo no topo */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 text-red-400 text-lg z-10">▼</div>

              {/* Centro */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
                <div className="text-2xl font-bold text-emerald-300 font-mono-jet">{heading}°</div>
                <div className="text-[10px] text-muted-foreground font-mono-jet">{direcao}</div>
              </div>
            </div>

            {/* Leitura numérica */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mb-1">
                  <Navigation className="h-3 w-3" />
                  DIREÇÃO
                </div>
                <div className="text-lg font-bold text-emerald-300 font-mono-jet">
                  {heading}° {direcao}
                </div>
                <div className="text-[9px] text-muted-foreground/70 mt-0.5">
                  fonte: {compass?.source}
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 mb-1">
                  <Mountain className="h-3 w-3" />
                  ALTITUDE
                </div>
                {altitude ? (
                  <>
                    <div className="text-lg font-bold text-cyan-300 font-mono-jet flex items-center gap-1.5">
                      {altitude.altitude} m
                      {altitude.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
                      {altitude.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-orange-400" />}
                    </div>
                    <div className="text-[9px] text-muted-foreground/70 mt-0.5">
                      {altitude.pressure} hPa · barômetro
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground/70">N/D</div>
                    <div className="text-[9px] text-muted-foreground/50 mt-0.5">
                      barômetro indisponível
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Posição do sol */}
            {sun && (
              <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                    <Sun className="h-3 w-3" />
                    POSIÇÃO DO SOL
                  </div>
                  <span className="text-[10px] font-mono-jet text-amber-300/70 capitalize">
                    {sun.phase === 'night' && <Moon className="inline h-3 w-3 mr-1" />}
                    {sun.phase === 'dawn' && <Sunrise className="inline h-3 w-3 mr-1" />}
                    {sun.phase === 'sunrise' && <Sunrise className="inline h-3 w-3 mr-1" />}
                    {sun.phase === 'sunset' && <Sunset className="inline h-3 w-3 mr-1" />}
                    {sun.phase === 'dusk' && <Sunset className="inline h-3 w-3 mr-1" />}
                    {sun.phase}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <div className="text-muted-foreground/60">Azimute</div>
                    <div className="font-mono-jet text-amber-300">{Math.round(sun.azimuth)}°</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/60">Elevação</div>
                    <div className="font-mono-jet text-amber-300">{Math.round(sun.elevation)}°</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground/60">{sun.nextEvent}</div>
                    <div className="font-mono-jet text-amber-300">{sun.nextEventTime}</div>
                  </div>
                </div>
                {sun.elevation > 30 && (
                  <div className="mt-2 text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Sol forte — risco de insolação. Use proteção.
                  </div>
                )}
              </div>
            )}

            {/* Dica de navegação */}
            <div className="flex items-start gap-2 p-2 rounded bg-secondary/30 border border-border/30 text-[11px] text-muted-foreground">
              <Crosshair className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
              <div className="leading-relaxed">
                Calibre a bússola girando o aparelho em forma de 8 por 15 segundos se a leitura oscilar.
                Funciona offline; ideal para navegação em trilha quando o GPS falha.
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
