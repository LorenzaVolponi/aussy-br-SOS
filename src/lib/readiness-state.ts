export const READINESS_SNAPSHOT = {
  schemaVersion: 1,
  verifiedAt: '2026-08-18',
  releaseReady: false,
  blockers: [
    {
      id: 'dependency-lock-missing',
      severity: 'blocker',
      summary: 'bun.lock ainda não existe; a resolução de dependências não está congelada.',
      trackingIssue: 4,
    },
    {
      id: 'full-build-not-executed',
      severity: 'blocker',
      summary: 'type-check, lint e next build ainda não foram executados em runner funcional após o hardening.',
      trackingIssue: 4,
    },
  ],
  mitigations: [],
  trust: {
    firstAid: 'clinically-curated-static',
    survival: 'source-bounded-static',
    fauna: 'source-bounded-static',
    inmet: 'live-or-last-known-good',
    eonet: 'live-or-last-known-good',
    geocode: 'live-or-last-known-good',
    satelliteTle: 'live-or-last-known-good-approx-position',
    satelliteCatalog: 'unverified-static',
    brazilD2DRegulation: 'verified-static-2026-08-18',
    cemaden: 'official-portal-only',
    osmTiles: 'passive-viewed-tile-cache',
    serviceWorkerSafetyEpoch: 'aussy-v9',
  },
  validation: {
    zeroDependencySafetySuite: 'implemented-not-run-on-functional-github-runner',
    serviceWorkerV9Contract: 'implemented-not-run-on-functional-github-runner',
    typeCheck: 'not-run-after-hardening',
    lint: 'not-run-after-hardening',
    nextBuild: 'not-run-after-hardening',
    browserPwaAcceptance: 'not-run-after-hardening',
  },
} as const

export type ReadinessSnapshot = typeof READINESS_SNAPSHOT
