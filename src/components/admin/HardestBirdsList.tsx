import type { HardestBird } from '@/lib/admin/aggregate'
import { accuracyColor } from '@/lib/admin/labels'
import { cn } from '@/lib/utils'

/** Birds ranked by accuracy with a "correct/shown" tally. Shared by the global
 *  Analyse view and per-player detail. */
export function HardestBirdsList({ birds }: { birds: HardestBird[] }) {
  return (
    <div className="space-y-2">
      {birds.map(b => (
        <div key={b.bird_id} className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium truncate min-w-0">{b.bird_name_da}</span>
          <span className={cn('tabular-nums shrink-0', accuracyColor(b.accuracy))}>
            {b.accuracy}% ({b.times_correct}/{b.times_shown})
          </span>
        </div>
      ))}
    </div>
  )
}
