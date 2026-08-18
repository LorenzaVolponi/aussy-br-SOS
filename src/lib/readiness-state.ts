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
    {
      id: 'service-worker-safety-epoch-v8',
      severity: 'blocker',
      summary: 'O Service Worker ainda usa o epoch aussy-v8 após reescritas safety-critical; instalações totalmente offline podem manter conteúdo anterior.',
      trackingIssue: 26,
    },
  ],
  mitigations: [
    {
      id: 'cemaden-undocumented-api-blocked',
      status: 'temporary-safety-block',
      summary: 'A automação CEMADEN legada está bloqueada por boundary 503/no-store até migração para contrato oficial.',
      trackingIssue: 23,
    },
  ],
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
    cemaden: 'automation-blocked-official-portals-only',
    osmTiles: 'passive-viewed-tile-cache',
  },
  validation: {
    zeroDependencySafetySuite: 'implemented-not-run-on-functional-github-runner',
    typeCheck: 'not-run-after-hardening',
    lint: 'not-run-after-hardening',
    nextBuild: 'not-run-after-hardening',
    browserPwaAcceptance: 'not-run-after-hardening',
  },
} as const

export type ReadinessSnapshot = typeof READINESS_SNAPSHOT
