import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getBirdImageUrl, getSupabaseImageUrl, toSlug } from './images'

describe('images', () => {
  // Save and restore env vars
  const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv
  })

  describe('getBirdImageUrl', () => {
    it('generates correct API proxy path', () => {
      expect(getBirdImageUrl('Columba palumbus')).toBe('/api/images/columba-palumbus')
    })

    it('handles lowercase names', () => {
      expect(getBirdImageUrl('passer domesticus')).toBe('/api/images/passer-domesticus')
    })

    it('handles multiple spaces', () => {
      expect(getBirdImageUrl('Accipiter  gentilis')).toBe('/api/images/accipiter-gentilis')
    })
  })

  describe('getSupabaseImageUrl', () => {
    it('generates API proxy path', () => {
      const url = getSupabaseImageUrl('Columba palumbus')
      expect(url).toBe('/api/images/columba-palumbus')
    })

    it('uses slug conversion', () => {
      const url = getSupabaseImageUrl('Turdus merula')
      expect(url).toBe('/api/images/turdus-merula')
    })
  })

  describe('toSlug', () => {
    it('converts scientific names to slugs', () => {
      expect(toSlug('Accipiter gentilis')).toBe('accipiter-gentilis')
    })

    it('handles lowercase names', () => {
      expect(toSlug('passer domesticus')).toBe('passer-domesticus')
    })

    it('replaces spaces with hyphens', () => {
      expect(toSlug('Cygnus cygnus')).toBe('cygnus-cygnus')
    })

    it('handles multiple spaces', () => {
      expect(toSlug('Falco  tinnunculus')).toBe('falco-tinnunculus')
    })
  })
})
