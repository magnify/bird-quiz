import { cn } from '@/lib/utils'

export function BreakdownBars({ rows, total, label, colors }: {
  rows: { key: string; count: number }[]; total: number; label: (k: string) => string; colors: Record<string, string>
}) {
  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.key} className="text-sm">
          <div className="flex justify-between mb-0.5">
            <span>{label(r.key)}</span>
            <span className="tabular-nums text-muted-foreground">
              {r.count} ({total ? Math.round((r.count / total) * 100) : 0}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className={cn('h-full rounded-full', colors[r.key] ?? 'bg-primary')} style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
