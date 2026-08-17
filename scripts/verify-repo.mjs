import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const ignoredDirs = new Set(['.git', '.next', 'node_modules', 'coverage', '.vercel'])
const failures = []

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue
    const absolute = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(absolute)
      continue
    }
    if (entry.name.endsWith(':Zone.Identifier')) {
      failures.push(`Windows metadata tracked: ${relative(root, absolute)}`)
    }
  }
}

async function assertFileContains(path, fragments) {
  const content = await readFile(join(root, path), 'utf8')
  for (const fragment of fragments) {
    if (!content.includes(fragment)) failures.push(`${path} missing invariant: ${fragment}`)
  }
  return content
}

await walk(root)

await assertFileContains('public/sw.js', [
  "const OSM_TILES_CACHE = 'aussy-v2-osm-tiles'",
  'k !== OSM_TILES_CACHE',
])

await assertFileContains('src/app/api/coverage/towers/route.ts', [
  "towers: 'synthetic'",
  "wifiPoints: 'sample'",
  'não devem ser usadas para decisão operacional',
])

await assertFileContains('src/components/aussy/coverage-map.tsx', [
  'quality="synthetic"',
  'quality="sample"',
  'não devem orientar deslocamento, segurança ou decisão operacional',
])

const coverageData = await assertFileContains('src/lib/data/coverage.ts', [
  "const UNVERIFIED = 'não verificado nesta build'",
  "referenceStatus: 'unverified-static'",
  'verificar em fonte oficial antes de uso operacional',
])

for (const forbidden of ['~52.000 torres', '~48.000 torres', '~45.000 torres', "marketShare: '32%'", "marketShare: '30%'", "marketShare: '28%'"]) {
  if (coverageData.includes(forbidden)) failures.push(`Coverage data contains unversioned statistic: ${forbidden}`)
}

const regulatory = await assertFileContains('src/components/aussy/regulatory-info.tsx', [
  'quality="static"',
  'confirme diretamente nas fontes oficiais',
])

for (const forbidden of ['Previsão realista:', 'prováveis pioneiros']) {
  if (regulatory.includes(forbidden)) failures.push(`Regulatory UI contains unverified forecast language: ${forbidden}`)
}

if (failures.length) {
  console.error('\nAussy repository verification failed:\n')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Aussy repository invariants OK')
