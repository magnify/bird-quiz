/**
 * Rows needed for the start-screen bird mosaic.
 *
 * The mosaic deliberately bleeds past its container, so we fill 160% of the
 * visible height plus a 2-row buffer. The height basis is clamped to the
 * viewport: the container's own height grows with the rows we add, so
 * measuring it unclamped feeds back into itself (prod incident 2026-06-11,
 * #19 — the start page grew past 2M px).
 */
export function computeMosaicRows(
  containerHeight: number,
  viewportHeight: number,
  tileSize: number
): number {
  if (tileSize <= 0) return 0
  const visibleHeight = Math.min(containerHeight, viewportHeight)
  if (visibleHeight <= 0) return 0
  return Math.ceil((visibleHeight * 1.6) / tileSize) + 2
}
