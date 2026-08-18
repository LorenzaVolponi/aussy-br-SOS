'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Download,
  RefreshCw,
  Trash2,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Database,
  HardDrive,
  Smartphone,
  CloudOff,
  Zap,
  ListChecks,
} from 'lucide-react'

interface CacheStatus {
  swRegistered: boolean
  swControlling: boolean
  cacheSize: number
  cacheKeys: string[]
  precached: boolean
  shellReady: boolean
}

interface WorkerReport {
  ok: boolean
  total?: number
  succeeded?: number
  failed?: string[]
  message?: string
}

async function ensureServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service Worker não suportado neste navegador')
  }

  let registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
  }

  return navigator.serviceWorker.ready
}

async function sendWorkerCommand(type: 'PRECACHE_SHELL' | 'PRECACHE_EMERGENCY'): Promise<WorkerReport> {
  const registration = await ensureServiceWorker()
  const worker = navigator.serviceWorker.controller || registration.active || registration.waiting
  if (!worker) throw new Error('Service Worker ainda não está ativo')

  return new Promise<WorkerReport>((resolve, reject) => {
    const channel = new MessageChannel()
    const timeout = window.setTimeout(() => {
      channel.port1.close()
      reject(new Error(`Timeout no comando ${type}`))
    }, 30000)

    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout)
      channel.port1.close()
      resolve(event.data as WorkerReport)
    }

    worker.postMessage({ type }, [channel.port2])
  })
}

export function OfflineManager() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null)
  const [precaching, setPrecaching] = useState(false)
  const [precacheProgress, setPrecacheProgress] = useState(0)
  const [preparingAll, setPreparingAll] = useState(false)
  const [prepareStep, setPrepareStep] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    setIsInstalled(standalone)

    const installedHandler = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      toast.success('Aussy Ontech instalado!', {
        description: 'O app está disponível pela tela inicial; os recursos preparados ficam acessíveis sem rede.',
      })
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const checkCacheStatus = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('caches' in window)) return

    try {
      const registration = await navigator.serviceWorker.getRegistration('/')
      const cacheNames = await caches.keys()
      const aussyCaches = cacheNames.filter((name) => name.startsWith('aussy-'))

      let totalSize = 0
      const keys: string[] = []
      for (const name of aussyCaches) {
        const cache = await caches.open(name)
        const requests = await cache.keys()
        for (const request of requests) {
          keys.push(request.url)
          try {
            const response = await cache.match(request)
            if (response && response.type !== 'opaque') totalSize += (await response.blob()).size
          } catch {
            // Algumas respostas opacas não expõem tamanho; ainda contam como cacheadas.
          }
        }
      }

      const hasRoot = keys.some((key) => new URL(key).pathname === '/')
      const hasNextAsset = keys.some((key) => new URL(key).pathname.startsWith('/_next/static/'))
      const hasEmergency = keys.some((key) => new URL(key).pathname.startsWith('/api/emergency/'))

      setCacheStatus({
        swRegistered: Boolean(registration),
        swControlling: Boolean(navigator.serviceWorker.controller),
        cacheSize: totalSize,
        cacheKeys: keys,
        precached: hasEmergency,
        shellReady: hasRoot && hasNextAsset,
      })
    } catch (error) {
      console.error('Erro verificando cache:', error)
    }
  }, [])

  useEffect(() => {
    void checkCacheStatus()
    const interval = window.setInterval(() => void checkCacheStatus(), 10000)
    return () => window.clearInterval(interval)
  }, [checkCacheStatus])

  const handleInstall = async () => {
    if (!installPrompt) {
      toast.info('Instalação manual', {
        description: 'No Chrome: menu ⋮ → "Instalar Aussy Ontech". No Safari iOS: Compartilhar → "Adicionar à Tela de Início".',
      })
      return
    }
    installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

  const handlePrecache = async () => {
    setPrecaching(true)
    setPrecacheProgress(10)
    try {
      const shell = await sendWorkerCommand('PRECACHE_SHELL')
      setPrecacheProgress(55)
      const emergency = await sendWorkerCommand('PRECACHE_EMERGENCY')
      setPrecacheProgress(100)

      const failed = [...(shell.failed || []), ...(emergency.failed || [])]
      if (shell.ok && emergency.ok) {
        toast.success('Pacote offline preparado!', {
          description: `${(shell.succeeded || 0) + (emergency.succeeded || 0)} recursos verificados no cache.`,
        })
      } else {
        toast.warning('Pacote offline preparado parcialmente', {
          description: `${failed.length} recurso(s) não puderam ser atualizado(s). O cache anterior foi preservado.`,
        })
      }
    } catch (error) {
      toast.error('Não foi possível preparar o modo offline', {
        description: error instanceof Error ? error.message : 'Falha inesperada',
      })
    } finally {
      setPrecaching(false)
      window.setTimeout(() => setPrecacheProgress(0), 1800)
      void checkCacheStatus()
    }
  }

  const handlePrepareAll = async () => {
    setPreparingAll(true)
    try {
      setPrepareStep('Ativando Service Worker...')
      const registration = await ensureServiceWorker()
      await registration.update().catch(() => undefined)

      setPrepareStep('Preparando app shell e arquivos do Next.js...')
      const shell = await sendWorkerCommand('PRECACHE_SHELL')

      setPrepareStep('Atualizando dados críticos de emergência...')
      const emergency = await sendWorkerCommand('PRECACHE_EMERGENCY')

      setPrepareStep('Salvando última posição conhecida...')
      await new Promise<void>((resolve) => {
        if (!('geolocation' in navigator)) return resolve()
        navigator.geolocation.getCurrentPosition(
          (position) => {
            try {
              localStorage.setItem('aussy_last_location_v1', JSON.stringify({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                accuracy: position.coords.accuracy,
                source: 'gps',
                timestamp: new Date(position.timestamp).toISOString(),
              }))
            } catch {}
            resolve()
          },
          () => resolve(),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        )
      })

      await checkCacheStatus()
      const failed = [...(shell.failed || []), ...(emergency.failed || [])]
      setPrepareStep('Pronto')

      if (!shell.ok || !emergency.ok) {
        toast.warning('Offline preparado com pendências', {
          description: `${failed.length} recurso(s) falharam na atualização; versões anteriores em cache foram mantidas quando disponíveis.`,
          duration: 8000,
        })
      } else if (installPrompt) {
        toast.success('App e dados essenciais preparados!', {
          description: 'App shell, dados críticos e última posição foram salvos. Tiles OSM não são pré-baixados; somente os visualizados podem permanecer em cache.',
          action: { label: 'Instalar', onClick: handleInstall },
          duration: 8000,
        })
      } else {
        toast.success('App e dados essenciais preparados!', {
          description: 'App shell, dados críticos e última posição foram salvos. Tiles OSM não são pré-baixados; somente os visualizados podem permanecer em cache.',
        })
      }
    } catch (error) {
      toast.error('Falha preparando o modo offline', {
        description: error instanceof Error ? error.message : 'Falha inesperada',
      })
    } finally {
      setPreparingAll(false)
      setPrepareStep('')
      void checkCacheStatus()
    }
  }

  const handleClearCache = async () => {
    if (typeof window === 'undefined' || !('caches' in window)) return
    if (!window.confirm('Apagar todos os dados offline, incluindo tiles OSM já visualizados?')) return

    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith('aussy-')).map((key) => caches.delete(key)))
    toast.success('Cache offline apagado', { description: 'Use "Preparar app agora" antes de ficar sem rede.' })
    window.setTimeout(() => void checkCacheStatus(), 300)
  }

  const handleUpdateSW = async () => {
    try {
      const registration = await ensureServiceWorker()
      await registration.update()
      toast.info('Service Worker atualizado/verificado')
      void checkCacheStatus()
    } catch (error) {
      toast.error('Falha ao atualizar Service Worker', {
        description: error instanceof Error ? error.message : 'Falha inesperada',
      })
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <Card className="border-signal/20 bg-signal/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CloudOff className="h-4 w-4 text-signal" />
          Modo Offline & Instalação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-xl border border-signal/40 bg-gradient-to-br from-signal/15 to-signal/5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-signal" />
            <span className="text-sm font-bold">Preparar app e dados essenciais para offline</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            Salva o app shell, arquivos JS/CSS do Next.js, dados críticos e a última posição GPS conhecida. Isso não baixa regiões do OpenStreetMap: no mapa, apenas tiles efetivamente visualizados podem permanecer em cache.
          </p>

          {preparingAll && (
            <div className="mb-3 space-y-1">
              <div className="flex items-center gap-2 text-[11px] text-signal font-mono-jet">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>{prepareStep || 'Processando...'}</span>
              </div>
            </div>
          )}

          <Button onClick={handlePrepareAll} disabled={preparingAll} className="w-full h-10" size="sm">
            <Zap className="h-4 w-4 mr-1.5" />
            {preparingAll ? 'Preparando...' : 'Preparar app agora'}
          </Button>
        </div>

        <div className="p-3 rounded-lg border border-border/40 bg-background/30">
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-mono-jet text-muted-foreground">CHECKLIST OFFLINE</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <ChecklistItem checked={cacheStatus?.swRegistered} label="Service Worker registrado" />
            <ChecklistItem checked={cacheStatus?.swControlling} label="Página controlada pelo Service Worker" />
            <ChecklistItem checked={cacheStatus?.shellReady} label="App shell + JS/CSS em cache" />
            <ChecklistItem checked={cacheStatus?.precached} label="Dados de emergência em cache" />
            <ChecklistItem checked={isInstalled} label="App instalado na tela inicial (opcional)" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
            {cacheStatus?.swRegistered ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-400" />}
            <div>
              <div className="font-mono-jet text-[10px] text-muted-foreground">SERVICE WORKER</div>
              <div className="font-medium">{cacheStatus?.swControlling ? 'Controlando' : cacheStatus?.swRegistered ? 'Registrado' : 'Pendente'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
            {cacheStatus?.precached ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-400" />}
            <div>
              <div className="font-mono-jet text-[10px] text-muted-foreground">DADOS EMERGÊNCIA</div>
              <div className="font-medium">{cacheStatus?.precached ? 'Em cache' : 'Falta preparar'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
            <Database className="h-3.5 w-3.5 text-signal" />
            <div>
              <div className="font-mono-jet text-[10px] text-muted-foreground">RECURSOS</div>
              <div className="font-medium">{cacheStatus?.cacheKeys.length ?? 0} URLs</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
            <HardDrive className="h-3.5 w-3.5 text-orbit" />
            <div>
              <div className="font-mono-jet text-[10px] text-muted-foreground">TAMANHO</div>
              <div className="font-medium">{formatBytes(cacheStatus?.cacheSize ?? 0)}</div>
            </div>
          </div>
        </div>

        {isInstalled ? (
          <div className="flex items-center gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            <Smartphone className="h-4 w-4" />
            <span className="font-medium">App instalado em modo standalone</span>
          </div>
        ) : (
          <Button onClick={handleInstall} className="w-full" size="sm" disabled={!installPrompt}>
            <Download className="h-4 w-4 mr-1" />
            {installPrompt ? 'Instalar app (PWA)' : 'Instalação via menu do navegador'}
          </Button>
        )}

        {precaching && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono-jet">
              <span>Preparando recursos críticos...</span>
              <span>{Math.round(precacheProgress)}%</span>
            </div>
            <Progress value={precacheProgress} className="h-1.5" />
          </div>
        )}

        <Button onClick={handlePrecache} variant="outline" size="sm" className="w-full border-signal/30 text-signal hover:bg-signal/10" disabled={precaching}>
          <WifiOff className="h-4 w-4 mr-1" />
          {precaching ? 'Preparando...' : 'Baixar/atualizar dados offline agora'}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleUpdateSW} variant="ghost" size="sm" className="text-xs h-7">
            <RefreshCw className="h-3 w-3 mr-1" />
            Atualizar SW
          </Button>
          <Button onClick={handleClearCache} variant="ghost" size="sm" className="text-xs h-7 text-red-400 hover:text-red-300">
            <Trash2 className="h-3 w-3 mr-1" />
            Limpar cache
          </Button>
        </div>

        <div className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t border-border/30">
          <p className="mb-1"><strong className="text-foreground">Como funciona offline:</strong></p>
          <p>
            O Service Worker preserva o app shell, recursos estáticos e dados já preparados. Funções locais como SOS sonoro, números de emergência, guias, bússola e última posição conhecida continuam disponíveis; informações externas mostram cache ou indisponibilidade quando não houver cópia local. No mapa OSM, somente tiles efetivamente visualizados podem permanecer armazenados; o Aussy não pré-baixa regiões no servidor padrão.
          </p>
        </div>

        <div className="flex gap-2 pt-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">SW resiliente</Badge>
          <Badge variant="outline" className="text-[10px] bg-signal/10 text-signal border-signal/30">Cache API</Badge>
          <Badge variant="outline" className="text-[10px] bg-orbit/10 text-orbit border-orbit/30">Recovery online</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function ChecklistItem({ checked, label }: { checked?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {checked ? <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" /> : <div className="w-3 h-3 rounded-full border border-muted-foreground/40 flex-shrink-0" />}
      <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  )
}
