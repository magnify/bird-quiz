export const FLAG_REASONS = [
  { value: 'wrong-species', label: 'Forkert art' },
  { value: 'bad-crop', label: 'Dårlig komposition' },
  { value: 'low-quality', label: 'Lav kvalitet' },
  { value: 'licensing', label: 'Licens-problem' },
  { value: 'other', label: 'Andet' },
] as const

export type FlagReason = typeof FLAG_REASONS[number]['value']

export interface ManifestEntry {
  file: string
  source: string
  attribution?: string
  license?: string
  flagged?: boolean
  flag_reason?: string
  approved?: boolean
  needsReview?: boolean
}

export type BirdImageStatus =
  | { kind: 'missing' }
  | { kind: 'review' }
  | { kind: 'approved' }
  | { kind: 'flagged'; reason: FlagReason; reasonLabel: string }

export type AuditSeverity = 'critical' | 'warning' | 'ok'

export interface ImageAudit {
  scientificName: string
  hasFile: boolean
  source: string
  attribution?: string
  license?: string
  flagged: boolean
  flagReason?: FlagReason
  needsReview: boolean
  issues: string[]
  severity: AuditSeverity
  isPortrait: boolean
}

export function labelFor(reason: FlagReason): string {
  return FLAG_REASONS.find(r => r.value === reason)?.label ?? FLAG_REASONS[FLAG_REASONS.length - 1].label
}

function coerceReason(raw: string | undefined): FlagReason {
  if (!raw) return 'other'
  const match = FLAG_REASONS.find(r => r.value === raw)
  return match ? match.value : 'other'
}

export function deriveStatus(
  entry: ManifestEntry | undefined,
  hasFile: boolean,
): BirdImageStatus {
  if (!hasFile) return { kind: 'missing' }
  if (entry?.flagged) {
    const reason = coerceReason(entry.flag_reason)
    return { kind: 'flagged', reason, reasonLabel: labelFor(reason) }
  }
  if (entry?.needsReview) return { kind: 'review' }
  return { kind: 'approved' }
}

export function auditStatus(audit: ImageAudit): BirdImageStatus {
  if (!audit.hasFile) return { kind: 'missing' }
  if (audit.flagged) {
    const reason = audit.flagReason ?? 'other'
    return { kind: 'flagged', reason, reasonLabel: labelFor(reason) }
  }
  if (audit.needsReview) return { kind: 'review' }
  return { kind: 'approved' }
}
