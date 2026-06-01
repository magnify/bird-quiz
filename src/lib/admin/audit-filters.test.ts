import { describe, it, expect } from 'vitest'
import type { ImageAudit } from './image-status'
import {
  AUDIT_FILTERS,
  auditCounts,
  matchesAuditFilter,
  matchesSearch,
} from './audit-filters'

function audit(partial: Partial<ImageAudit>): ImageAudit {
  return {
    scientificName: 'Genus species',
    hasFile: true,
    source: 'wikimedia-commons',
    attribution: 'Someone',
    license: 'cc-by-2.0',
    flagged: false,
    needsReview: false,
    issues: [],
    severity: 'ok',
    isPortrait: false,
    ...partial,
  }
}

describe('matchesAuditFilter', () => {
  it('matches severity filters by severity', () => {
    expect(matchesAuditFilter(audit({ severity: 'critical' }), 'critical')).toBe(true)
    expect(matchesAuditFilter(audit({ severity: 'warning' }), 'critical')).toBe(false)
    expect(matchesAuditFilter(audit({ severity: 'ok' }), 'ok')).toBe(true)
  })

  it('all matches everything', () => {
    expect(matchesAuditFilter(audit({ hasFile: false }), 'all')).toBe(true)
  })

  it('missing matches birds without a file', () => {
    expect(matchesAuditFilter(audit({ hasFile: false }), 'missing')).toBe(true)
    expect(matchesAuditFilter(audit({ hasFile: true }), 'missing')).toBe(false)
  })

  it('no-license only counts birds that HAVE a file but no license', () => {
    expect(matchesAuditFilter(audit({ hasFile: true, license: undefined }), 'no-license')).toBe(true)
    // A missing image should not be reported as a licensing problem.
    expect(matchesAuditFilter(audit({ hasFile: false, license: undefined }), 'no-license')).toBe(false)
  })

  it('flagged / needs-review / portrait match their flags', () => {
    expect(matchesAuditFilter(audit({ flagged: true }), 'flagged')).toBe(true)
    expect(matchesAuditFilter(audit({ needsReview: true }), 'needs-review')).toBe(true)
    expect(matchesAuditFilter(audit({ isPortrait: true }), 'portrait')).toBe(true)
  })
})

describe('auditCounts', () => {
  it('counts each filter independently', () => {
    const audits = [
      audit({ scientificName: 'A', severity: 'critical', flagged: true }),
      audit({ scientificName: 'B', severity: 'warning', needsReview: true }),
      audit({ scientificName: 'C', severity: 'ok' }),
      audit({ scientificName: 'D', hasFile: false, severity: 'critical', license: undefined }),
    ]
    const counts = auditCounts(audits)
    expect(counts.all).toBe(4)
    expect(counts.critical).toBe(2)
    expect(counts.warning).toBe(1)
    expect(counts.ok).toBe(1)
    expect(counts.flagged).toBe(1)
    expect(counts['needs-review']).toBe(1)
    expect(counts.missing).toBe(1)
    // D is missing, so it must NOT inflate the no-license count.
    expect(counts['no-license']).toBe(0)
  })

  it('has a count for every declared filter', () => {
    const counts = auditCounts([])
    for (const { key } of AUDIT_FILTERS) {
      expect(counts[key]).toBe(0)
    }
  })
})

describe('matchesSearch', () => {
  it('matches on scientific name and Danish name, case-insensitively', () => {
    const a = audit({ scientificName: 'Erithacus rubecula' })
    expect(matchesSearch(a, 'Rødhals', 'rødhals')).toBe(true)
    expect(matchesSearch(a, 'Rødhals', 'erithacus')).toBe(true)
    expect(matchesSearch(a, 'Rødhals', 'blåmejse')).toBe(false)
  })

  it('empty search matches everything', () => {
    expect(matchesSearch(audit({}), undefined, '   ')).toBe(true)
  })
})
