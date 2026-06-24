'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const VIEWS = [
  { key: 'grid', label: 'Kort', icon: LayoutGrid },
  { key: 'table', label: 'Tabel', icon: Table2 },
] as const

/** Segmented Kort/Tabel switch driven by the `?view=` URL param so the server
 *  component re-renders the chosen view (matches IntervalPicker's pattern). */
export function ViewToggle({ current }: { current: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const select = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
      {VIEWS.map(v => (
        <button
          key={v.key}
          type="button"
          onClick={() => select(v.key)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors',
            current === v.key
              ? 'bg-background shadow-sm font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <v.icon className="size-4" />
          {v.label}
        </button>
      ))}
    </div>
  )
}
