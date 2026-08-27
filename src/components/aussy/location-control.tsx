'use client'

import { useMemo } from 'react'
import {
  Clock3,
  Copy,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { GeoPermissionState, GeoPoint } from '@/hooks/use-geolocation'

interface LocationControlProps {
  point: GeoPoint | null
  loading: boolean
  permission: GeoPermissionState
  error: string | null
  onRefresh: () => void
}

function formatAccuracy(accuracy?: number) {
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy <= 0) return 'Precisão não informada'
  if (accuracy >= 1_000) return `Precisão aproximada: ±${(accuracy / 1_000).toFixed(1)} km`
  return `Precisão aproximada: ±${Math.round(accuracy)} m`
}

function formatAge(timestamp?: string) {
  if (!timestamp) return 'Horário desconhecido'

  const parsed = Date.parse(timestamp)
  if (!Number.isFinite(parsed)) return 'Horário desconhecido'

  const diff = Math.max(0, Date.now() - parsed)
  const minutes = Math.floor(diff / 60_000)

  if (minutes < 1) return 'Atualizada agora'
  if (minutes < 60) return `Atualizada há ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Atualizada há ${hours} h`

  const days = Math.floor(hours / 24)
  return `Atualizada há ${days} dia${days === 1 ? '' : 's'}`
}

const SOURCE_LABEL: Record<GeoPoint['source'], string> = {
  gps: 'GPS DO APARELHO',
  ip: 'REDE APROXIMADA',
  cached: 'POSIÇÃO SALVA',
  manual: 'COORDENADA MANUAL',
}

export function LocationControl({
  point,
  loading,
  permission,
  error,
  onRefresh,
}: LocationControlProps) {
  const ageLabel = useMemo(() => formatAge(point?.timestamp), [point?.timestamp])
  const isPreciseGps = point?.source === 'gps'
  const isFallback = point?.source === 'ip' || point?.source === 'cached'
  const permissionDenied = permission === 'denied'

  const copyCoordinates = async () => {
    if (!point) return

    const value = `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`

    try {
      await navigator.clipboard.writeText(value)
      toast.success('Coordenadas copiadas', { description: value })
    } catch {
      toast.error('Não foi possível copiar as coordenadas')
    }
  }

  return (
    <Card className="overflow-hidden border-blue-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)] dark:border-blue-900/60 dark:bg-slate-950">
      <CardContent className="p-0">
        <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
                  isPreciseGps
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}>
                  <Navigation className={`h-6 w-6 ${loading ? 'animate-pulse' : ''}`} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold tracking-[-0.02em] text-slate-950 dark:text-slate-50">
                      Localização do aparelho
                    </h2>
                    <Badge
                      variant="outline"
                      className={isPreciseGps
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'}
                    >
                      {point ? SOURCE_LABEL[point.source] : loading ? 'BUSCANDO' : 'PENDENTE'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    O AUSSY diferencia GPS real, estimativa por rede e última posição salva. Nenhuma cidade padrão é inventada.
                  </p>
                </div>
              </div>
            </div>

            {point ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                    <MapPin className="h-4 w-4" />
                    Coordenadas
                  </div>
                  <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {point.lat.toFixed(6)}, {point.lon.toFixed(6)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                    {isPreciseGps ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                    Qualidade
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatAccuracy(point.accuracy)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                    <Clock3 className="h-4 w-4" />
                    Atualização
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {ageLabel}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-100">
                {loading
                  ? 'Buscando a melhor posição disponível no GPS do aparelho…'
                  : 'Ainda não há coordenadas válidas. Toque em “Atualizar GPS” e autorize a localização.'}
              </div>
            )}

            {(error || permissionDenied || isFallback) && (
              <div className={`mt-4 flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm leading-5 ${
                permissionDenied
                  ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200'
                  : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200'
              }`}>
                <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold">
                    {permissionDenied
                      ? 'GPS bloqueado nas permissões do site'
                      : isFallback
                        ? point?.source === 'ip'
                          ? 'A posição atual é apenas uma estimativa por rede'
                          : 'A posição atual veio do armazenamento local'
                        : 'A localização precisa de atenção'}
                  </p>
                  <p className="mt-1 text-xs leading-5 opacity-90">
                    {error || (
                      permissionDenied
                        ? 'Abra as configurações do site no navegador, permita Localização e tente novamente.'
                        : point?.source === 'ip'
                          ? 'Use “Atualizar GPS” antes de depender dessas coordenadas em uma emergência.'
                          : 'Confirme o horário e atualize o GPS antes de usar a posição salva.'
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center gap-2 border-t border-slate-200 p-5 dark:border-slate-800 lg:min-w-[235px] lg:border-l lg:border-t-0">
            <Button
              type="button"
              size="lg"
              onClick={onRefresh}
              disabled={loading}
              className="min-h-[52px] w-full rounded-xl bg-[#10275a] text-white hover:bg-[#173778]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Buscando GPS…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Atualizar GPS
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => void copyCoordinates()}
              disabled={!point}
              className="min-h-12 w-full rounded-xl"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar coordenadas
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
