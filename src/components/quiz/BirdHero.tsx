'use client'

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { getBirdImageUrl } from '@/lib/images'
import { PLACEHOLDER_SVG } from '@/lib/placeholder'
import { formatAttribution, type Manifest } from '@/lib/data/manifest'

interface BirdHeroProps {
  /** Scientific names to rotate through (already curated + capped by the caller). */
  heroNames: string[]
  manifest: Manifest
  variant?: 'hero' | 'ambient'
  /** Home-only zoom transition support. */
  firstBirdId?: string | null
  firstBirdName?: string | null
  isTransitioning?: boolean
  onTileRef?: (birdId: string, el: HTMLElement | null) => void
}

const CROSSFADE_MS = 9000

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    cb => {
      const mq = window.matchMedia(REDUCED_MOTION_QUERY)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  )
}

/**
 * Full-bleed rotating bird photo backdrop. Two stacked <img> layers ping-pong
 * with a CSS opacity crossfade; positioning, drift and fade live in quiz.css.
 * Renders NO bird name — only a subtle photo credit (attribution + license).
 *
 * On the home start screen (variant="hero") it cooperates with QuizApp's
 * ref-driven zoom: while transitioning it freezes on the first quiz bird and
 * registers the visible <img> via onTileRef so the photo shrinks into Q1.
 */
export function BirdHero({
  heroNames,
  manifest,
  variant = 'hero',
  firstBirdId,
  firstBirdName,
  isTransitioning = false,
  onTileRef,
}: BirdHeroProps) {
  const names = useMemo(() => heroNames.filter(Boolean), [heroNames])
  const reduced = usePrefersReducedMotion()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (isTransitioning || reduced || names.length <= 1) return
    const id = setInterval(() => setStep(s => s + 1), CROSSFADE_MS)
    return () => clearInterval(id)
  }, [isTransitioning, reduced, names.length])

  const refCb = useCallback(
    (el: HTMLImageElement | null) => {
      if (firstBirdId) onTileRef?.(firstBirdId, el)
    },
    [firstBirdId, onTileRef],
  )

  if (names.length === 0) {
    return <div className="start-hero-bg" data-variant={variant} aria-hidden="true" />
  }

  const len = names.length
  const cur = step % len
  const prev = (step - 1 + len) % len
  const visibleSlot = step % 2

  const lock = variant === 'hero' && isTransitioning && firstBirdName ? firstBirdName : null

  // Each slot keeps the name from the most recent step of its parity; only the
  // visible slot carries the current name. During the zoom lock the visible
  // slot is pinned to the first quiz bird.
  const slot0 = lock && visibleSlot === 0 ? lock : visibleSlot === 0 ? names[cur] : names[prev]
  const slot1 = lock && visibleSlot === 1 ? lock : visibleSlot === 1 ? names[cur] : names[prev]
  const visibleName = lock ?? names[cur]
  const credit = formatAttribution(manifest.get(visibleName))

  const layer = (slotName: string, slotIndex: 0 | 1) => {
    const visible = visibleSlot === slotIndex
    return (
      <img
        key={slotIndex}
        className={`start-hero-layer ${visible ? 'start-hero-layer--visible' : ''}`}
        src={getBirdImageUrl(slotName)}
        alt=""
        aria-hidden="true"
        draggable={false}
        ref={variant === 'hero' && visible ? refCb : undefined}
        onError={e => {
          ;(e.currentTarget as HTMLImageElement).src = PLACEHOLDER_SVG
        }}
      />
    )
  }

  return (
    <div className="start-hero-bg" data-variant={variant}>
      {layer(slot0, 0)}
      {layer(slot1, 1)}
      <div className="start-scrim" />
      {credit && <div className="start-hero-credit">📷 {credit}</div>}
    </div>
  )
}
