import type { Bird } from '@/lib/supabase/types'

/**
 * Curated allowlist of hero-quality bird photos (by scientific name) shown
 * full-bleed behind the start-screen card. Full-bleed exposes soft/low-res
 * photos that looked fine as small mosaic tiles, so this is the set of
 * highest-resolution landscape shots in the library — expanded/curated over time.
 */
export const HERO_BIRD_NAMES: string[] = [
  'Ichthyaetus melanocephalus',
  'Asio otus',
  'Podiceps cristatus',
  'Oenanthe oenanthe',
  'Sterna paradisaea',
  'Gulosus aristotelis',
  'Calidris pugnax',
  'Aythya ferina',
  'Alcedo atthis',
  'Pica pica',
  'Arenaria interpres',
  'Fulica atra',
  'Regulus regulus',
  'Anthus pratensis',
  'Phylloscopus collybita',
]

const HERO_SET = new Set(HERO_BIRD_NAMES)

// Fisher–Yates. Not pure (Math.random) — acceptable here, the hero rotation is
// deliberately random on each mount. Mirrors the old BirdMosaic shuffle.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Pick up to `count` hero birds: filter `birds` to the curated allowlist,
 * shuffle, and cap. Returns fewer than `count` (or an empty array) when the
 * allowlist matches few/no birds — callers must tolerate a short pool.
 */
export function pickHeroBirds(birds: Bird[], count: number): Bird[] {
  if (count <= 0) return []
  const matches = birds.filter(b => HERO_SET.has(b.scientific_name))
  return shuffle(matches).slice(0, count)
}
