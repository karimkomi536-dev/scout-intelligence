import Jimp from 'jimp'

async function makeIcon(size, outPath) {
  const img = new Jimp(size, size, 0x0A0E1BFF) // fond navy
  const green = 0x00C896FF
  const s = size / 192

  // Triangle haut (partie gauche éclair)
  for (let y = Math.floor(20*s); y < Math.floor(105*s); y++) {
    const xStart = Math.floor((60 + (y - 20*s) * 0.5) * s)
    const xEnd = Math.floor(112 * s)
    for (let x = xStart; x < xEnd; x++) {
      if (x >= 0 && x < size && y >= 0 && y < size) {
        img.setPixelColor(green, x, y)
      }
    }
  }

  // Triangle bas (partie droite éclair)
  for (let y = Math.floor(87*s); y < Math.floor(172*s); y++) {
    const xStart = Math.floor(80 * s)
    const xEnd = Math.floor((140 - (y - 87*s) * 0.7) * s)
    for (let x = xStart; x < xEnd; x++) {
      if (x >= 0 && x < size && y >= 0 && y < size) {
        img.setPixelColor(green, x, y)
      }
    }
  }

  await img.writeAsync(outPath)
  console.log(`✓ ${outPath} (${size}x${size})`)
}

await makeIcon(180, 'public/apple-touch-icon.png')
await makeIcon(192, 'public/icon-192.png')
await makeIcon(512, 'public/icon-512.png')
