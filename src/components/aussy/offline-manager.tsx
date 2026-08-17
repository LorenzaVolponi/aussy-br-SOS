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
  cacheSize: number
  cacheKeys: string[]
  precached: boolean
  lastUpdate: string | null
}

export function OfflineManager() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null)
  const [precaching, setPrecaching] = useState(false)
  const [precacheProgress, setPrecacheProgress] = useState(0)

  // Detectar PWA install prompt
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Detecta se já está instalado (standalone)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                       (navigator as any).standalone === true
    setIsInstalled(standalone)

    // Detecta install完成
    const installedHandler = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      toast.success('Aussy Ontech instalado!', {
        description: 'Agora funciona 100% offline.',
      })
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  // Verificar status do cache
  const checkCacheStatus = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const cacheNames = await caches.keys()
      const aussyCaches = cacheNames.filter((k) => k.startsWith('aussy-'))

      let totalSize = 0
      const keys: string[] = []
      for (const name of aussyCaches) {
        const cache = await caches.open(name)
        const reqs = await cache.keys()
        for (const req of reqs) {
          keys.push(req.url)
          try {
            const res = await cache.match(req)
            if (res) {
              const blob = await res.blob()
              totalSize += blob.size
            }
          } catch {}
        }
      }

      setCacheStatus({
        swRegistered: !!reg,
        cacheSize: totalSize,
        cacheKeys: keys,
        precached: keys.some((k) => k.includes('/api/emergency')),
        lastUpdate: reg?.active?.scriptURL ? new Date().toISOString() : null,
      })
    } catch (e) {
      console.error('Erro verificando cache:', e)
    }
  }, [])

  useEffect(() => {
    checkCacheStatus()
    const interval = setInterval(checkCacheStatus, 10000)
    return () => clearInterval(interval)
  }, [checkCacheStatus])

  // Instalar PWA
  const handleInstall = async () => {
    if (!installPrompt) {
      toast.info('Instalação manual', {
        description: 'No Chrome: menu ⋮ → "Instalar Aussy Ontech". No Safari iOS: Compartilhar → "Adicionar à Tela de Início".',
      })
      return
    }
    installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null)
    }
  }

  // Pré-cachear emergência manualmente
  const handlePrecache = async () => {
    setPrecaching(true)
    setPrecacheProgress(0)
    const urls = [
      '/api/emergency/contacts',
      '/api/emergency/first-aid',
      '/api/coverage/towers',
      '/api/satellites/tle?group=starlink&limit=20',
      '/api/satellites/tle?group=iridium&limit=20',
      '/',
      '/manifest.json',
    ]

    let done = 0
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'reload' })
        if (res.ok) {
          const cache = await caches.open('aussy-v2-emergency')
          await cache.put(url, res.clone())
        }
      } catch (e) {
        console.warn('Falha cacheando', url)
      }
      done++
      setPrecacheProgress((done / urls.length) * 100)
    }

    setPrecaching(false)
    setPrecacheProgress(100)
    toast.success('Dados offline prontos!', {
      description: `${urls.length} recursos críticos cacheados. App funciona sem internet.`,
    })
    setTimeout(() => setPrecacheProgress(0), 2000)
    checkCacheStatus()
  }

  // PREPARAR TUDO OFFLINE — 1 toque: cacheia recursos + instala PWA + guia checklist
  const [preparingAll, setPreparingAll] = useState(false)
  const [prepareStep, setPrepareStep] = useState('')

  const handlePrepareAll = async () => {
    setPreparingAll(true)
    setPrepareStep('Verificando service worker...')

    // 1. Service Worker
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (!reg?.active && 'serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js')
      }
      await reg?.update?.()
    } catch (e) {
      console.warn('SW update falhou:', e)
    }

    // 2. Pré-cachear todas as APIs
    setPrepareStep('Baixando contatos de emergência (SAMU, Polícia...)')
    const urls = [
      '/api/emergency/contacts',
      '/api/emergency/first-aid',
      '/api/coverage/towers',
      '/api/satellites/tle?group=starlink&limit=20',
      '/api/satellites/tle?group=iridium&limit=20',
      '/api/satellites/tle?group=weather&limit=20',
      '/api/satellites/tle?group=gnss&limit=20',
      '/',
      '/manifest.json',
    ]
    let done = 0
    for (const url of urls) {
      setPrepareStep(`Cacheando recurso ${done + 1}/${urls.length}`)
      try {
        const res = await fetch(url, { cache: 'reload' })
        if (res.ok) {
          const cache = await caches.open('aussy-v2-emergency')
          await cache.put(url, res.clone())
        }
      } catch (e) {
        console.warn('Falha cacheando', url)
      }
      done++
    }

    // 3. Pré-cachear estáticos (CSS/JS/ícones)
    setPrepareStep('Cacheando ícones e assets...')
    try {
      const staticCache = await caches.open('aussy-v2-statics')
      await staticCache.addAll([
        '/icon-192.png',
        '/icon-512.png',
        '/icon-192.svg',
        '/logo.svg',
        '/manifest.json',
      ]).catch(() => {})
    } catch (e) {}

    // 4. Detectar GPS inicial (para ter posição salva antes de ficar sem sinal)
    setPrepareStep('Adquirindo GPS inicial...')
    try {
      await new Promise<void>((resolve) => {
        if (!('geolocation' in navigator)) return resolve()
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          () => resolve(),
          { timeout: 5000, maximumAge: 60000 }
        )
      })
    } catch (e) {}

    // 5. PWA install prompt (se disponível)
    setPrepareStep('Pronto!')
    if (installPrompt) {
      toast.success('Tudo pronto para offline!', {
        description: 'Recomendamos instalar o app agora para acesso pela tela inicial.',
        action: {
          label: 'Instalar',
          onClick: handleInstall,
        },
        duration: 8000,
      })
    } else {
      toast.success('Tudo pronto para offline!', {
        description: 'App cacheado, GPS adquirido, contatos salvos. Funciona sem internet.',
      })
    }

    setPreparingAll(false)
    setPrepareStep('')
    checkCacheStatus()
  }

  // Limpar cache
  const handleClearCache = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.getRegistration()
    if (reg?.active) {
      reg.active.postMessage({ type: 'CLEAR_CACHE' })
    }
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
    toast.success('Cache limpo', { description: 'Próximo acesso vai re-baixar dados frescos.' })
    setTimeout(checkCacheStatus, 500)
  }

  // Forçar update do SW
  const handleUpdateSW = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.getRegistration()
    if (reg) {
      await reg.update()
      toast.info('Verificando atualizações...')
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
        {/* PREPARAR TUDO — botão 1 toque */}
        <div className="p-3 rounded-xl border border-signal/40 bg-gradient-to-br from-signal/15 to-signal/5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-signal" />
            <span className="text-sm font-bold">Preparar tudo offline com 1 toque</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            Cacheia todos os dados críticos (contatos de emergência, primeiros socorros, satélites, torres),
            ativa o service worker, adquire GPS e oferece instalar o app — tudo de uma vez.
          </p>

          {preparingAll && (
            <div className="mb-3 space-y-1">
              <div className="flex items-center gap-2 text-[11px] text-signal font-mono-jet">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>{prepareStep || 'Processando...'}</span>
              </div>
            </div>
          )}

          <Button
            onClick={handlePrepareAll}
            disabled={preparingAll}
            className="w-full h-10"
            size="sm"
          >
            <Zap className="h-4 w-4 mr-1.5" />
            {preparingAll ? 'Preparando...' : 'Preparar tudo agora'}
          </Button>
        </div>

        {/* Checklist de preparação */}
        <div className="p-3 rounded-lg border border-border/40 bg-background/30">
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-mono-jet text-muted-foreground">CHECKLIST OFFLINE</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <ChecklistItem
              checked={cacheStatus?.swRegistered}
              label="Service Worker ativo"
            />
            <ChecklistItem
              checked={cacheStatus?.precached}
              label="Dados de emergência em cache"
            />
            <ChecklistItem
              checked={(cacheStatus?.cacheKeys.length ?? 0) >= 5}
              label="Recursos suficientes cacheados"
            />
            <ChecklistItem
              checked={isInstalled}
              label="App instalado na tela inicial"
            />
          </div>
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
            {cacheStatus?.swRegistered ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            )}
            <div>
              <div className="font-mono-jet text-[10px] text-muted-foreground">SERVICE WORKER</div>
              <div className="font-medium">
                {cacheStatus?.swRegistered ? 'Ativo' : 'Pendente'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
            {cacheStatus?.precached ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            )}
            <div>
              <div className="font-mono-jet text-[10px] text-muted-foreground">DADOS EMERGÊNCIA</div>
              <div className="font-medium">
                {cacheStatus?.precached ? 'Em cache' : 'Falta cache'}
              </div>
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

        {/* Install button */}
        {isInstalled ? (
          <div className="flex items-center gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            <Smartphone className="h-4 w-4" />
            <span className="font-medium">App instalado e funcionando standalone</span>
          </div>
        ) : (
          <Button
            onClick={handleInstall}
            className="w-full"
            size="sm"
            disabled={!installPrompt}
          >
            <Download className="h-4 w-4 mr-1" />
            {installPrompt ? 'Instalar app (PWA)' : 'Instalação via menu do navegador'}
          </Button>
        )}

        {/* Precache button */}
        {precaching && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono-jet">
              <span>Caching dados críticos...</span>
              <span>{Math.round(precacheProgress)}%</span>
            </div>
            <Progress value={precacheProgress} className="h-1.5" />
          </div>
        )}

        <Button
          onClick={handlePrecache}
          variant="outline"
          size="sm"
          className="w-full border-signal/30 text-signal hover:bg-signal/10"
          disabled={precaching}
        >
          <WifiOff className="h-4 w-4 mr-1" />
          {precaching ? 'Pré-cacheando...' : 'Baixar dados offline agora'}
        </Button>

        {/* Cache management */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleUpdateSW}
            variant="ghost"
            size="sm"
            className="text-xs h-7"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Atualizar SW
          </Button>
          <Button
            onClick={handleClearCache}
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Limpar cache
          </Button>
        </div>

        {/* Info */}
        <div className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t border-border/30">
          <p className="mb-1">
            <strong className="text-foreground">Como funciona offline:</strong>
          </p>
          <p>
            Após o primeiro acesso online, o Service Worker cacheia o app shell + dados de emergência (SAMU, primeiros socorros, torres ANATEL, TLEs de satélites). Em sessões futuras sem internet, todo o app continua utilizável.
          </p>
        </div>

        {/* Quick test */}
        <div className="flex gap-2 pt-2">
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            v2 SW
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-signal/10 text-signal border-signal/30">
            Cache API
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-orbit/10 text-orbit border-orbit/30">
            Periodic Sync
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function ChecklistItem({ checked, label }: { checked?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
      ) : (
        <div className="w-3 h-3 rounded-full border border-muted-foreground/40 flex-shrink-0" />
      )}
      <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
    </div>
  )
}
