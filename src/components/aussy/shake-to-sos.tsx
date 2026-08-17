'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Vibrate,
  Activity,
  AlertTriangle,
  CheckCircle2,
  X,
  Siren,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

/**
 * Shake-to-SOS — detecta chacoalhadas do celular via DeviceMotion API.
 * Após 3 chacoalhadas em 5 segundos, dispara modal de confirmação de SOS.
 *
 * Funcionamento:
 * - Threshold: ~25 m/s² de aceleração total (soma vetorial - gravidade)
 * - Janela: 3 shakes em 5 segundos
 * - Após detecção: mostra modal de confirmação (cancela em 10s)
 * - Se confirmado: dispara ligação 192 + vibra SOS em morse
 *
 * Requer permissão no iOS 13+ (DeviceMotionEvent.requestPermission)
 */

const SHAKE_THRESHOLD = 25 // m/s²
const SHAKE_WINDOW_MS = 5000 // 5s
const SHAKE_COUNT_TRIGGER = 3
const SOS_CONFIRM_TIMEOUT_MS = 10000 // 10s para confirmar

export function ShakeToSOS() {
  const [enabled, setEnabled] = useState(false)
  const [supported, setSupported] = useState(true)
  const [needsPermission, setNeedsPermission] = useState(false)
  const [shakeCount, setShakeCount] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [countdown, setCountdown] = useState(SOS_CONFIRM_TIMEOUT_MS / 1000)
  const [sosTriggered, setSosTriggered] = useState(false)

  const shakeTimes = useRef<number[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)

  // Verifica suporte
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('DeviceMotionEvent' in window)) {
      setSupported(false)
      return
    }
    // iOS 13+ requer permissão explícita
    const DME = (window as any).DeviceMotionEvent
    if (typeof DME?.requestPermission === 'function') {
      setNeedsPermission(true)
    }
  }, [])

  const requestPermission = async () => {
    try {
      const DME = (window as any).DeviceMotionEvent
      const perm = await DME.requestPermission()
      if (perm === 'granted') {
        setNeedsPermission(false)
        setEnabled(true)
        toast.success('Detecção de shake ativada')
      } else {
        toast.error('Permissão negada para sensores de movimento')
      }
    } catch (e) {
      toast.error('Não foi possível ativar detecção')
    }
  }

  const handleShake = useCallback(() => {
    const now = Date.now()
    // Limpa shakes antigos
    shakeTimes.current = shakeTimes.current.filter((t) => now - t < SHAKE_WINDOW_MS)
    shakeTimes.current.push(now)
    setShakeCount(shakeTimes.current.length)

    if (shakeTimes.current.length >= SHAKE_COUNT_TRIGGER) {
      shakeTimes.current = []
      setShakeCount(0)
      triggerSOSConfirm()
    }
  }, [])

  // Liga/desliga listener
  useEffect(() => {
    if (!enabled || needsPermission) return

    let lastUpdate = 0
    let lastAccel = { x: 0, y: 0, z: 0 }

    const handler = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity
      if (!accel) return

      const now = Date.now()
      if (now - lastUpdate < 100) return // throttle 100ms
      lastUpdate = now

      const delta = {
        x: Math.abs(accel.x || 0) - Math.abs(lastAccel.x),
        y: Math.abs(accel.y || 0) - Math.abs(lastAccel.y),
        z: Math.abs(accel.z || 0) - Math.abs(lastAccel.z),
      }

      const magnitude = Math.sqrt(delta.x * delta.x + delta.y * delta.y + delta.z * delta.z)
      lastAccel = { x: accel.x || 0, y: accel.y || 0, z: accel.z || 0 }

      if (magnitude > SHAKE_THRESHOLD) {
        handleShake()
      }
    }

    window.addEventListener('devicemotion', handler)
    return () => window.removeEventListener('devicemotion', handler)
  }, [enabled, needsPermission, handleShake])

  // Modal de confirmação + countdown
  const triggerSOSConfirm = () => {
    setConfirmOpen(true)
    setCountdown(SOS_CONFIRM_TIMEOUT_MS / 1000)
    // Vibração padrão
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200])
  }

  useEffect(() => {
    if (!confirmOpen) return
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          // Auto-confirma após countdown — exibe tela de SOS
          setConfirmOpen(false)
          triggerSOS()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [confirmOpen])

  // Limpa AudioContext no unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
    }
  }, [])

  // Quando SOS é disparado, vibra continuamente sem chamar tel: (iOS bloqueia auto-call)
  useEffect(() => {
    if (!sosTriggered) return
    let active = true
    const pulse = () => {
      if (!active) return
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 100, 100, 100, 100, 100, 300, 100, 300, 100, 300, 100, 100, 100, 100, 100, 100])
      }
      // Bip sonoro via AudioContext (reutiliza o mesmo contexto)
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        const ctx = audioContextRef.current
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 880
        gain.gain.value = 0.15
        osc.connect(gain).connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      } catch {}
      const t = setTimeout(pulse, 4000)
      // armazena para limpeza
      ;(pulse as any)._t = t
    }
    pulse()
    return () => {
      active = false
      const t = (pulse as any)._t
      if (t) clearTimeout(t)
    }
  }, [sosTriggered])

  const triggerSOS = () => {
    setSosTriggered(true)
    toast.success('SOS disparado!', {
      description: 'Toque em Ligar 192 para chamar o SAMU.',
      duration: 10000,
    })
    // Vibra SOS em morse imediatamente
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 100, 100, 100, 100, 100, 300, 100, 300, 100, 300, 100, 100, 100, 100, 100, 100])
    }
  }

  // Liga para SAMU — DEVE ser chamado de um gesture (onClick)
  const callSAMU = () => {
    window.location.href = 'tel:192'
  }

  const cancelSOS = () => {
    setConfirmOpen(false)
    toast.info('SOS cancelado')
  }

  const toggle = () => {
    if (needsPermission) {
      requestPermission()
      return
    }
    setEnabled((e) => !e)
    if (!enabled) {
      toast.success('Detecção de shake ativada', {
        description: `Chacoalhe ${SHAKE_COUNT_TRIGGER}x para disparar SOS.`,
      })
    } else {
      toast.info('Detecção de shake desativada')
    }
  }

  if (!supported) {
    return (
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Vibrate className="h-4 w-4 text-purple-400" />
            Shake-to-SOS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <p>Seu dispositivo não suporta sensores de movimento (DeviceMotion API).</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={`border-purple-500/30 ${enabled ? 'bg-purple-500/10' : 'bg-purple-500/5'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Vibrate className="h-4 w-4 text-purple-400" />
              Shake-to-SOS
            </span>
            <Button
              onClick={toggle}
              size="sm"
              variant={enabled ? 'default' : 'outline'}
              className="h-7 text-xs"
            >
              {enabled ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ativo
                </>
              ) : needsPermission ? (
                'Permitir'
              ) : (
                'Ativar'
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Chacoalhe o celular <strong>{SHAKE_COUNT_TRIGGER} vezes</strong> em {SHAKE_WINDOW_MS / 1000}s para
            acionar SOS automático. Após detecção, você tem {SOS_CONFIRM_TIMEOUT_MS / 1000}s para cancelar
            antes de ligar para o SAMU (192).
          </p>

          {enabled && (
            <div className="flex items-center gap-2 p-2 rounded bg-purple-500/10 border border-purple-500/30">
              <Activity className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
              <span className="text-[11px] text-purple-300">
                Monitorando... {shakeCount}/{SHAKE_COUNT_TRIGGER} chacoalhadas
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <Vibrate className="h-3 w-3" />
            <span>Vibra SOS em morse (· · · — — — · · ·) ao confirmar</span>
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmação SOS */}
      <Sheet open={confirmOpen} onOpenChange={(v) => !v && cancelSOS()}>
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-red-400">
              <Siren className="h-5 w-5 animate-pulse" />
              SOS detectado!
            </SheetTitle>
            <SheetDescription>
              Chacoalhada detectada. Confirme para ativar o SOS.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            {/* Countdown grande */}
            <div className="flex flex-col items-center justify-center py-6 bg-red-500/10 rounded-xl border border-red-500/30">
              <div className="text-6xl font-bold text-red-400 font-mono-jet">
                {countdown}
              </div>
              <div className="text-xs text-red-300/70 mt-2">
                segundos para ativar SOS automaticamente
              </div>
            </div>

            {/* Botões */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={cancelSOS}
                variant="outline"
                size="lg"
                className="h-12"
              >
                <X className="h-4 w-4 mr-1.5" />
                Cancelar
              </Button>
              <Button
                onClick={triggerSOS}
                size="lg"
                className="h-12 bg-red-500 hover:bg-red-600"
              >
                <Siren className="h-4 w-4 mr-1.5" />
                Ativar SOS
              </Button>
            </div>

            {/* Vibração de aviso */}
            {('vibrate' in navigator) && (
              <p className="text-[10px] text-muted-foreground/60 text-center">
                📳 Celular vibrando para alertar
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal pós-SOS — botão grande para ligar 192 (gesture do usuário) */}
      <Sheet open={sosTriggered} onOpenChange={(v) => !v && setSosTriggered(false)}>
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-red-400">
              <Siren className="h-5 w-5 animate-pulse" />
              SOS ATIVO
            </SheetTitle>
            <SheetDescription>
              Toque no botão abaixo para ligar para o SAMU agora.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            {/* Botão gigante Ligar 192 */}
            <Button
              onClick={callSAMU}
              size="lg"
              className="w-full h-20 text-xl font-bold bg-red-500 hover:bg-red-600 animate-pulse"
            >
              <Siren className="h-6 w-6 mr-2" />
              LIGAR 192
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Disque também: <strong>190</strong> (Polícia) · <strong>193</strong> (Bombeiros)
            </p>

            <Button
              onClick={() => setSosTriggered(false)}
              variant="outline"
              size="lg"
              className="w-full h-12"
            >
              <X className="h-4 w-4 mr-1.5" />
              Cancelar SOS
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
