import { describe, it, expect } from 'vitest'
import { localizedBirdName } from './bird-name'

describe('localizedBirdName', () => {
  const bird = { name_da: 'Solsort', name_en: 'Blackbird' }

  it('returns Danish for da', () => {
    expect(localizedBirdName(bird, 'da')).toBe('Solsort')
  })
  it('returns English for en', () => {
    expect(localizedBirdName(bird, 'en')).toBe('Blackbird')
  })
  it('falls back to Danish when English is missing', () => {
    expect(localizedBirdName({ name_da: 'Solsort', name_en: '' }, 'en')).toBe('Solsort')
    expect(localizedBirdName({ name_da: 'Solsort', name_en: null }, 'en')).toBe('Solsort')
    expect(localizedBirdName({ name_da: 'Solsort' }, 'en')).toBe('Solsort')
  })
})
