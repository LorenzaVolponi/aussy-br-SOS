'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    fetch('/api/network/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setServerStatus)
      .catch(() => setServerStatus(null))
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
      {/* Status principal */}
      <Card className="glass-card border-signal/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              {network.online ? (
                <Wifi className="h-5 w-5 text-signal" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-400 blink-emergency" />
              )}
              Status da Conexão
            </CardTitle>
            <Badge
              variant="outline"
              className={
                network.online
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/10 text-red-400 border-red-500/30 blink-emergency'
              }
            >
              {network.online ? 'ONLINE' : 'OFFLINE'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Qualidade visual */}
          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-xs text-muted-foreground font-mono-jet uppercase tracking-wider">
                Qualidade do link
              </span>
              <span className={`font-mono-jet font-bold text-lg ${qualityColor}`}>
                {qualityLabel}
              </span>
            </div>
            <Progress value={quality} className="h-2" />
          </div>

          {/* Métricas em grid */}
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

          {/* IP externo detectado */}
          {serverStatus?.externalIp && (
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

      {/* Capacidades do dispositivo */}
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
              hint={caps.hasSatelliteSos ? 'Dispositivo compatível' : 'Não suportado neste dispositivo'}
            />
            <CapabilityChip
              icon={<Bluetooth className="h-3.5 w-3.5" />}
              label="Bluetooth Mesh"
              active={caps.hasBluetooth}
              hint={caps.hasBluetooth ? 'Web Bluetooth disponível' : 'Bluetooth não detectado'}
            />
            <CapabilityChip
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="GPS"
              active={caps.hasGeolocation}
              hint={caps.hasGeolocation ? 'Geolocalização disponível' : 'GPS indisponível'}
            />
            <CapabilityChip
              icon={<Radio className="h-3.5 w-3.5" />}
              label="Cell Broadcast"
              active={caps.hasCellBroadcast}
              hint={caps.hasCellBroadcast ? 'Recebe alertas do governo' : 'Não detectado'}
            />
            <CapabilityChip
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Service Worker"
              active={caps.hasServiceWorker}
              hint={caps.hasServiceWorker ? 'Funciona offline' : 'Sem suporte offline'}
            />
            <CapabilityChip
              icon={<Zap className="h-3.5 w-3.5" />}
              label="Background Sync"
              active={caps.hasBackgroundSync}
              hint={caps.hasBackgroundSync ? 'Sincroniza em background' : 'Não suportado'}
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

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
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

function CapabilityChip({
  icon,
  label,
  active,
  hint,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  hint: string
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs border ${
        active
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-muted/30 border-border/30 text-muted-foreground'
      }`}
      title={hint}
    >
      {icon}
      <span className="font-medium truncate">{label}</span>
    </div>
  )
}
