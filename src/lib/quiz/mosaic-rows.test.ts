import { describe, it, expect } from 'vitest'
import { computeMosaicRows } from './mosaic-rows'

describe('computeMosaicRows', () => {
  it('fills 160% of the container height plus a 2-row buffer', () => {
    // 900px container, 124px tiles: ceil(900 * 1.6 / 124) + 2 = 14
    expect(computeMosaicRows(900, 900, 124)).toBe(14)
  })

  it('never exceeds the viewport-derived row count, even for a huge container', () => {
    // Regression: #19 unfixed the start screen's height, so the container
    // reported its own content height (millions of px) and rows diverged.
    expect(computeMosaicRows(2_278_062, 900, 124)).toBe(computeMosaicRows(900, 900, 124))
  })

  it('uses the container when it is smaller than the viewport', () => {
    expect(computeMosaicRows(500, 900, 124)).toBe(Math.ceil((500 * 1.6) / 124) + 2)
  })

  it('returns 0 for a non-positive tile size (unmeasurable column)', () => {
    expect(computeMosaicRows(900, 900, 0)).toBe(0)
    expect(computeMosaicRows(900, 900, -4)).toBe(0)
  })

  it('returns 0 for a non-positive height (hidden mosaic)', () => {
    expect(computeMosaicRows(0, 900, 124)).toBe(0)
  })
})
