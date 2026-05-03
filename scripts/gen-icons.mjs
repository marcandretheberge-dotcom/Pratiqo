import sharp from 'sharp'
import { copyFileSync } from 'fs'

const src = 'public/icon-192.png'

// Load source, make near-white pixels transparent
const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  if (r > 240 && g > 240 && b > 240) data[i + 3] = 0
}

const cleanBuffer = Buffer.from(data)

// Generate favicon.ico (multi-size via 48px PNG embedded in ICO)
// sharp doesn't natively write .ico, so we write a 32px PNG then use
// a manual ICO builder for the three sizes.

const sizes = [16, 32, 48]
const pngBuffers = await Promise.all(
  sizes.map(size =>
    sharp(cleanBuffer, { raw: { width: info.width, height: info.height, channels: 4 } })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
  )
)

// Build ICO manually: ICONDIR + ICONDIRENTRYs + image data
function buildIco(pngBufs, dims) {
  const count = pngBufs.length
  const headerSize = 6
  const entrySize = 16
  const dataOffset = headerSize + entrySize * count

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)     // reserved
  header.writeUInt16LE(1, 2)     // type: ICO
  header.writeUInt16LE(count, 4) // image count

  let currentOffset = dataOffset
  const entries = []
  for (let i = 0; i < count; i++) {
    const entry = Buffer.alloc(16)
    const size = dims[i]
    entry.writeUInt8(size === 256 ? 0 : size, 0)  // width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1)  // height
    entry.writeUInt8(0, 2)      // color count
    entry.writeUInt8(0, 3)      // reserved
    entry.writeUInt16LE(1, 4)   // color planes
    entry.writeUInt16LE(32, 6)  // bits per pixel
    entry.writeUInt32LE(pngBufs[i].length, 8)
    entry.writeUInt32LE(currentOffset, 12)
    currentOffset += pngBufs[i].length
    entries.push(entry)
  }

  return Buffer.concat([header, ...entries, ...pngBufs])
}

const icoBuffer = buildIco(pngBuffers, sizes)
import { writeFileSync } from 'fs'
writeFileSync('public/favicon.ico', icoBuffer)
copyFileSync('public/favicon.ico', 'app/favicon.ico')
console.log('favicon.ico → public/ and app/')

// Generate apple-touch-icon.png (180×180, green background)
const iconResized = await sharp(cleanBuffer, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

await sharp({
  create: { width: 180, height: 180, channels: 4, background: { r: 29, g: 158, b: 117, alpha: 255 } },
})
  .composite([{ input: iconResized, blend: 'over' }])
  .flatten({ background: { r: 29, g: 158, b: 117 } })
  .png()
  .toFile('public/apple-touch-icon.png')

console.log('apple-touch-icon.png → public/')
