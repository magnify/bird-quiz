import Link from 'next/link'
import { getActivePlayers } from '@/app/actions/players'
import { DEFAULT_RANGE, rangeDaysFor } from '@/lib/admin/analytics'
import { IntervalPicker } from '@/components/admin/IntervalPicker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { playerLabel, deviceLabel, relativeTimeDa } from '@/lib/admin/labels'
import { flagEmoji, countryNameDa } from '@/lib/admin/countries'

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams
  const rangeKey = range ?? DEFAULT_RANGE
  const players = await getActivePlayers(rangeDaysFor(rangeKey))

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Spillere</h1>
        <IntervalPicker current={rangeKey} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mest aktive</CardTitle>
          <CardDescription>Sorteret efter antal quizzer i perioden</CardDescription>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen spillere i perioden</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Spiller</th>
                    <th className="py-2 px-3 font-medium text-right">Quizzer</th>
                    <th className="py-2 px-3 font-medium text-right">Point</th>
                    <th className="py-2 px-3 font-medium text-right">Bedste</th>
                    <th className="py-2 pl-3 font-medium text-right">Sidst set</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(p => (
                    <tr key={p.guestId} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-3">
                        <Link href={`/admin/players/${p.guestId}`} className="flex items-center gap-2 hover:underline">
                          {p.country && <span title={countryNameDa(p.country)}>{flagEmoji(p.country)}</span>}
                          <span className="truncate min-w-0">{playerLabel(p.guestName, p.guestId)}</span>
                          {p.device && <Badge variant="secondary" className="shrink-0">{deviceLabel(p.device)}</Badge>}
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {p.sessions}<span className="text-muted-foreground"> / {p.completed}</span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{p.totalPoints.toLocaleString('da-DK')}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{p.bestScorePct !== null ? `${p.bestScorePct}%` : '—'}</td>
                      <td className="py-2 pl-3 text-right text-muted-foreground">{relativeTimeDa(p.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
