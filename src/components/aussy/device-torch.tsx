'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Camera,
  Flashlight,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type TorchStatus =
  | 'idle'
  | 'requesting'
  | 'on'
  | 'unsupported'
  | 'denied'
  | 'busy'
  | 'error'

type TorchCapabilities = MediaTrackCapabilities & {
  torch?: boolean | boolean[]
}

type TorchSettings = MediaTrackSettings & {
  torch?: boolean
}

type TorchConstraintSet = MediaTrackConstraintSet & {
  torch?: boolean
}

interface TorchHardware {
  stream: MediaStream
  track: MediaStreamTrack
}

const REAR_CAMERA_LABEL = /(back|rear|environment|world|traseir|extern)/i

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function supportsTorch(track: MediaStreamTrack) {
  const capability = (track.getCapabilities?.() as TorchCapabilities | undefined)?.torch
  return capability === true || (Array.isArray(capability) && capability.includes(true))
}

function torchErrorPresentation(error: unknown): {
  status: TorchStatus
  message: string
} {
  const normalized = error instanceof Error ? error : new Error('Falha desconhecida ao acessar o LED')

  if (normalized.name === 'TorchUnsupported') {
    return {
      status: 'unsupported',
      message: 'A câmera traseira existe, mas este navegador não expõe o controle do LED.',
    }
  }

  if (normalized.name === 'NotAllowedError' || normalized.name === 'SecurityError') {
    return {
      status: 'denied',
      message: 'Permissão de câmera bloqueada. Libere a câmera para este site e tente novamente.',
    }
  }

  if (normalized.name === 'NotReadableError' || normalized.name === 'AbortError') {
    return {
      status: 'busy',
      message: 'A câmera está ocupada por outro aplicativo ou indisponível neste momento.',
    }
  }

  if (normalized.name === 'NotFoundError' || normalized.name === 'OverconstrainedError') {
    return {
      status: 'unsupported',
      message: 'Nenhuma câmera traseira compatível com controle de LED foi encontrada.',
    }
  }

  return {
    status: 'error',
    message: 'Não foi possível acender o LED. Feche outros apps de câmera e tente novamente.',
  }
}

async function requestCamera(video: MediaTrackConstraints): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video,
  })
}

async function findTorchHardware(): Promise<TorchHardware> {
  const inspectedDeviceIds = new Set<string>()

  const inspect = (stream: MediaStream): TorchHardware | null => {
    const track = stream.getVideoTracks()[0]
    if (!track) {
      stopStream(stream)
      return null
    }

    const deviceId = track.getSettings().deviceId
    if (deviceId) inspectedDeviceIds.add(deviceId)

    if (supportsTorch(track)) return { stream, track }

    stopStream(stream)
    return null
  }

  const environmentStream = await requestCamera({
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  })

  const environmentHardware = inspect(environmentStream)
  if (environmentHardware) return environmentHardware

  const devices = await navigator.mediaDevices.enumerateDevices()
  const cameras = devices
    .filter((device) => device.kind === 'videoinput' && device.deviceId)
    .filter((device) => !inspectedDeviceIds.has(device.deviceId))
    .sort((left, right) => {
      const leftRear = REAR_CAMERA_LABEL.test(left.label) ? 1 : 0
      const rightRear = REAR_CAMERA_LABEL.test(right.label) ? 1 : 0
      return rightRear - leftRear
    })
    .slice(0, 4)

  for (const camera of cameras) {
    try {
      const stream = await requestCamera({
        deviceId: { exact: camera.deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      })
      const hardware = inspect(stream)
      if (hardware) return hardware
    } catch {
      // Alguns aparelhos anunciam múltiplas lentes que não podem ser abertas isoladamente.
    }
  }

  const unsupported = new Error('Torch capability unavailable')
  unsupported.name = 'TorchUnsupported'
  throw unsupported
}

export function DeviceTorch() {
  const [status, setStatus] = useState<TorchStatus>('idle')
  const [message, setMessage] = useState('Toque para solicitar acesso à câmera traseira e acender o LED real.')
  const [cameraLabel, setCameraLabel] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const busyRef = useRef(false)
  const mountedRef = useRef(true)

  const releaseWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current
    wakeLockRef.current = null

    if (!sentinel || sentinel.released) return
    try {
      await sentinel.release()
    } catch {
      // Wake Lock é apenas uma melhoria; o desligamento do LED continua obrigatório.
    }
  }, [])

  const releaseHardware = useCallback(async (
    updateState = true,
    nextMessage = 'LED desligado. A câmera foi liberada.',
  ) => {
    const track = trackRef.current
    const stream = streamRef.current

    trackRef.current = null
    streamRef.current = null

    if (track?.readyState === 'live') {
      try {
        await track.applyConstraints({
          advanced: [{ torch: false } as TorchConstraintSet],
        })
      } catch {
        // Parar a track abaixo também desliga o LED.
      }
    }

    stopStream(stream)

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }

    await releaseWakeLock()
    busyRef.current = false

    if (updateState && mountedRef.current) {
      setStatus('idle')
      setMessage(nextMessage)
      setCameraLabel(null)
    }
  }, [releaseWakeLock])

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch {
      // O LED funciona mesmo quando Wake Lock não está disponível.
    }
  }, [])

  const turnOn = useCallback(async () => {
    if (busyRef.current || status === 'on') return

    if (typeof window === 'undefined' || !window.isSecureContext) {
      setStatus('error')
      setMessage('O LED só pode ser solicitado em conexão HTTPS segura.')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      setMessage('Este navegador não oferece acesso à câmera necessário para controlar o LED.')
      return
    }

    busyRef.current = true
    setStatus('requesting')
    setMessage('Localizando a câmera traseira e verificando o LED…')

    try {
      const { stream, track } = await findTorchHardware()
      streamRef.current = stream
      trackRef.current = track

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }

      track.addEventListener('ended', () => {
        if (!mountedRef.current || trackRef.current !== track) return
        trackRef.current = null
        streamRef.current = null
        busyRef.current = false
        setStatus('idle')
        setMessage('A câmera foi encerrada pelo sistema. Toque para tentar novamente.')
        setCameraLabel(null)
      }, { once: true })

      await track.applyConstraints({
        advanced: [{ torch: true } as TorchConstraintSet],
      })

      const settings = track.getSettings() as TorchSettings
      setCameraLabel(track.label || settings.deviceId || 'Câmera traseira')
      setStatus('on')
      setMessage('LED traseiro ativo. Nenhuma imagem é exibida, gravada ou enviada.')
      busyRef.current = false
      await requestWakeLock()
    } catch (error) {
      const presentation = torchErrorPresentation(error)
      await releaseHardware(false)

      if (mountedRef.current) {
        setStatus(presentation.status)
        setMessage(presentation.message)
        setCameraLabel(null)
      }
    }
  }, [releaseHardware, requestWakeLock, status])

  const turnOff = useCallback(async () => {
    await releaseHardware(true)
  }, [releaseHardware])

  useEffect(() => {
    const handlePageHide = () => {
      void releaseHardware(false)
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && trackRef.current) {
        void releaseHardware(true, 'LED desligado automaticamente ao sair do app.')
      }
    }

    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mountedRef.current = false
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibility)
      void releaseHardware(false)
    }
  }, [releaseHardware])

  const isOn = status === 'on'
  const isRequesting = status === 'requesting'

  return (
    <Card className={`overflow-hidden border-2 ${
      isOn
        ? 'border-amber-400 bg-amber-50 shadow-[0_18px_50px_rgba(245,158,11,0.18)] dark:bg-amber-950/20'
        : 'border-amber-200 bg-white dark:border-amber-900/60 dark:bg-slate-950'
    }`}>
      <CardContent className="p-0">
        <div className="grid gap-0 md:grid-cols-[1fr_auto]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
                  isOn ? 'bg-amber-500 text-slate-950' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  <Flashlight className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold tracking-[-0.02em] text-slate-950 dark:text-slate-50">
                      Lanterna LED real
                    </h2>
                    <Badge
                      variant="outline"
                      className={isOn
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300'}
                    >
                      {isOn ? 'LED ACESO' : 'HARDWARE LOCAL'}
                    </Badge>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Usa o flash traseiro do aparelho quando o navegador oferece o controle de torch. Não substitui o LED por uma tela branca.
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`mt-4 rounded-2xl border p-3.5 text-sm leading-5 ${
                status === 'denied' || status === 'busy' || status === 'error'
                  ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200'
                  : status === 'unsupported'
                    ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    : isOn
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200'
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2.5">
                {isRequesting
                  ? <Loader2 className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin" />
                  : status === 'denied' || status === 'busy' || status === 'error'
                    ? <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    : isOn
                      ? <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      : <Camera className="mt-0.5 h-4 w-4 flex-shrink-0" />}
                <div>
                  <p className="font-semibold">{message}</p>
                  {cameraLabel && <p className="mt-1 text-xs opacity-80">{cameraLabel}</p>}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              <LockKeyhole className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                O acesso é solicitado somente após o toque. A imagem fica local, invisível e sem gravação; ao desligar ou sair do app, todas as tracks da câmera são encerradas.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center border-t border-slate-200 p-5 dark:border-slate-800 md:min-w-[230px] md:border-l md:border-t-0">
            <Button
              type="button"
              size="lg"
              onClick={() => void (isOn ? turnOff() : turnOn())}
              disabled={isRequesting}
              aria-pressed={isOn}
              className={`min-h-16 w-full rounded-2xl text-base font-bold md:min-w-[190px] ${
                isOn
                  ? 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200'
                  : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
              }`}
            >
              {isRequesting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verificando…
                </>
              ) : isOn ? (
                <>
                  <Flashlight className="mr-2 h-5 w-5" />
                  Desligar lanterna
                </>
              ) : (
                <>
                  <Flashlight className="mr-2 h-5 w-5" />
                  Acender LED traseiro
                </>
              )}
            </Button>
          </div>
        </div>

        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none fixed bottom-0 left-0 h-px w-px opacity-0"
        />
      </CardContent>
    </Card>
  )
}
