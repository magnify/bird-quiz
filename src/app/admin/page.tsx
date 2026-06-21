import { getBirds, getSimilarityGroups } from '@/lib/data/birds'
import { StatCard } from '@/components/admin/StatCard'
import { BreakdownBars } from '@/components/admin/BreakdownBars'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CAT_COLOR: Record<string, string> = {
  standfugl: 'bg-emerald-500',
  trækfugl: 'bg-sky-500',
  vintergæst: 'bg-amber-500',
  sjælden: 'bg-violet-500',
}

const DIFF_COLOR: Record<string, string> = {
  easy: 'bg-emerald-500',
  common: 'bg-sky-500',
  hard: 'bg-amber-500',
}

function diffLabel(k: string): string {
  return { easy: 'Lette', common: 'Almindelige', hard: 'Svære' }[k] ?? k
}

function catLabel(k: string): string {
  return { standfugl: 'Standfugl', trækfugl: 'Trækfugl', vintergæst: 'Vintergæst', sjælden: 'Sjælden' }[k] ?? k
}

export default async function AdminDashboard() {
  const { birds } = await getBirds()
  const groups = await getSimilarityGroups()
  const total = birds.length
  const easy = birds.filter(b => b.is_easy).length
  const common = birds.filter(b => b.is_common).length
  const groupCount = groups.length

  const categories = birds.reduce((acc, b) => {
    acc[b.category] = (acc[b.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const categoryRows = Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }))
  const categoryTotal = categoryRows.reduce((s, r) => s + r.count, 0)

  const diffRows = [
    { key: 'easy', count: easy },
    { key: 'common', count: common },
    { key: 'hard', count: birds.filter(b => !b.is_easy && !b.is_common).length },
  ]

  return (
    <div className="px-4 lg:px-6 space-y-8">
      <h1 className="text-lg font-semibold">Oversigt</h1>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fugledata</h2>
        <div className="grid grid-cols-2 gap-4 @5xl/main:grid-cols-4">
          <StatCard label="Alle fugle" value={String(total)} sub={`${categoryRows.length} kategorier`} />
          <StatCard label="Lette" value={String(easy)} sub={`${Math.round((easy / total) * 100)}% af alle`} />
          <StatCard label="Almindelige" value={String(common)} sub={`${Math.round((common / total) * 100)}% af alle`} />
          <StatCard label="Lighedsgrupper" value={String(groupCount)} sub="Til distraktorer i quiz" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fordeling</h2>
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Kategorier</CardTitle></CardHeader>
            <CardContent>
              <BreakdownBars rows={categoryRows} total={categoryTotal} label={catLabel} colors={CAT_COLOR} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Sværhedsgrad</CardTitle></CardHeader>
            <CardContent>
              <BreakdownBars rows={diffRows} total={total} label={diffLabel} colors={DIFF_COLOR} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
