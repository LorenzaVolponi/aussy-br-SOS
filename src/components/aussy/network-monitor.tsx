'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNetworkStatus, useLatencyProbe, useDeviceCapabilities } from '@/hooks/use-network'
import {
  Wifi,
  WifiOff,
  Activity,
  Smartphone,
  Bluetooth,
  MapPin,
  Clock,
  Gauge,
  Radio,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'

interface ServerStatus {
  isp?: string | null
  country?: string | null
  dataQuality?: string
}

function networkTypeLabel(type?: string, effectiveType?: string) {
  if (type === 'wifi') return 'Wi‑Fi'
  if (type === 'cellular') return `Rede móvel${effectiveType ? ` · ${effectiveType.toUpperCase()}` : ''}`
  if (type === 'ethernet') return 'Ethernet'
  if (type) return type
  if (effectiveType) return `Link ${effectiveType.toUpperCase()}`
  return 'Não exposto pelo navegador'
}

export function NetworkMonitor() {
  const network = useNetworkStatus()
  const { latency, isReachable, lastCheck } = useLatencyProbe('/api/health', 10000)
  const caps = useDeviceCapabilities()
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)

  useEffect(() => {
    if (!network.online) {
      setServerStatus(null)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)

    fetch('/api/network/status', { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        const cached = response.headers.get('X-Aussy-Cached') === 'true' || response.headers.get('X-Aussy-Offline') === 'true'
        if (!response.ok || cached) throw new Error('Status de rede não confirmado ao vivo')
        return response.json()
      })
      .then((payload) => setServerStatus(payload))
      .catch(() => setServerStatus(null))
      .finally(() => window.clearTimeout(timeout))

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [network.online])

  const quality = useMemo(() => {
    if (!network.online || isReachable === false || latency === null) return 0
    if (latency < 80) return 100
    if (latency < 180) return 80
    if (latency < 350) return 60
    if (latency < 700) return 35
    return 15
  }, [network.online, isReachable, latency])

  const qualityLabel = quality === 0
    ? network.online && isReachable === null ? 'VERIFICANDO' : 'SEM ACESSO'
    : quality >= 80 ? 'ÓTIMO'
      : quality >= 60 ? 'BOM'
        : quality >= 35 ? 'LENTO' : 'CRÍTICO'

  const typeLabel = networkTypeLabel(network.type, network.effectiveType)

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-slate-50">
                {network.online ? <Wifi className="h-5 w-5 text-blue-700 dark:text-blue-300" /> : <WifiOff className="h-5 w-5 text-red-700 dark:text-red-300" />}
                Rede e conectividade
              </CardTitle>
              <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">Medição do navegador e teste real de acesso ao Aussy.</p>
            </div>
            <Badge
              aria-live="polite"
              variant="outline"
              className={network.online
                ? 'border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'}
            >
              {network.online ? 'ONLINE' : 'OFFLINE'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">Acesso ao Aussy</p>
                <div className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50" aria-live="polite">{qualityLabel}</div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600 dark:text-slate-400">Latência aparelho → Aussy</p>
                <p className="mt-1 font-mono text-base font-semibold text-slate-950 dark:text-slate-50">{latency !== null ? `${latency} ms` : '—'}</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden="true">
              <div className="h-full rounded-full bg-blue-700 transition-[width] dark:bg-blue-400" style={{ width: `${quality}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCard icon={<Radio className="h-4 w-4" />} label="Tipo" value={typeLabel} />
            <MetricCard icon={<Gauge className="h-4 w-4" />} label="Downlink" value={typeof network.downlink === 'number' ? `${network.downlink} Mbps` : 'Não exposto'} />
            <MetricCard icon={<Activity className="h-4 w-4" />} label="RTT do navegador" value={typeof network.rtt === 'number' ? `${network.rtt} ms` : 'Não exposto'} />
            <MetricCard icon={<Clock className="h-4 w-4" />} label="Último teste" value={lastCheck ? lastCheck.toLocaleTimeString('pt-BR') : '—'} />
          </div>

          {(serverStatus?.isp || serverStatus?.country) && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100"><ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300" /> Rede pública estimada</div>
              <div className="mt-2 grid gap-1 text-xs text-slate-600 dark:text-slate-400 sm:grid-cols-2">
                {serverStatus.isp && <span>Operadora/ISP: <strong className="text-slate-800 dark:text-slate-200">{serverStatus.isp}</strong></span>}
                {serverStatus.country && <span>País: <strong className="text-slate-800 dark:text-slate-200">{serverStatus.country}</strong></span>}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-5 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p><strong>Wi‑Fi sem invenção:</strong> navegadores não expõem uma lista confiável de SSIDs próximos para uma página web. O Aussy não simula redes disponíveis; mostra apenas o tipo/qualidade que o próprio navegador consegue informar.</p>
          </div>

          {network.saveData && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
              Modo Economia de Dados ativo — algumas consultas externas podem ser reduzidas pelo dispositivo.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-slate-950 dark:text-slate-50">
            <Smartphone className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            Capacidades deste dispositivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <CapabilityChip icon={<MapPin className="h-4 w-4" />} label="Geolocalização" active={caps.hasGeolocation} />
            <CapabilityChip icon={<Bluetooth className="h-4 w-4" />} label="Web Bluetooth" active={caps.hasBluetooth} />
            <CapabilityChip icon={<Activity className="h-4 w-4" />} label="Service Worker" active={caps.hasServiceWorker} />
            <CapabilityChip icon={<Radio className="h-4 w-4" />} label="Network Information API" active={network.supported} />
            <CapabilityChip icon={<Gauge className="h-4 w-4" />} label="Background Sync" active={caps.hasBackgroundSync} />
            <CapabilityChip icon={<Smartphone className="h-4 w-4" />} label={`Plataforma: ${caps.platform || '—'}`} active />
          </div>
          <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:text-slate-400">
            Fonte: APIs do próprio navegador. Recursos que o sistema operacional não expõe à Web permanecem como “não disponíveis”, sem inferência por modelo de aparelho.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-h-[86px] rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">{icon}<span>{label}</span></div>
      <div className="mt-2 break-words text-sm font-semibold text-slate-950 dark:text-slate-50">{value}</div>
    </div>
  )
}

function CapabilityChip({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <div className={`flex min-h-[48px] items-center gap-2 rounded-xl border px-3 py-2 text-sm ${active
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200'
      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'}`}>
      {icon}<span className="font-medium">{label}</span>
    </div>
  )
}
