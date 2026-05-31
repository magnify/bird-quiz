import { describe, it, expect } from 'vitest'
import { deriveStatus, labelFor, FLAG_REASONS } from './image-status'

describe('deriveStatus', () => {
  it('returns missing when there is no file, regardless of entry', () => {
    expect(deriveStatus(undefined, false)).toEqual({ kind: 'missing' })
    expect(deriveStatus({ file: 'x.jpg', source: 'r2' }, false)).toEqual({ kind: 'missing' })
    expect(deriveStatus({ file: 'x.jpg', source: 'r2', flagged: true }, false)).toEqual({ kind: 'missing' })
    expect(deriveStatus({ file: 'x.jpg', source: 'r2', needsReview: true }, false)).toEqual({ kind: 'missing' })
  })

  it('returns approved when entry has no flagged + no needsReview + file exists', () => {
    expect(deriveStatus({ file: 'x.jpg', source: 'r2' }, true)).toEqual({ kind: 'approved' })
    expect(deriveStatus(undefined, true)).toEqual({ kind: 'approved' })
  })

  it('returns review when needsReview = true and not flagged', () => {
    expect(deriveStatus({ file: 'x.jpg', source: 'r2', needsReview: true }, true)).toEqual({ kind: 'review' })
  })

  it('returns flagged with correct reason + label', () => {
    expect(deriveStatus({ file: 'x.jpg', source: 'r2', flagged: true, flag_reason: 'bad-crop' }, true))
      .toEqual({ kind: 'flagged', reason: 'bad-crop', reasonLabel: 'Dårlig komposition' })

    expect(deriveStatus({ file: 'x.jpg', source: 'r2', flagged: true, flag_reason: 'wrong-species' }, true))
      .toEqual({ kind: 'flagged', reason: 'wrong-species', reasonLabel: 'Forkert art' })
  })

  it('flagged with missing flag_reason falls back to "other"', () => {
    expect(deriveStatus({ file: 'x.jpg', source: 'r2', flagged: true }, true))
      .toEqual({ kind: 'flagged', reason: 'other', reasonLabel: 'Andet' })
  })

  it('flagged with unknown flag_reason falls back to "other"', () => {
    expect(deriveStatus({ file: 'x.jpg', source: 'r2', flagged: true, flag_reason: 'made-up-reason' }, true))
      .toEqual({ kind: 'flagged', reason: 'other', reasonLabel: 'Andet' })
  })

  it('flagged wins over needsReview', () => {
    const status = deriveStatus(
      { file: 'x.jpg', source: 'r2', flagged: true, flag_reason: 'low-quality', needsReview: true },
      true,
    )
    expect(status.kind).toBe('flagged')
  })
})

describe('labelFor', () => {
  it('returns the matching label for every defined reason', () => {
    for (const { value, label } of FLAG_REASONS) {
      expect(labelFor(value)).toBe(label)
    }
  })
})
