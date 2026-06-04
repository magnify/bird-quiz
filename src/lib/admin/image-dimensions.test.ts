import { describe, it, expect } from 'vitest'
import { jpegSize, isPortraitDimensions } from './image-dimensions'

// Minimal JPEG: SOI + APP0 segment + SOF0 carrying the dimensions.
function fakeJpeg(width: number, height: number): Buffer {
  const sof = Buffer.from([
    0xff, 0xc0, // SOF0
    0x00, 0x11, // length 17
    0x08, // precision
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  ])
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]) // skippable segment
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof])
}

describe('jpegSize', () => {
  it('reads landscape dimensions', () => {
    expect(jpegSize(fakeJpeg(640, 480))).toEqual({ width: 640, height: 480 })
  })

  it('reads portrait dimensions', () => {
    expect(jpegSize(fakeJpeg(400, 640))).toEqual({ width: 400, height: 640 })
  })

  it('skips segments before SOF', () => {
    expect(jpegSize(fakeJpeg(1920, 1080))).toEqual({ width: 1920, height: 1080 })
  })

  it('returns null for non-JPEG', () => {
    expect(jpegSize(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull()
    expect(jpegSize(Buffer.from([]))).toBeNull()
  })
})

describe('isPortraitDimensions', () => {
  it('flags square and portrait, passes 4:3 and wider', () => {
    expect(isPortraitDimensions({ width: 480, height: 480 })).toBe(true) // square
    expect(isPortraitDimensions({ width: 400, height: 640 })).toBe(true) // portrait
    expect(isPortraitDimensions({ width: 640, height: 480 })).toBe(false) // 4:3
    expect(isPortraitDimensions({ width: 1920, height: 1080 })).toBe(false) // 16:9
  })
})
