'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { flagBirdImage, unflagBirdImage } from '@/app/actions/birds'
import type { FlagReason, ImageAudit } from '@/lib/admin/image-status'
import { auditStatus, labelFor, type BirdImageStatus } from '@/lib/admin/image-status'

interface UseBirdImageActionsArgs {
  initialAudits: ImageAudit[]
}

export interface BirdImageActions {
  toggleFlag(scientificName: string, reason?: FlagReason): Promise<boolean>
  approve(scientificName: string): Promise<boolean>
  /** Re-fetch server-derived audits (counts, severity, issues) after an external change. */
  refresh(): void
}

/**
 * Single source of truth for admin image state.
 *
 * The audit data (including derived `severity` / `issues`) is computed on the
 * server in get-image-audits.ts. Rather than mutate a frozen client snapshot —
 * which leaves severity/counts stale — every mutation writes to the server and
 * then calls router.refresh(), and the component re-renders from fresh props.
 * `pending` tracks in-flight birds so the UI can show a spinner meanwhile.
 */
export function useBirdImageActions({ initialAudits }: UseBirdImageActionsArgs) {
  const router = useRouter()
  // Mirror the server prop so a router.refresh() flows new data straight in.
  const [audits, setAudits] = useState<ImageAudit[]>(initialAudits)
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    setAudits(initialAudits)
  }, [initialAudits])

  const auditByName = useMemo(
    () => new Map(audits.map(a => [a.scientificName, a])),
    [audits],
  )
  const statusByName = useMemo(
    () => new Map<string, BirdImageStatus>(audits.map(a => [a.scientificName, auditStatus(a)])),
    [audits],
  )

  const setPendingFor = useCallback((name: string, on: boolean) => {
    setPending(prev => {
      const next = new Set(prev)
      if (on) next.add(name)
      else next.delete(name)
      return next
    })
  }, [])

  const refresh = useCallback(() => router.refresh(), [router])

  const toggleFlag = useCallback(
    async (scientificName: string, reason?: FlagReason): Promise<boolean> => {
      const flagging = reason !== undefined
      setPendingFor(scientificName, true)
      const result = flagging
        ? await flagBirdImage(scientificName, reason)
        : await unflagBirdImage(scientificName)
      setPendingFor(scientificName, false)

      if (result.ok) {
        toast.success(flagging ? `Markeret: ${labelFor(reason)}` : 'Markering fjernet')
        router.refresh()
        return true
      }
      toast.error(`Kunne ikke ${flagging ? 'markere' : 'fjerne markering'}`, {
        description: result.error,
      })
      return false
    },
    [router, setPendingFor],
  )

  const approve = useCallback(
    async (scientificName: string): Promise<boolean> => {
      setPendingFor(scientificName, true)
      const res = await fetch('/api/admin/images/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scientificName }),
      }).catch(() => null)
      setPendingFor(scientificName, false)

      if (res?.ok) {
        toast.success('Billede godkendt')
        router.refresh()
        return true
      }
      toast.error('Kunne ikke godkende billedet')
      return false
    },
    [router, setPendingFor],
  )

  const actions: BirdImageActions = useMemo(
    () => ({ toggleFlag, approve, refresh }),
    [toggleFlag, approve, refresh],
  )

  return { audits, auditByName, statusByName, pending, actions }
}
