import { describe, it, expect } from 'vitest'
import { namesInCopyright } from './copyright-check'

describe('namesInCopyright', () => {
  it('matches the Danish name', () => {
    expect(namesInCopyright('Foto: Solsort i haven', 'Solsort', 'Blackbird')).toEqual(['Solsort'])
  })
  it('matches the English name (Wikimedia caption case)', () => {
    expect(namesInCopyright('Smudge 9000 — Coal Tit (Periparus ater) (Wikimedia Commons)', 'Sortmejse', 'Coal Tit'))
      .toEqual(['Coal Tit'])
  })
  it('matches both names', () => {
    expect(namesInCopyright('Solsort / Blackbird by X', 'Solsort', 'Blackbird')).toEqual(['Solsort', 'Blackbird'])
  })
  it('is case-insensitive', () => {
    expect(namesInCopyright('photo of a BLACKBIRD', 'Solsort', 'Blackbird')).toEqual(['Blackbird'])
  })
  it('returns [] for a clean credit', () => {
    expect(namesInCopyright('(c) Donald Davesne, some rights reserved (CC BY)', 'Gråspurv', 'House Sparrow')).toEqual([])
  })
  it('returns [] for empty/missing attribution', () => {
    expect(namesInCopyright('', 'Solsort', 'Blackbird')).toEqual([])
    expect(namesInCopyright(null, 'Solsort', 'Blackbird')).toEqual([])
    expect(namesInCopyright(undefined, 'Solsort', 'Blackbird')).toEqual([])
  })
  it('does not flag scientific name (handled by caller, not here)', () => {
    expect(namesInCopyright('John Doe — Turdus merula (Wikimedia Commons)', 'Solsort', 'Blackbird')).toEqual([])
  })
})
