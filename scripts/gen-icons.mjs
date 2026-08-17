import { readFileSync, writeFileSync } from 'fs'
import path from 'path'

// Use sharp if available
let sharp
try {
  sharp = (await import('sharp')).default
} catch (e) {
  console.error('sharp not available:', e.message)
  process.exit(1)
}

const root = '/home/z/my-project'
const svg512 = readFileSync(path.join(root, 'public/icon-512.svg'))

for (const size of [192, 512]) {
  const png = await sharp(svg512, { density: 300 })
    .resize(size, size)
    .png()
    .toBuffer()
  writeFileSync(path.join(root, `public/icon-${size}.png`), png)
  console.log(`Generated public/icon-${size}.png (${png.length} bytes)`)
}

// Apple touch icon (180x180)
const apple = await sharp(svg512, { density: 300 })
  .resize(180, 180)
  .png()
  .toBuffer()
writeFileSync(path.join(root, 'public/apple-touch-icon.png'), apple)
console.log('Generated public/apple-touch-icon.png')

// Favicon
const favicon = await sharp(svg512, { density: 300 })
  .resize(32, 32)
  .png()
  .toBuffer()
writeFileSync(path.join(root, 'public/favicon-32.png'), favicon)
console.log('Generated public/favicon-32.png')
