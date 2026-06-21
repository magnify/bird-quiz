'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { RANGE_OPTIONS } from '@/lib/admin/analytics'
import { cn } from '@/lib/utils'

/** Segmented time-range picker. Drives the page via the `?range=` URL param so
 *  the server component re-renders with the new window (no client fetching). */
export function IntervalPicker({ current }: { current: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const select = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
      {RANGE_OPTIONS.map(o => (
        <button
          key={o.key}
          type="button"
          onClick={() => select(o.key)}
          className={cn(
            'px-3 py-1 text-sm rounded-md transition-colors',
            current === o.key
              ? 'bg-background shadow-sm font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
