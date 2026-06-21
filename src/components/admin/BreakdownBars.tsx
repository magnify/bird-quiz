import { cn } from '@/lib/utils'

export function BreakdownBars({ rows, total, label, colors }: {
  rows: { key: string; count: number }[]; total: number; label: (k: string) => string; colors: Record<string, string>
}) {
  return (
    <div className="space-y-3.5">
      {rows.map(r => {
        const pct = total ? Math.round((r.count / total) * 100) : 0
        return (
          <div key={r.key} className="group text-sm" title={`${label(r.key)}: ${r.count} (${pct}%)`}>
            <div className="flex justify-between mb-1">
              <span className="font-medium">{label(r.key)}</span>
              <span className="tabular-nums text-muted-foreground">
                {r.count} <span className="text-foreground/70">· {pct}%</span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500 ease-out opacity-90 group-hover:opacity-100',
                  colors[r.key] ?? 'bg-primary',
                )}
                style={{ width: `${total ? (r.count / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
