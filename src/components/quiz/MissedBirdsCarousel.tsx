'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export interface MissedBirdItem {
  key: string
  nameDa: string
  nameEn: string
  imageUrl: string
  count?: number
}

interface Props {
  items: MissedBirdItem[]
  ariaLabel?: string
}

export default function MissedBirdsCarousel({ items, ariaLabel }: Props) {
  const [index, setIndex] = useState(0)
  const startXRef = useRef<number | null>(null)
  const deltaXRef = useRef(0)

  useEffect(() => {
    if (index >= items.length) setIndex(Math.max(0, items.length - 1))
  }, [items.length, index])

  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(items.length - 1, next)))
    },
    [items.length],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(index - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(index + 1)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    deltaXRef.current = 0
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current == null) return
    deltaXRef.current = e.touches[0].clientX - startXRef.current
  }

  const handleTouchEnd = () => {
    const d = deltaXRef.current
    startXRef.current = null
    deltaXRef.current = 0
    if (Math.abs(d) > 40) {
      go(d < 0 ? index + 1 : index - 1)
    }
  }

  if (items.length === 0) return null

  return (
    <div
      className="missed-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel ?? 'Fugle du missede'}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        className="missed-carousel-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="missed-carousel-track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map(item => (
            <div key={item.key} className="missed-carousel-slide">
              <div className="missed-carousel-card">
                <img
                  className="missed-carousel-image"
                  src={item.imageUrl}
                  alt={item.nameDa}
                  loading="lazy"
                />
                {item.count != null && item.count > 1 && (
                  <span
                    className="missed-carousel-count"
                    aria-label={`Misset ${item.count} gange`}
                  >
                    ×{item.count}
                  </span>
                )}
                <div className="missed-carousel-info">
                  <div className="missed-carousel-da">{item.nameDa}</div>
                  <div className="missed-carousel-en">{item.nameEn}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
        <div className="missed-carousel-controls">
          <button
            type="button"
            className="missed-carousel-arrow"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Forrige fugl"
          >
            ‹
          </button>
          <span className="missed-carousel-counter" aria-live="polite">
            {index + 1} / {items.length}
          </span>
          <button
            type="button"
            className="missed-carousel-arrow"
            onClick={() => go(index + 1)}
            disabled={index === items.length - 1}
            aria-label="Næste fugl"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
