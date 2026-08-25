export const READINESS_SNAPSHOT = {
  schemaVersion: 1,
  verifiedAt: '2026-08-25',
  releaseReady: false,
  blockers: [
    {
      id: 'functional-audit-pr-pending',
      severity: 'blocker',
      summary: 'A auditoria funcional da PR #56 ainda precisa concluir todos os gates do mesmo head antes do merge.',
    },
  ],
  mitigations: [
    {
      id: 'dependency-graph-frozen',
      summary: 'bun.lock foi gerado pelo próprio Aussy com Bun 1.3.14; Vercel e workflows de release usam frozen install.',
    },
  ],
  trust: {
    firstAid: 'clinically-curated-static',
    survival: 'source-bounded-static',
    fauna: 'source-bounded-static',
    inmet: 'live-or-last-known-good',
    weather: 'met-norway-live-model-or-last-known-good',
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
    liveDataSmoke: 'required-by-live-functional-smoke',
    browserPwaAcceptance: 'required-by-mobile-v1',
  },
} as const

export type ReadinessSnapshot = typeof READINESS_SNAPSHOT
