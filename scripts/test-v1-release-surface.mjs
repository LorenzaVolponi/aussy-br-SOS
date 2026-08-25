import { readFile } from 'node:fs/promises'
import process from 'node:process'

const failures = []

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

function requireFragments(path, content, fragments) {
  for (const fragment of fragments) {
    if (!content.includes(fragment)) failures.push(`${path} missing V1 invariant: ${fragment}`)
  }
}

function forbidFragments(path, content, fragments) {
  for (const fragment of fragments) {
    if (content.includes(fragment)) failures.push(`${path} contains forbidden V1 pattern: ${fragment}`)
  }
}

const packagePath = 'package.json'
const pagePath = 'src/app/page.tsx'
const quickSharePath = 'src/components/aussy/quick-share.tsx'
const qrPath = 'src/components/aussy/qr-location.tsx'
const geoPath = 'src/hooks/use-geolocation.ts'
const orientationPath = 'src/hooks/use-orientation.ts'
const coveragePath = 'src/app/api/coverage/towers/route.ts'
const telemetryPath = 'src/app/api/telemetry/route.ts'
const observabilityPath = 'src/components/aussy/client-observability.tsx'
const mobileWorkflowPath = '.github/workflows/mobile-v1.yml'
const lintPath = 'eslint.config.mjs'

const packageJson = await read(packagePath)
requireFragments(packagePath, packageJson, [
  '"packageManager": "bun@1.3.14"',
  '"qrcode": "^1.5.4"',
  '"@playwright/test": "^1.55.0"',
  '"test:mobile": "playwright test tests/mobile-v1.spec.ts"',
  '"lint:critical"',
  '"type-check": "tsc --noEmit"',
  '"build": "next build --webpack"',
])

const page = await read(pagePath)
requireFragments(pagePath, page, [
  'AUSSY · SISTEMA DE SEGURANÇA',
  'ESTÁ COM VOCÊ',
  'Toque para emergência',
  'aria-label="Abrir emergência SOS"',
  'QR localização',
  'Aguardando localização válida',
  "<EmergencySOS observerLat={point?.lat} observerLon={point?.lon} />",
  '<QuickShare initialPoint={point} />',
  '<QrLocation open={qrLocOpen} onOpenChange={setQrLocOpen} initialPoint={point} />',
  'AIX8C - Uma tecnologia do grupo volponi.tech !',
  'Não substitui serviços oficiais de emergência',
])
forbidFragments(pagePath, page, [
  'point?.lat ?? 0', 'point?.lon ?? 0', "point?.lat ?? -15.7801", "point?.lon ?? -47.9292",
  '98.7%', '4.897', '+2.4M', '100% offline',
])

const quickShare = await read(quickSharePath)
requireFragments(quickSharePath, quickShare, [
  'const nextPoint = await detect(true)', 'if (!nextPoint)', "point.source === 'cached'",
  "'última posição conhecida'", 'Esta é a última posição conhecida, não uma leitura GPS atual',
  "window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')",
  'bottom-[calc(env(safe-area-inset-bottom)+4.75rem)]', 'landscape:bottom-5 md:bottom-5',
])
forbidFragments(quickSharePath, quickShare, [
  "import { Share2, MessageCircle, Copy, X, MapPin, Phone", "point.source === 'ip' ? 'IP aprox.' : 'manual'", '100% funcional offline',
])

const qr = await read(qrPath)
requireFragments(qrPath, qr, [
  "import QRCode from 'qrcode'", 'const nextPoint = await detect(true)', 'if (!nextPoint)',
  "currentPoint?.source === 'cached'", 'Última posição conhecida. Atualize o GPS sempre que possível',
  'Abrir o link do Google Maps pode exigir internet', "error instanceof DOMException && error.name === 'AbortError'",
])
forbidFragments(qrPath, qr, ['Download, X, Share2', 'abre o Maps — funciona sem internet', "currentPoint.source === 'ip' ? 'IP' : 'MANUAL'", 'await detect(true)\n    } catch'])

const geo = await read(geoPath)
requireFragments(geoPath, geo, ['function isValidCoordinate', "source: 'cached'", 'A última posição conhecida ainda é preferível a um default arbitrário', "throw gpsError || new Error('Não foi possível determinar a localização')"])
forbidFragments(geoPath, geo, ['-15.7801', '-47.9292'])

const orientation = await read(orientationPath)
requireFragments(orientationPath, orientation, ["typeof ResizeObserver !== 'undefined'", "window.addEventListener('orientationchange', handleOrientationChange)", "window.removeEventListener('orientationchange', handleOrientationChange)", 'if (orientationTimer) clearTimeout(orientationTimer)'])
forbidFragments(orientationPath, orientation, ["window.addEventListener('orientationchange', () =>"])

const coverage = await read(coveragePath)
requireFragments(coveragePath, coverage, ["towers: 'unavailable'", 'O Aussy não fabrica posições de ERB', "error: 'invalid-location'"])
forbidFragments(coveragePath, coverage, ['Math.random()', 'sim-erb-', "towers: 'synthetic'"])

const telemetry = await read(telemetryPath)
requireFragments(telemetryPath, telemetry, ["ALLOWED_KINDS", "crypto.randomUUID()", "service: 'aussy'", "client-telemetry", "release:"])
forbidFragments(telemetryPath, telemetry, ['latitude', 'longitude', 'externalIp'])

const observability = await read(observabilityPath)
requireFragments(observabilityPath, observability, ["window.addEventListener('error'", "window.addEventListener('unhandledrejection'", "window.removeEventListener('error'", "window.removeEventListener('unhandledrejection'"])

const mobileWorkflow = await read(mobileWorkflowPath)
requireFragments(mobileWorkflowPath, mobileWorkflow, ['chromium webkit', 'bun run test:mobile', 'mobile-v1-playwright-report'])

const lint = await read(lintPath)
requireFragments(lintPath, lint, ['const criticalFiles', 'reportUnusedDisableDirectives', '"no-debugger": "error"', '"no-unreachable": "error"', '"@typescript-eslint/no-unused-vars": ["error"'])
forbidFragments(lintPath, lint, ['"@typescript-eslint/no-unused-disable-directive"'])

if (failures.length) {
  console.error('\nV1 release surface gate failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('V1 release surface OK — safety, observability, mobile browser matrix, strict critical lint and trust contracts are protected')
