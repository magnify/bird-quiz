import type { Confusion } from '@/lib/admin/aggregate'

/** "Right answer → what was chosen instead" rows. Shared by the global Analyse
 *  view and per-player detail. */
export function ConfusionsList({ confusions }: { confusions: Confusion[] }) {
  return (
    <div className="space-y-2">
      {confusions.map((c, i) => (
        <div key={i} className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate min-w-0">
            {c.actualName} <span className="text-muted-foreground">→ {c.chosenName}</span>
          </span>
          <span className="tabular-nums text-muted-foreground shrink-0">{c.count}×</span>
        </div>
      ))}
    </div>
  )
}
