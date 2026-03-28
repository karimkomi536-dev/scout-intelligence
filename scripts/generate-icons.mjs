/**
 * generate-icons.mjs — Convert public/icon.svg → PNG icon files for PWA
 *
 * Usage:  node scripts/generate-icons.mjs
 * Requires: npm install sharp --save-dev
 */

import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = resolve(__dirname, '..')
const svg       = readFileSync(resolve(root, 'public/icon.svg'))

const icons = [
  { file: 'public/icon-192.png',          size: 192 },
  { file: 'public/icon-512.png',          size: 512 },
  { file: 'public/apple-touch-icon.png',  size: 180 },
]

for (const { file, size } of icons) {
  const dest = resolve(root, file)
  await sharp(svg).resize(size, size).png().toFile(dest)
  console.log(`Generated ${file} (${size}x${size})`)
}

console.log('Icons generated ✓')
