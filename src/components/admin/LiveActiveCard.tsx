'use client'

import { useEffect, useRef, useState } from 'react'
import { getLiveStats } from '@/app/actions/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const POLL_MS = 30_000

/** "Aktive nu" with async live refresh. Polls getLiveStats every 30s, but only
 *  while the tab is visible (pauses when hidden) — one tiny count query per
 *  poll, so it's gentle on free-tier Supabase. */
export function LiveActiveCard({ initialActive }: { initialActive: number }) {
  const [active, setActive] = useState(initialActive)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const cancelled = useRef(false)

  useEffect(() => {
    cancelled.current = false

    const poll = async () => {
      if (document.visibilityState !== 'visible') return
      const s = await getLiveStats()
      if (!cancelled.current && s.healthy) {
        setActive(s.activeSessions)
        setUpdatedAt(new Date())
      }
    }

    const id = setInterval(poll, POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') poll() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled.current = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return (
    <Card className={cn(active > 0 && 'ring-1 ring-emerald-500/40')}>
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          Aktive nu
          <span className={cn('inline-block size-1.5 rounded-full', active > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40')} />
        </CardDescription>
        <CardTitle className={cn('text-2xl tabular-nums', active > 0 && 'text-emerald-600')}>{active}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Startet, ikke fuldført (15 min)
        {updatedAt && ` · opdateret ${updatedAt.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
      </CardContent>
    </Card>
  )
}
