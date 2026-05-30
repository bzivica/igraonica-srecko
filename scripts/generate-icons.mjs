// Vygeneruje jednoduché PWA ikony (fialové pozadí + bílý kruh) bez externích závislostí.
// Spuštění: node scripts/generate-icons.mjs
import { deflateSync, crc32 } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const ACCENT = [124, 58, 237] // #7c3aed
const WHITE = [255, 255, 255]

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crc = crc32(Buffer.concat([typeBuf, data])) >>> 0
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc, 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makePng(size) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.3
  const stripes = 4 // jemný pruh = stopka

  // raw scanlines: 1 filter byte + RGBA per pixel
  const raw = Buffer.alloc(size * (1 + size * 4))
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy)
      const inStem = Math.abs(x - cx) < stripes && y > cy && y < cy + r * 1.6
      const isWhite = dist < r || inStem
      const [rr, gg, bb] = isWhite ? WHITE : ACCENT
      raw[p++] = rr
      raw[p++] = gg
      raw[p++] = bb
      raw[p++] = 255
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const idat = deflateSync(raw)
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

mkdirSync('public', { recursive: true })
for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, makePng(size))
  console.log(`public/icon-${size}.png`)
}
