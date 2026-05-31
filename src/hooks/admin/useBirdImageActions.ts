'use client'

import { useCallback, useState } from 'react'
import { flagBirdImage, unflagBirdImage } from '@/app/actions/birds'
import type { FlagReason, ImageAudit } from '@/lib/admin/image-status'
import { auditStatus, type BirdImageStatus } from '@/lib/admin/image-status'

interface UseBirdImageActionsArgs {
  initialAudits: ImageAudit[]
}

interface AuditPatch {
  attribution?: string
  license?: string
  flagged?: boolean
  flagReason?: FlagReason
  needsReview?: boolean
  hasFile?: boolean
}

export interface BirdImageActions {
  toggleFlag(scientificName: string, reason?: FlagReason): Promise<void>
  approve(scientificName: string): Promise<void>
  patch(scientificName: string, partial: AuditPatch): void
  bumpRefreshKey(): void
}

export function useBirdImageActions({ initialAudits }: UseBirdImageActionsArgs) {
  const [audits, setAudits] = useState<ImageAudit[]>(initialAudits)
  const [refreshKey, setRefreshKey] = useState(() => Date.now())

  const auditByName = new Map(audits.map(a => [a.scientificName, a]))
  const statusByName = new Map<string, BirdImageStatus>(
    audits.map(a => [a.scientificName, auditStatus(a)]),
  )

  const patch = useCallback((scientificName: string, partial: AuditPatch) => {
    setAudits(prev =>
      prev.map(a => {
        if (a.scientificName !== scientificName) return a
        return { ...a, ...partial }
      }),
    )
  }, [])

  const toggleFlag = useCallback(async (scientificName: string, reason?: FlagReason) => {
    const target = reason !== undefined
    const previous = auditByName.get(scientificName)
    const prevFlagged = previous?.flagged ?? false
    const prevReason = previous?.flagReason

    patch(scientificName, { flagged: target, flagReason: target ? reason : undefined })

    const result = target
      ? await flagBirdImage(scientificName, reason)
      : await unflagBirdImage(scientificName)

    if (!result.ok) {
      patch(scientificName, { flagged: prevFlagged, flagReason: prevReason })
      alert(`Kunne ikke ${target ? 'markere' : 'fjerne markering'}: ${result.error}`)
    }
  }, [auditByName, patch])

  const approve = useCallback(async (scientificName: string) => {
    const previous = auditByName.get(scientificName)
    const prevFlagged = previous?.flagged ?? false
    const prevReason = previous?.flagReason
    const prevNeedsReview = previous?.needsReview ?? false

    patch(scientificName, { flagged: false, flagReason: undefined, needsReview: false })

    const res = await fetch('/api/admin/images/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scientificName }),
    })
    if (!res.ok) {
      patch(scientificName, { flagged: prevFlagged, flagReason: prevReason, needsReview: prevNeedsReview })
      alert('Kunne ikke godkende')
    }
  }, [auditByName, patch])

  const bumpRefreshKey = useCallback(() => setRefreshKey(Date.now()), [])

  const actions: BirdImageActions = { toggleFlag, approve, patch, bumpRefreshKey }

  return { audits, auditByName, statusByName, refreshKey, actions }
}
