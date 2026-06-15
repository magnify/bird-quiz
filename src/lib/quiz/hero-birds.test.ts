import { describe, it, expect } from 'vitest'
import { pickHeroBirds, HERO_BIRD_NAMES } from './hero-birds'
import type { Bird } from '@/lib/supabase/types'

const makeBird = (id: string, scientificName: string): Bird => ({
  id,
  scientific_name: scientificName,
  name_da: `Danish ${scientificName}`,
  name_en: `English ${scientificName}`,
  category: 'test',
  is_common: false,
  is_easy: false,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
})

// Three allowlisted + two not.
const allowed = HERO_BIRD_NAMES.slice(0, 3)
const birds: Bird[] = [
  ...allowed.map((name, i) => makeBird(`hero-${i}`, name)),
  makeBird('x1', 'Passer domesticus'),
  makeBird('x2', 'Turdus merula'),
]

describe('pickHeroBirds', () => {
  it('returns only allowlisted birds', () => {
    const picked = pickHeroBirds(birds, 10)
    expect(picked.every(b => allowed.includes(b.scientific_name))).toBe(true)
    expect(picked).toHaveLength(allowed.length)
  })

  it('caps the result at count', () => {
    expect(pickHeroBirds(birds, 2)).toHaveLength(2)
  })

  it('returns an empty array for empty input', () => {
    expect(pickHeroBirds([], 5)).toEqual([])
  })

  it('returns fewer than count when the allowlist matches fewer birds', () => {
    const one = [makeBird('hero-only', allowed[0])]
    expect(pickHeroBirds(one, 5)).toHaveLength(1)
  })

  it('returns an empty array for a non-positive count', () => {
    expect(pickHeroBirds(birds, 0)).toEqual([])
    expect(pickHeroBirds(birds, -3)).toEqual([])
  })
})
