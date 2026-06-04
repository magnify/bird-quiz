export interface ImageDimensions {
  width: number
  height: number
}

/**
 * Read pixel dimensions from a JPEG buffer by walking its segment markers to the
 * Start-Of-Frame (SOF) header. No dependency — all bird images are baseline or
 * progressive JPEG. Returns null if the buffer isn't a JPEG we can read.
 */
export function jpegSize(buf: Buffer): ImageDimensions | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null

  let offset = 2
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++
      continue
    }
    const marker = buf[offset + 1]

    // SOF markers carry the frame size: 0xC0–0xCF, excluding DHT(C4), JPG(C8), DAC(CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = buf.readUInt16BE(offset + 5)
      const width = buf.readUInt16BE(offset + 7)
      if (width > 0 && height > 0) return { width, height }
      return null
    }

    // Standalone markers (no length): RSTn (D0–D7), SOI(D8), EOI(D9), TEM(01).
    if ((marker >= 0xd0 && marker <= 0xd9) || marker === 0x01) {
      offset += 2
      continue
    }

    // Otherwise skip the segment using its 2-byte length.
    const segLen = buf.readUInt16BE(offset + 2)
    if (segLen < 2) return null
    offset += 2 + segLen
  }
  return null
}

// Images at or above this width/height ratio read as landscape and are NOT a
// crop problem. 4:3 ≈ 1.33 passes; square (1.0) and portrait (<1) are flagged.
export const LANDSCAPE_MIN_RATIO = 1.25

export function isPortraitDimensions(dims: ImageDimensions): boolean {
  return dims.width / dims.height < LANDSCAPE_MIN_RATIO
}
