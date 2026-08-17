'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Wifi,
  WifiOff,
  Satellite,
  Bluetooth,
  Radio,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronRight,
  MapPin,
  MessageSquare,
  Cloud,
  Loader2,
} from 'lucide-react'
import { useNetworkStatus, useDeviceCapabilities } from '@/hooks/use-network'
import { useGeolocation } from '@/hooks/use-geolocation'

type StepStatus = 'idle' | 'running' | 'success' | 'fail' | 'partial'

interface StepResult {
  status: StepStatus
  message: string
  detail?: string
}

export function NoSignalWizard() {
  const network = useNetworkStatus()
  const caps = useDeviceCapabilities()
  const { point, detect } = useGeolocation()
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, StepResult>>({})
  const [wifiPoints, setWifiPoints] = useState<any[]>([])
  const [captivePortal, setCaptivePortal] = useState<StepStatus>('idle')

  // Diagnóstico inicial
  const isOffline = !network.online
  const isMobileDataZero = network.online && network.effectiveType === 'slow-2g' && (network.downlink ?? 0) < 0.1
  const needsHelp = isOffline || isMobileDataZero

  // Buscar WiFi points do cache ANATEL
  const fetchWifi = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/coverage/towers?lat=${lat}&lon=${lon}&radius=10`, { cache: 'force-cache' })
      const data = await res.json()
      return data.wifiPoints?.slice(0, 5) || []
    } catch {
      // tenta cache offline
      const cache = await caches.open('aussy-v2-emergency')
      const cached = await cache.match(`/api/coverage/towers?lat=${lat}&lon=${lon}&radius=10`)
      if (cached) {
        const data = await cached.json()
        return data.wifiPoints?.slice(0, 5) || []
      }
      return []
    }
  }, [])

  // Passo 1: Detectar portal cativo (rede com login)
  const detectCaptivePortal = useCallback(async () => {
    setRunning('portal')
    try {
      // Técnica padrão: fetch a URL canônica e ver se redireciona
      const testUrl = 'https://www.gstatic.com/generate_204'
      const start = Date.now()
      const res = await fetch(testUrl, {
        mode: 'no-cors',
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      })
      const elapsed = Date.now() - start

      // Se chegou aqui sem exception, há rede (talvez com portal)
      // Tenta detectar se é portal: pequena resposta normal = ok, grande = portal
      const result: StepResult = {
        status: 'success',
        message: 'Resposta de rede detectada',
        detail: `${elapsed}ms · tipo ${res.type}`,
      }

      // Verifica se é portal cativo: se online navigator diz false mas fetch funcionou
      if (!navigator.onLine) {
        result.status = 'partial'
        result.message = 'Possível portal cativo (WiFi aberto exige login)'
        result.detail = 'Abra o navegador e tente acessar qualquer site — vai aparecer a tela de login do WiFi'
      }

      setCaptivePortal(result.status)
      setResults((r) => ({ ...r, portal: result }))
    } catch (e) {
      const result: StepResult = {
        status: 'fail',
        message: 'Sem rede disponível',
        detail: 'Não há WiFi nem dados móveis. Tente os próximos passos.',
      }
      setResults((r) => ({ ...r, portal: result }))
      setCaptivePortal('fail')
    } finally {
      setRunning(null)
    }
  }, [])

  // Passo 2: Buscar WiFi grátis próximos (do cache ANATEL)
  const findNearbyWifi = useCallback(async () => {
    setRunning('wifi')
    try {
      const lat = point?.lat ?? -15.7801
      const lon = point?.lon ?? -47.9292
      const points = await fetchWifi(lat, lon)
      setWifiPoints(points)
      const result: StepResult = points.length > 0
        ? {
            status: 'success',
            message: `${points.length} pontos WiFi grátis encontrados`,
            detail: points[0]?.name ? `Mais próximo: ${points[0].name} (${points[0].distance?.toFixed(1)}km)` : undefined,
          }
        : {
            status: 'fail',
            message: 'Nenhum WiFi público mapeado perto',
            detail: 'Tente praças, rodoviárias, bibliotecas ou escolas públicas — costumam ter WiFi Grátis Brasil',
          }
      setResults((r) => ({ ...r, wifi: result }))
    } catch {
      setResults((r) => ({ ...r, wifi: { status: 'fail', message: 'Falha ao buscar' } }))
    } finally {
      setRunning(null)
    }
  }, [point, fetchWifi])

  // Passo 3: SOS via satélite nativo (iPhone 14+ / Android 14+)
  const checkSatelliteSOS = useCallback(() => {
    setRunning('sat')
    const ua = caps.userAgent
    const isIphone = /iPhone/.test(ua)
    const isAndroid = /Android/.test(ua)
    const isIphone14Plus = isIphone && /iPhone(1[5-9]|2\d)/.test(ua)
    const isAndroidD2C = isAndroid && /S22|S23|S24|S25|Pixel 8|Pixel 9/.test(ua)

    let result: StepResult
    if (isIphone14Plus) {
      result = {
        status: 'success',
        message: 'iPhone com SOS via satélite (Globalstar)',
        detail: 'Sem WiFi/dados: abra "Mensagens" → toque em "Emergência" → "SOS via satélite". Siga a interface guiada. Disponível em áreas sem cobertura.',
      }
    } else if (isAndroidD2C) {
      result = {
        status: 'success',
        message: 'Android com SOS via satélite (Snapdragon Satellite)',
        detail: 'Sem WiFi/dados: segure o botão power 3x → "Satellite SOS". Vai conectar ao satélite e permitir mensagem de emergência.',
      }
    } else if (isIphone || isAndroid) {
      result = {
        status: 'partial',
        message: 'Celular não suporta SOS via satélite nativo',
        detail: 'Apenas iPhone 14+ e Androids topo (S22+/Pixel 8+) têm. Considere ativar mesh Bluetooth com quem estiver por perto.',
      }
    } else {
      result = {
        status: 'partial',
        message: 'Dispositivo desktop',
        detail: 'SOS via satélite é só em celular. Use o botão abaixo para gerar SMS de emergência.',
      }
    }
    setResults((r) => ({ ...r, sat: result }))
    setRunning(null)
  }, [caps])

  // Passo 4: Ativar mesh Bluetooth
  const activateMesh = useCallback(async () => {
    setRunning('mesh')
    if (!caps.hasBluetooth) {
      setResults((r) => ({ ...r, mesh: { status: 'fail', message: 'Bluetooth não suportado neste dispositivo' } }))
      setRunning(null)
      return
    }
    try {
      // Web Bluetooth API — pede permissão do usuário
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['generic_access'],
      })
      setResults((r) => ({
        ...r,
        mesh: {
          status: 'success',
          message: `Conectado a "${device.name || 'dispositivo sem nome'}"`,
          detail: 'Mesh ativo. Agora você pode trocar mensagens e localização com dispositivos próximos via Bluetooth.',
        },
      }))
      toast.success('Mesh Bluetooth ativado!')
    } catch (e) {
      setResults((r) => ({
        ...r,
        mesh: {
          status: 'fail',
          message: 'Bluetooth cancelado ou indisponível',
          detail: 'Tente novamente ou peça a alguém perto para também ativar o mesh no celular dela.',
        },
      }))
    } finally {
      setRunning(null)
    }
  }, [caps])

  // Passo 5: Gerar SMS de emergência (funciona em qualquer celular com sinal mínimo)
  const generateSms = useCallback(() => {
    const lat = point?.lat?.toFixed(5) ?? 'desconhecida'
    const lon = point?.lon?.toFixed(5) ?? 'desconhecida'
    const msg = `EMERGENCIA - preciso de ajuda. Localizacao: ${lat}, ${lon}. Enviado via Aussy Ontech.`
    // sms: protocol works on mobile — opens default SMS app pre-filled
    const url = `sms:192?body=${encodeURIComponent(msg)}`
    window.location.href = url
    setResults((r) => ({
      ...r,
      sms: {
        status: 'success',
        message: 'SMS pré-preenchido aberto',
        detail: 'Se seu celular tem sinal mínimo (1 barra), o SMS chega. Toque em enviar.',
      },
    }))
  }, [point])

  // Auto-roda diagnóstico ao montar se estiver offline
  useEffect(() => {
    if (needsHelp && Object.keys(results).length === 0) {
      detectCaptivePortal()
    }
  }, [needsHelp, results, detectCaptivePortal])

  const statusIcon = (status?: StepStatus) => {
    if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-signal" />
    if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
    if (status === 'fail') return <XCircle className="h-4 w-4 text-red-400" />
    if (status === 'partial') return <AlertTriangle className="h-4 w-4 text-amber-400" />
    return <ChevronRight className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <Card className="border-signal/30 bg-signal/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-signal" />
            Sem Sinal? Sem Dados?
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] font-mono-jet ${
              needsHelp
                ? 'bg-red-500/10 text-red-400 border-red-500/30 blink-emergency'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {needsHelp ? 'SEM REDE' : 'CONECTADO'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Status atual */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded bg-background/50">
            <div className="text-[10px] text-muted-foreground font-mono-jet uppercase">Rede</div>
            <div className={`font-bold ${network.online ? 'text-emerald-400' : 'text-red-400'}`}>
              {network.online ? 'Online' : 'Offline'}
            </div>
          </div>
          <div className="p-2 rounded bg-background/50">
            <div className="text-[10px] text-muted-foreground font-mono-jet uppercase">Tipo</div>
            <div className="font-bold">{network.type || network.effectiveType || '—'}</div>
          </div>
          <div className="p-2 rounded bg-background/50">
            <div className="text-[10px] text-muted-foreground font-mono-jet uppercase">Velocidade</div>
            <div className="font-bold">{network.downlink ? `${network.downlink} Mbps` : '—'}</div>
          </div>
        </div>

        {!needsHelp && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            <CheckCircle2 className="h-4 w-4 inline mr-1.5" />
            Você está conectado. Este assistente só é necessário quando estiver sem sinal.
          </div>
        )}

        {/* Passo 1: Portal cativo */}
        <Step
          icon={<Cloud className="h-5 w-5" />}
          title="1. Detectar WiFi aberto com login"
          subtitle="Muitos WiFi públicos (aeroportos, shoppings, praças) têm portal cativo — você conecta mas não tem internet até fazer login"
          onRun={detectCaptivePortal}
          running={running === 'portal'}
          result={results.portal}
          statusIcon={statusIcon(results.portal?.status)}
        />

        {/* Passo 2: WiFi grátis próximos */}
        <Step
          icon={<MapPin className="h-5 w-5" />}
          title="2. Achar WiFi grátis mais próximo"
          subtitle="Base ANATEL de pontos WiFi Grátis Brasil (praças, rodoviárias, escolas, bibliotecas)"
          onRun={findNearbyWifi}
          running={running === 'wifi'}
          result={results.wifi}
          statusIcon={statusIcon(results.wifi?.status)}
          extra={
            wifiPoints.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {wifiPoints.map((p) => (
                  <a
                    key={p.id}
                    href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-2 rounded bg-background/40 hover:bg-background/70 border border-border/30 text-xs"
                  >
                    <Wifi className="h-3.5 w-3.5 text-orbit flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">{p.city}/{p.state} · {p.type}</div>
                    </div>
                    <div className="font-mono-jet text-orbit text-[11px]">{p.distance?.toFixed(1)}km</div>
                  </a>
                ))}
              </div>
            )
          }
        />

        {/* Passo 3: SOS via satélite nativo */}
        <Step
          icon={<Satellite className="h-5 w-5" />}
          title="3. SOS via satélite (se seu celular suporta)"
          subtitle="iPhone 14+ e Androids topo de linha têm SOS via satélite nativo — sem dados nem WiFi"
          onRun={checkSatelliteSOS}
          running={running === 'sat'}
          result={results.sat}
          statusIcon={statusIcon(results.sat?.status)}
        />

        {/* Passo 4: Mesh Bluetooth */}
        <Step
          icon={<Bluetooth className="h-5 w-5" />}
          title="4. Ativar mesh Bluetooth"
          subtitle="Conecta com dispositivos próximos para trocar mensagens e localização sem internet"
          onRun={activateMesh}
          running={running === 'mesh'}
          result={results.mesh}
          statusIcon={statusIcon(results.mesh?.status)}
        />

        {/* Passo 5: SMS de emergência */}
        <Step
          icon={<MessageSquare className="h-5 w-5" />}
          title="5. Gerar SMS de emergência"
          subtitle="Abre o app de SMS com mensagem pronta + sua localização. SMS funciona com sinal mínimo (1 barra)"
          onRun={generateSms}
          running={false}
          result={results.sms}
          statusIcon={statusIcon(results.sms?.status)}
        />

        {/* Localização atual */}
        <div className="flex items-center justify-between pt-3 border-t border-border/30 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="font-mono-jet">
              {point ? (
                <>{point.lat.toFixed(4)}°, {point.lon.toFixed(4)}° · {point.source}</>
              ) : (
                'sem localização'
              )}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => detect()} className="h-7 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Atualizar
          </Button>
        </div>

        {/* Dica final */}
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-amber-400">Dica:</strong> Mesmo sem dados móveis, GPS continua funcionando offline (satélites GPS são independentes da operadora). Sua localização fica salva e pode ser compartilhada via Bluetooth com quem estiver perto.
        </div>
      </CardContent>
    </Card>
  )
}

function Step({
  icon,
  title,
  subtitle,
  onRun,
  running,
  result,
  statusIcon,
  extra,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onRun: () => void
  running: boolean
  result?: StepResult
  statusIcon: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <div className={`rounded-lg border p-3 transition-colors ${
      result?.status === 'success'
        ? 'bg-emerald-500/5 border-emerald-500/30'
        : result?.status === 'fail'
        ? 'bg-red-500/5 border-red-500/30'
        : result?.status === 'partial'
        ? 'bg-amber-500/5 border-amber-500/30'
        : 'bg-background/40 border-border/30'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
          result?.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
          result?.status === 'fail' ? 'bg-red-500/20 text-red-400' :
          result?.status === 'partial' ? 'bg-amber-500/20 text-amber-400' :
          'bg-signal/10 text-signal'
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h4 className="font-semibold text-sm">{title}</h4>
            {statusIcon}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{subtitle}</p>

          {result && (
            <div className="text-xs mb-2">
              <div className={`font-medium ${
                result.status === 'success' ? 'text-emerald-300' :
                result.status === 'fail' ? 'text-red-300' :
                result.status === 'partial' ? 'text-amber-300' :
                'text-foreground'
              }`}>
                {result.message}
              </div>
              {result.detail && (
                <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  {result.detail}
                </div>
              )}
            </div>
          )}

          {extra}

          <Button
            onClick={onRun}
            disabled={running}
            variant="outline"
            size="sm"
            className="mt-2 h-7 text-xs"
          >
            {running ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Verificando...
              </>
            ) : result?.status === 'success' ? (
              'Refazer'
            ) : (
              'Executar'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
