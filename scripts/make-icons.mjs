import { readFileSync } from 'fs'

let sharp
try {
  const s = await import('sharp')
  sharp = s.default
  console.log('Using sharp')
} catch {
  console.log('sharp absent, essaie: npm install sharp --save-dev')
  process.exit(1)
}

const svg = readFileSync('public/icon.svg')

const sizes = [
  { size: 180, file: 'public/apple-touch-icon.png' },
  { size: 192, file: 'public/icon-192.png' },
  { size: 512, file: 'public/icon-512.png' },
]

for (const { size, file } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(file)
  console.log(`✓ ${file} (${size}x${size})`)
}
