import type { ImageAudit } from './image-status'

export type AuditFilter =
  | 'all'
  | 'critical'
  | 'warning'
  | 'ok'
  | 'portrait'
  | 'no-license'
  | 'needs-review'
  | 'flagged'
  | 'missing'

export interface AuditFilterDef {
  key: AuditFilter
  label: string
  /** 'severity' filters share the colour of their status; 'attention' filters are neutral chips. */
  tone: 'severity' | 'attention'
}

// A single, ordered list of filters — one source of truth for the filter bar.
export const AUDIT_FILTERS: AuditFilterDef[] = [
  { key: 'all', label: 'Alle', tone: 'attention' },
  { key: 'critical', label: 'Kritisk', tone: 'severity' },
  { key: 'warning', label: 'Advarsel', tone: 'severity' },
  { key: 'ok', label: 'OK', tone: 'severity' },
  { key: 'needs-review', label: 'Afventer godkendelse', tone: 'attention' },
  { key: 'flagged', label: 'Markerede', tone: 'attention' },
  { key: 'no-license', label: 'Mangler licens', tone: 'attention' },
  { key: 'portrait', label: 'Billedproblemer', tone: 'attention' },
  { key: 'missing', label: 'Intet billede', tone: 'attention' },
]

export function matchesAuditFilter(audit: ImageAudit, filter: AuditFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'critical':
    case 'warning':
    case 'ok':
      return audit.severity === filter
    case 'portrait':
      return audit.isPortrait
    case 'no-license':
      return audit.hasFile && !audit.license
    case 'needs-review':
      return audit.needsReview
    case 'flagged':
      return audit.flagged
    case 'missing':
      return !audit.hasFile
  }
}

export function matchesSearch(
  audit: ImageAudit,
  nameDa: string | undefined,
  search: string,
): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  return (
    audit.scientificName.toLowerCase().includes(q) ||
    (nameDa?.toLowerCase().includes(q) ?? false)
  )
}

/**
 * A short token that changes whenever an image's reviewable state changes, used
 * as a cache-bust on the admin <img> src so only the edited bird's thumbnail
 * refetches (not all of them) after a router.refresh().
 */
export function auditImageVersion(audit: ImageAudit): string {
  return [
    audit.hasFile ? '1' : '0',
    audit.needsReview ? '1' : '0',
    audit.flagged ? '1' : '0',
    audit.flagReason ?? '',
    (audit.license ?? '').length,
    (audit.attribution ?? '').length,
  ].join('-')
}

export function auditCounts(audits: ImageAudit[]): Record<AuditFilter, number> {
  const counts = {
    all: 0,
    critical: 0,
    warning: 0,
    ok: 0,
    portrait: 0,
    'no-license': 0,
    'needs-review': 0,
    flagged: 0,
    missing: 0,
  } as Record<AuditFilter, number>

  for (const audit of audits) {
    for (const { key } of AUDIT_FILTERS) {
      if (matchesAuditFilter(audit, key)) counts[key]++
    }
  }
  return counts
}
