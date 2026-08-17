'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const LoadingFallback = ({ label }: { label: string }) => (
  <div className="border border-border/40 rounded-xl p-4 space-y-3">
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-2/3" />
    <div className="grid grid-cols-2 gap-2 mt-3">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
    <p className="text-[10px] text-muted-foreground text-center">{label}…</p>
  </div>
)

// Componentes pesados carregados sob demanda (lazy)
// Cada um só é baixado quando o usuário abre a aba correspondente
export const LazySatelliteTracker = dynamic(
  () => import('@/components/aussy/satellite-tracker').then((m) => m.SatelliteTracker),
  { ssr: false, loading: () => <LoadingFallback label="Carregando satélites" /> }
)

export const LazyConstellationInfo = dynamic(
  () => import('@/components/aussy/satellite-tracker').then((m) => m.ConstellationInfo),
  { ssr: false, loading: () => <LoadingFallback label="Carregando constelações" /> }
)

export const LazyOfflineMap = dynamic(
  () => import('@/components/aussy/offline-map').then((m) => m.OfflineMap),
  { ssr: false, loading: () => <LoadingFallback label="Carregando mapa" /> }
)

export const LazyCoverageMap = dynamic(
  () => import('@/components/aussy/coverage-map').then((m) => m.CoverageMap),
  { ssr: false, loading: () => <LoadingFallback label="Carregando cobertura" /> }
)

export const LazyCompassAltimeter = dynamic(
  () => import('@/components/aussy/compass-altimeter').then((m) => m.CompassAltimeter),
  { ssr: false, loading: () => <LoadingFallback label="Calibrando bússola" /> }
)

export const LazyCemadenAlerts = dynamic(
  () => import('@/components/aussy/cemaden-alerts').then((m) => m.CemadenAlerts),
  { ssr: false, loading: () => <LoadingFallback label="Buscando CEMADEN" /> }
)

export const LazyFaunaProtocols = dynamic(
  () => import('@/components/aussy/fauna-protocols').then((m) => m.FaunaProtocols),
  { ssr: false, loading: () => <LoadingFallback label="Carregando protocolos" /> }
)

export const LazyMultilingualPhrases = dynamic(
  () => import('@/components/aussy/multilingual-phrases').then((m) => m.MultilingualPhrases),
  { ssr: false, loading: () => <LoadingFallback label="Carregando frases" /> }
)

export const LazySurvivalTools = dynamic(
  () => import('@/components/aussy/survival-tools').then((m) => m.SurvivalTools),
  { ssr: false, loading: () => <LoadingFallback label="Carregando ferramentas" /> }
)

export const LazyEmergencyContacts = dynamic(
  () => import('@/components/aussy/emergency-contacts').then((m) => m.EmergencyContacts),
  { ssr: false, loading: () => <LoadingFallback label="Carregando contatos" /> }
)

export const LazyMedicalCardQR = dynamic(
  () => import('@/components/aussy/medical-card').then((m) => m.MedicalCardQR),
  { ssr: false, loading: () => <LoadingFallback label="Carregando ficha médica" /> }
)

export const LazyGpsTrail = dynamic(
  () => import('@/components/aussy/gps-trail').then((m) => m.GpsTrail),
  { ssr: false, loading: () => <LoadingFallback label="Carregando trilha" /> }
)

export const LazyMeshNetwork = dynamic(
  () => import('@/components/aussy/mesh-network').then((m) => m.MeshNetwork),
  { ssr: false, loading: () => <LoadingFallback label="Carregando mesh" /> }
)

export const LazyEarthquakesCard = dynamic(
  () => import('@/components/aussy/earthquakes-card').then((m) => m.EarthquakesCard),
  { ssr: false, loading: () => <LoadingFallback label="Buscando sismos" /> }
)

export const LazyEonetCard = dynamic(
  () => import('@/components/aussy/eonet-card').then((m) => m.EonetCard),
  { ssr: false, loading: () => <LoadingFallback label="Buscando eventos NASA" /> }
)

export const LazyWeatherForecast = dynamic(
  () => import('@/components/aussy/weather-forecast').then((m) => m.WeatherForecast),
  { ssr: false, loading: () => <LoadingFallback label="Carregando previsão" /> }
)

export const LazyInmetStations = dynamic(
  () => import('@/components/aussy/inmet-stations').then((m) => m.InmetStations),
  { ssr: false, loading: () => <LoadingFallback label="Buscando estações INMET" /> }
)

export const LazyAnaRios = dynamic(
  () => import('@/components/aussy/ana-rios').then((m) => m.AnaRios),
  { ssr: false, loading: () => <LoadingFallback label="Buscando níveis de rios" /> }
)

export const LazyCptecSatellite = dynamic(
  () => import('@/components/aussy/cptec-satellite').then((m) => m.CptecSatellite),
  { ssr: false, loading: () => <LoadingFallback label="Carregando satélite GOES-16" /> }
)

export const LazyDefesaCivil = dynamic(
  () => import('@/components/aussy/defesa-civil').then((m) => m.DefesaCivil),
  { ssr: false, loading: () => <LoadingFallback label="Carregando Defesa Civil" /> }
)
