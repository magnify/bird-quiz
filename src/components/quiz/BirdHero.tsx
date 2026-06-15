'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { getBirdImageUrl } from '@/lib/images'
import { PLACEHOLDER_SVG } from '@/lib/placeholder'
import { formatAttribution, type Manifest } from '@/lib/data/manifest'

interface BirdHeroProps {
  /** Scientific names to rotate through (already curated + capped by the caller). */
  heroNames: string[]
  manifest: Manifest
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

// False during SSR and the first client render, true afterwards — lets us defer
// the (random) photo to the client without a hydration mismatch or extra effect.
function useIsClient(): boolean {
  return useSyncExternalStore(() => () => {}, () => true, () => false)
}

/**
 * Full-bleed rotating bird photo backdrop. Two stacked <img> layers ping-pong
 * with a CSS opacity crossfade; positioning, drift and fade live in quiz.css.
 * Renders NO bird name — only a subtle photo credit (attribution + license).
 */
export function BirdHero({ heroNames, manifest }: BirdHeroProps) {
  const names = useMemo(() => heroNames.filter(Boolean), [heroNames])
  const reduced = usePrefersReducedMotion()
  const isClient = useIsClient()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (reduced || names.length <= 1) return
    const id = setInterval(() => setStep(s => s + 1), CROSSFADE_MS)
    return () => clearInterval(id)
  }, [reduced, names.length])

  // Render an empty backdrop on the server / first client render, then the
  // photos once mounted — keeps the random pick off the server (no mismatch).
  if (!isClient || names.length === 0) {
    return <div className="start-hero-bg" aria-hidden="true" />
  }

  const len = names.length
  const cur = step % len
  const prev = (step - 1 + len) % len
  const visibleSlot = step % 2

  // Each slot keeps the previous image until it's the visible one again, so the
  // crossfade always has a loaded photo on both layers.
  const slot0 = visibleSlot === 0 ? names[cur] : names[prev]
  const slot1 = visibleSlot === 1 ? names[cur] : names[prev]
  const credit = formatAttribution(manifest.get(names[cur]))

  const layer = (slotName: string, slotIndex: 0 | 1) => (
    <img
      key={slotIndex}
      className={`start-hero-layer ${visibleSlot === slotIndex ? 'start-hero-layer--visible' : ''}`}
      src={getBirdImageUrl(slotName)}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={e => {
        ;(e.currentTarget as HTMLImageElement).src = PLACEHOLDER_SVG
      }}
    />
  )

  return (
    <div className="start-hero-bg">
      {layer(slot0, 0)}
      {layer(slot1, 1)}
      <div className="start-scrim" />
      {credit && <div className="start-hero-credit">📷 {credit}</div>}
    </div>
  )
}
