// Renders the app icon (the three color bars from icons/icon.svg) to PNG files.
// Zero dependencies: shapes are drawn with signed distance functions, 4×4 supersampled,
// and encoded with zlib.
// Usage: node scripts/build-icons.mjs

import { writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

const BACKGROUND = [0x17, 0x17, 0x1a]
const SUPERSAMPLE = 4

// Bars in the 16×16 units of icons/icon.svg: x=3, width=10, height=3, rx=0.5.
const BARS = [
  { y: 3, color: [0xf4, 0xf2, 0xec] },
  { y: 6.5, color: [0xe9, 0xa2, 0x3b] },
  { y: 10, color: [0xd6, 0x42, 0x7f] },
]

const ICONS = [
  // "any" icons have rounded corners; maskable ones are full-bleed with the glyph inside the safe zone.
  { file: 'icon-192.png', size: 192, glyphScale: 1, cornerRadius: 0.19 },
  { file: 'icon-512.png', size: 512, glyphScale: 1, cornerRadius: 0.19 },
  { file: 'icon-maskable-512.png', size: 512, glyphScale: 0.8, cornerRadius: 0 },
  { file: 'apple-touch-icon.png', size: 180, glyphScale: 0.92, cornerRadius: 0 },
]

function roundedRectDistance(x, y, cx, cy, halfWidth, halfHeight, radius) {
  const qx = Math.abs(x - cx) - halfWidth + radius
  const qy = Math.abs(y - cy) - halfHeight + radius
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
}

/** Color of the bar covering this point (16×16 units), or null. */
function barAt(x, y) {
  for (const bar of BARS) {
    if (roundedRectDistance(x, y, 8, bar.y + 1.5, 5, 1.5, 0.5) <= 0) return bar.color
  }
  return null
}

function render({ size, glyphScale, cornerRadius }) {
  const pixels = Buffer.alloc(size * size * 4)
  const glyphSize = size * glyphScale
  const offset = (size - glyphSize) / 2
  const radius = cornerRadius * size
  const half = size / 2
  const samples = SUPERSAMPLE * SUPERSAMPLE

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let covered = 0
      const sum = [0, 0, 0]
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const x = px + (sx + 0.5) / SUPERSAMPLE
          const y = py + (sy + 0.5) / SUPERSAMPLE
          if (radius !== 0 && roundedRectDistance(x, y, half, half, half, half, radius) > 0) continue
          covered += 1
          const color = barAt(((x - offset) / glyphSize) * 16, ((y - offset) / glyphSize) * 16) ?? BACKGROUND
          for (let c = 0; c < 3; c += 1) sum[c] += color[c]
        }
      }
      const i = (py * size + px) * 4
      for (let c = 0; c < 3; c += 1) pixels[i + c] = covered ? Math.round(sum[c] / covered) : 0
      pixels[i + 3] = Math.round((covered / samples) * 255)
    }
  }
  return pixels
}

// ---- PNG encoding ----

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y += 1) {
    rows[y * (size * 4 + 1)] = 0 // filter: none
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const icon of ICONS) {
  const path = fileURLToPath(new URL(`../icons/${icon.file}`, import.meta.url))
  const png = encodePng(icon.size, render(icon))
  await writeFile(path, png)
  console.log(`wrote ${icon.file} (${png.length} bytes)`)
}
