import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card className={accent ? 'ring-1 ring-emerald-500/40' : undefined}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={cn('text-2xl tabular-nums', accent && 'text-emerald-600')}>{value}</CardTitle>
      </CardHeader>
      {sub && <CardContent className="text-xs text-muted-foreground">{sub}</CardContent>}
    </Card>
  )
}
