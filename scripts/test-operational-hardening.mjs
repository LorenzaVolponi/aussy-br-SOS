import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')
const checks = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
  checks.push(message)
}

const nextConfig = read('next.config.ts')
const quality = read('.github/workflows/quality.yml')
const mobile = read('.github/workflows/mobile-v1.yml')
const release = read('.github/workflows/release-readiness.yml')
const deploy = read('.github/workflows/vercel-deploy.yml')
const recovery = read('.github/workflows/vercel-deploy-recovery.yml')
const rescue = read('.github/workflows/vercel-rescue-live.yml')
const mobileSpec = read('tests/mobile-v1.spec.ts')

assert(nextConfig.includes("source: '/api/:path*'"), 'API surface has dedicated headers')
assert(nextConfig.includes("X-Robots-Tag"), 'API surface blocks search indexing')
assert(nextConfig.includes("Cross-Origin-Resource-Policy"), 'API surface has cross-origin resource policy')
assert(nextConfig.includes('camera=(self)'), 'Physical torch keeps same-origin camera permission')
assert(!nextConfig.includes('camera=()'), 'Physical torch cannot be disabled by Permissions-Policy')

assert(quality.includes('cancel-in-progress: true'), 'Quality gate cancels superseded runs')
assert(mobile.includes('cancel-in-progress: true'), 'Mobile gate cancels superseded runs')
assert(release.includes('cancel-in-progress: true'), 'Release readiness is serialized')
assert(quality.includes('actions/checkout@v7'), 'Quality gate uses current checkout major')
assert(mobile.includes('actions/checkout@v7'), 'Mobile gate uses current checkout major')
assert(mobile.includes('actions/upload-artifact@v7'), 'Mobile artifacts use current upload major')
assert(release.includes('actions/checkout@v7'), 'Release readiness uses current checkout major')

for (const [name, workflow] of [
  ['deploy', deploy],
  ['recovery', recovery],
  ['rescue', rescue],
]) {
  assert(workflow.includes('vercel-production-global-lock'), `${name} shares the global Vercel deployment lock`)
  assert(workflow.includes("VERCEL_DEPLOY_COOLDOWN_MINUTES: '60'"), `${name} preserves the 60-minute Vercel cooldown`)
}

assert(deploy.includes('VERCEL_RATE_LIMIT_BACKOFF_SECONDS'), 'Production deploy retains rate-limit backoff')
assert(recovery.includes('Check real production health first'), 'Recovery checks real production health before redeploying')
assert(mobileSpec.includes("getByText('-25.428400, -49.273300', { exact: true })"), 'SOS mobile acceptance uses an unambiguous coordinate assertion')

console.log(`Operational hardening OK (${checks.length} contracts)`)
