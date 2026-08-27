export const READINESS_SNAPSHOT = {
  schemaVersion: 2,
  verifiedAt: '2026-08-27',
  releaseReady: false,
  webReleaseReady: true,
  pwaInstalledReleaseReady: false,
  blockers: [
    {
      id: 'installed-pwa-real-device-acceptance',
      severity: 'pwa-only',
      summary: 'A versão web está certificada. O modo PWA instalado ainda precisa da aceitação manual ON/OFF em iOS/Safari e Android/Chrome para fechar o comportamento físico do Service Worker no aparelho.',
    },
  ],
  mitigations: [
    {
      id: 'dependency-graph-frozen',
      summary: 'bun.lock está versionado com Bun 1.3.14; Vercel e workflows de release usam frozen install.',
    },
    {
      id: 'production-web-certified',
      summary: 'Safety, Quality, Mobile V1, deploy com cooldown e Live Functional Smoke pós-deploy foram executados com sucesso antes desta lapidação final.',
    },
  ],
  trust: {
    firstAid: 'clinically-curated-static',
    survival: 'source-bounded-static',
    fauna: 'source-bounded-static',
    inmet: 'live-or-last-known-good',
    storms: 'inmet-live-alerts-plus-met-norway-model-context',
    weather: 'met-norway-live-model-or-last-known-good',
    rivers: 'sgb-sace-and-ana-official-portals',
    network: 'browser-network-api-plus-aussy-health-probe',
    eonet: 'live-or-last-known-good',
    geocode: 'live-or-last-known-good',
    fireHotspots: 'inpe-live-or-last-known-good',
    earthquakes: 'usgs-live-or-last-known-good',
    satelliteOrbit: 'celestrak-omm-sgp4-live-or-last-known-good',
    satelliteCatalog: 'unverified-static',
    brazilD2DRegulation: 'verified-static-2026-08-18',
    cemaden: 'official-portal-only',
    osmTiles: 'passive-viewed-tile-cache',
    serviceWorkerSafetyEpoch: 'aussy-v9',
  },
  validation: {
    dependencyLock: 'bun-1.3.14-frozen',
    zeroDependencySafetySuite: 'required-by-ci',
    serviceWorkerV9Contract: 'required-by-ci',
    typeCheck: 'required-by-quality-gate',
    lint: 'required-by-quality-gate',
    nextBuild: 'required-by-quality-gate',
    browserAutomation: 'mobile-v1-required-on-main',
    liveDataSmoke: 'post-deploy-production-smoke-required',
    installedPwaAcceptance: 'manual-real-device-pending',
  },
} as const

export type ReadinessSnapshot = typeof READINESS_SNAPSHOT
