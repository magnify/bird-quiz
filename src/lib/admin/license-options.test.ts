import { describe, it, expect } from 'vitest'
import { LICENSE_OPTIONS, isKnownLicense } from './license-options'

describe('LICENSE_OPTIONS', () => {
  it('includes the common presets', () => {
    const values = LICENSE_OPTIONS.map(o => o.value)
    expect(values).toEqual(
      expect.arrayContaining(['cc-by-2.0', 'cc-by-sa-4.0', 'cc0', 'own', 'copyright']),
    )
  })

  it('every option has a non-empty label', () => {
    for (const o of LICENSE_OPTIONS) expect(o.label.length).toBeGreaterThan(0)
  })
})

describe('isKnownLicense', () => {
  it('matches presets case-insensitively', () => {
    expect(isKnownLicense('cc-by-2.0')).toBe(true)
    expect(isKnownLicense('CC-BY-2.0')).toBe(true)
  })

  it('rejects unknown / empty values', () => {
    expect(isKnownLicense('weird-license')).toBe(false)
    expect(isKnownLicense('')).toBe(false)
    expect(isKnownLicense(undefined)).toBe(false)
  })
})
