'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useNetworkStatus, useLatencyProbe, useDeviceCapabilities } from '@/hooks/use-network'
import {
  Wifi,
  WifiOff,
  Activity,
  Smartphone,
  Satellite,
  Bluetooth,
  MapPin,
  Clock,
  Zap,
  Radio,
  AlertTriangle,
} from 'lucide-react'

export function NetworkMonitor() {
  const network = useNetworkStatus()
  const { latency, isReachable, lastCheck } = useLatencyProbe('/api/network/status', 10000)
  const caps = useDeviceCapabilities()
  const [serverStatus, setServerStatus] = useState<any>(null)

  useEffect(() => {
    if (!network.online) {
      setServerStatus(null)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)

    fetch('/api/network/status', { cache: 'no-store', signal: controller.signal })
      .then((r) => {
        const cached = r.headers.get('X-Aussy-Cached') === 'true' || r.headers.get('X-Aussy-Offline') === 'true'
        if (!r.ok || cached) throw new Error('Status não é uma leitura de rede ao vivo')
        return r.json()
      })
      .then(setServerStatus)
      .catch(() => setServerStatus(null))
      .finally(() => window.clearTimeout(timeout))

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [network.online])

  const quality = !network.online || isReachable === false
    ? 0
    : !latency
    ? 0
    : latency < 50
    ? 100
    : latency < 150
    ? 80
    : latency < 300
    ? 60
    : latency < 600
    ? 35
    : 15

  const qualityLabel = quality === 0 ? 'OFFLINE' : quality >= 80 ? 'EXCELENTE' : quality >= 60 ? 'BOM' : quality >= 35 ? 'LENTO' : 'CRÍTICO'
  const qualityColor = quality === 0 ? 'text-red-400' : quality >= 60 ? 'text-emerald-400' : quality >= 35 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="space-y-4">
      <Card className="glass-card border-signal/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              {network.online ? <Wifi className="h-5 w-5 text-signal" /> : <WifiOff className="h-5 w-5 text-red-400 blink-emergency" />}
              Status da Conexão
            </CardTitle>
            <Badge
              variant="outline"
              className={network.online
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30 blink-emergency'}
            >
              {network.online ? 'ONLINE' : 'OFFLINE'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-xs text-muted-foreground font-mono-jet uppercase tracking-wider">Qualidade do link</span>
              <span className={`font-mono-jet font-bold text-lg ${qualityColor}`}>{qualityLabel}</span>
            </div>
            <Progress value={quality} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <MetricCard
              icon={<Activity className="h-4 w-4" />}
              label="Latência"
              value={latency ? `${latency} ms` : '—'}
              color={latency && latency < 150 ? 'text-emerald-400' : 'text-amber-400'}
            />
            <MetricCard
              icon={<Zap className="h-4 w-4" />}
              label="Velocidade"
              value={network.downlink ? `${network.downlink} Mbps` : network.effectiveType || '—'}
              color="text-signal"
            />
            <MetricCard
              icon={<Radio className="h-4 w-4" />}
              label="Tipo"
              value={network.type || network.effectiveType || 'desconhecido'}
              color="text-orbit"
            />
            <MetricCard
              icon={<Clock className="h-4 w-4" />}
              label="Última verif."
              value={lastCheck ? lastCheck.toLocaleTimeString('pt-BR') : '—'}
              color="text-muted-foreground"
            />
          </div>

          {network.online && serverStatus?.externalIp && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">IP externo detectado</span>
                <span className="font-mono-jet text-foreground">{serverStatus.externalIp}</span>
              </div>
              {serverStatus.isp && (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-muted-foreground">Operadora / ISP</span>
                  <span className="font-mono-jet text-foreground">{serverStatus.isp}</span>
                </div>
              )}
              {serverStatus.country && (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-muted-foreground">País</span>
                  <span className="font-mono-jet text-foreground">{serverStatus.country}</span>
                </div>
              )}
            </div>
          )}

          {network.saveData && (
            <div className="flex items-center gap-2 text-xs text-amber-400 mt-2 pt-2 border-t border-border/50">
              <AlertTriangle className="h-3.5 w-3.5" />
              Modo Economia de Dados ativo — algumas APIs podem ser limitadas
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-5 w-5 text-signal" />
            Capacidades do Dispositivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <CapabilityChip
              icon={<Satellite className="h-3.5 w-3.5" />}
              label="SOS via Satélite"
              active={caps.hasSatelliteSos}
              hint={caps.hasSatelliteSos ? 'Compatibilidade estimada pelo dispositivo; confirme no sistema operacional' : 'Não detectado por este navegador'}
            />
            <CapabilityChip
              icon={<Bluetooth className="h-3.5 w-3.5" />}
              label="Bluetooth Web"
              active={caps.hasBluetooth}
              hint={caps.hasBluetooth ? 'Web Bluetooth disponível no navegador' : 'Web Bluetooth não exposto pelo navegador'}
            />
            <CapabilityChip
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Geolocalização"
              active={caps.hasGeolocation}
              hint={caps.hasGeolocation ? 'API de geolocalização disponível' : 'API de geolocalização indisponível'}
            />
            <CapabilityChip
              icon={<Radio className="h-3.5 w-3.5" />}
              label="Dispositivo móvel"
              active={caps.hasCellBroadcast}
              hint={caps.hasCellBroadcast ? 'Dispositivo móvel detectado; Cell Broadcast depende do sistema e operadora' : 'Navegador não indica dispositivo móvel'}
            />
            <CapabilityChip
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Service Worker"
              active={caps.hasServiceWorker}
              hint={caps.hasServiceWorker ? 'Tecnologia de cache offline suportada' : 'Sem suporte a Service Worker'}
            />
            <CapabilityChip
              icon={<Zap className="h-3.5 w-3.5" />}
              label="Background Sync"
              active={caps.hasBackgroundSync}
              hint={caps.hasBackgroundSync ? 'Background Sync exposto pelo navegador' : 'Não suportado; recuperação online continua pelo evento online'}
            />
          </div>

          <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Plataforma</span>
              <span className="font-mono-jet text-foreground">{caps.platform}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-secondary/30 p-2.5 border border-border/30">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <div className={`font-mono-jet font-bold text-sm ${color}`}>{value}</div>
    </div>
  )
}

function CapabilityChip({ icon, label, active, hint }: { icon: React.ReactNode; label: string; active: boolean; hint: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs border ${active
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : 'bg-muted/30 border-border/30 text-muted-foreground'}`}
      title={hint}
    >
      {icon}
      <span className="font-medium truncate">{label}</span>
    </div>
  )
}
