'use client'

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import type { Bird } from '@/lib/supabase/types'
import { getBirdImageUrl } from '@/lib/images'

interface BirdMosaicProps {
  birds: Bird[]
  highlightBirdId?: string | null
  onTileRef?: (birdId: string, el: HTMLElement | null) => void
}

const COLUMN_COUNT = 4

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function BirdMosaic({ birds, highlightBirdId, onTileRef }: BirdMosaicProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [rowsNeeded, setRowsNeeded] = useState(12)

  // Measure container to calculate rows needed
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const firstCol = el.querySelector('.mosaic-column') as HTMLElement | null
    if (!firstCol) return
    const colWidth = firstCol.offsetWidth
    // Each tile is square (aspect-ratio: 1) + 4px gap
    const tileSize = colWidth + 4
    const containerHeight = el.offsetHeight
    // Enough rows to fill 160% of height (accounts for offsets + bleeding)
    const rows = Math.ceil((containerHeight * 1.6) / tileSize) + 2
    if (rows !== rowsNeeded) setRowsNeeded(rows)
  }, [rowsNeeded])

  const totalTiles = COLUMN_COUNT * rowsNeeded

  const { columns, offsets } = useMemo(() => {
    const pool = shuffle(birds)
    const picked: Bird[] = []
    const usedIds = new Set<string>()

    // Ensure the highlighted bird is included
    if (highlightBirdId) {
      const highlight = birds.find(b => b.id === highlightBirdId)
      if (highlight) {
        picked.push(highlight)
        usedIds.add(highlight.id)
      }
    }

    // Pick birds, cycling through the pool if we need more than available
    let poolIdx = 0
    while (picked.length < totalTiles) {
      const bird = pool[poolIdx % pool.length]
      if (!usedIds.has(bird.id)) {
        picked.push(bird)
        usedIds.add(bird.id)
      } else if (picked.length < birds.length) {
        poolIdx++
        continue
      } else {
        // All unique birds used, just fill remaining with repeats
        picked.push(bird)
      }
      poolIdx++
    }

    const shuffled = shuffle(picked)

    // Split into columns
    const cols: Bird[][] = []
    for (let c = 0; c < COLUMN_COUNT; c++) {
      const start = c * rowsNeeded
      cols.push(shuffled.slice(start, start + rowsNeeded))
    }

    // Random vertical offset per column — percentage-based for responsive
    const columnOffsets = Array.from({ length: COLUMN_COUNT }, () =>
      Math.round(-30 + Math.random() * 35)
    )

    return { columns: cols, offsets: columnOffsets }
  }, [birds, highlightBirdId, totalTiles, rowsNeeded])

  const [loadedIds, setLoadedIds] = useState<Set<string>>(() => new Set())

  const handleLoad = useCallback((id: string) => {
    setLoadedIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  return (
    <div className="mosaic-grid" ref={containerRef}>
      {columns.map((col, colIdx) => (
        <div
          key={colIdx}
          className="mosaic-column"
          style={{ transform: `translateY(${offsets[colIdx]}%)` }}
        >
          {col.map((bird, rowIdx) => {
            const url = getBirdImageUrl(bird.scientific_name)
            const key = `${bird.id}-${rowIdx}`
            return (
              <div
                key={key}
                className="mosaic-tile"
                ref={rowIdx === 0 ? el => onTileRef?.(bird.id, el) : undefined}
              >
                <img
                  className={`mosaic-tile-img ${loadedIds.has(bird.id) ? 'loaded' : ''}`}
                  src={url}
                  alt={bird.name_da}
                  loading="lazy"
                  onLoad={() => handleLoad(bird.id)}
                />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
