import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getPlayerDetail } from '@/app/actions/players'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/admin/StatCard'
import { BreakdownBars } from '@/components/admin/BreakdownBars'
import { SessionsAreaChart } from '@/components/admin/SessionsAreaChart'
import { HourlyChart } from '@/components/admin/HourlyChart'
import { SectionHeading } from '@/components/admin/SectionHeading'
import { HardestBirdsList } from '@/components/admin/HardestBirdsList'
import { ConfusionsList } from '@/components/admin/ConfusionsList'
import {
  DIFF_COLOR, MODE_COLOR, DEVICE_COLOR,
  difficultyLabel, modeLabel, deviceLabel, formatDuration, playerLabel, relativeTimeDa,
} from '@/lib/admin/labels'
import { flagEmoji, countryNameDa } from '@/lib/admin/countries'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
}

function BackLink() {
  return (
    <Link href="/admin/players" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
      <ArrowLeft className="size-4" /> Spillere
    </Link>
  )
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = await params
  const p = await getPlayerDetail(guestId)

  if (!p.found) {
    return (
      <div className="px-4 lg:px-6 space-y-4">
        <BackLink />
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Ingen data for denne spiller.
          </CardContent>
        </Card>
      </div>
    )
  }

  const diffTotal = p.difficultyBreakdown.reduce((a, b) => a + b.count, 0)
  const modeTotal = p.modeBreakdown.reduce((a, b) => a + b.count, 0)
  const deviceTotal = p.devices.reduce((a, b) => a + b.count, 0)

  return (
    <div className="px-4 lg:px-6 space-y-8">
      <div className="space-y-2">
        <BackLink />
        <div className="flex flex-wrap items-center gap-2">
          {p.country && <span className="text-xl" title={countryNameDa(p.country)}>{flagEmoji(p.country)}</span>}
          <h1 className="text-lg font-semibold">{playerLabel(p.guestName, p.guestId)}</h1>
          <span className="text-xs text-muted-foreground font-mono">{p.guestId}</span>
        </div>
      </div>

      {/* Aktivitet */}
      <section className="space-y-4">
        <SectionHeading>Aktivitet</SectionHeading>
        <div className="grid grid-cols-2 gap-4 @5xl/main:grid-cols-4">
          <StatCard label="Quizzer" value={String(p.totalSessions)} sub={`${p.completedSessions} fuldført · ${p.completionRate}%`} />
          <StatCard label="Aktive dage" value={String(p.daysActive)} sub={`Længste stime ${p.longestStreak} dage`} />
          <StatCard label="Først set" value={formatDate(p.firstSeen)} />
          <StatCard label="Sidst set" value={p.lastSeen ? relativeTimeDa(p.lastSeen) : '—'} sub={formatDate(p.lastSeen)} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Quizzer pr. dag</CardTitle>
            <CardDescription>Seneste 30 dage</CardDescription>
          </CardHeader>
          <CardContent>
            {p.sessionsPerDay.every(d => d.count === 0)
              ? <p className="text-sm text-muted-foreground">Ingen aktivitet de seneste 30 dage</p>
              : <SessionsAreaChart data={p.sessionsPerDay} />}
          </CardContent>
        </Card>
      </section>

      {/* Resultater */}
      <section className="space-y-4">
        <SectionHeading>Resultater</SectionHeading>
        <div className="grid grid-cols-2 gap-4 @5xl/main:grid-cols-4">
          <StatCard label="Gns. score" value={p.avgScore !== null ? `${p.avgScore}%` : '—'} />
          <StatCard label="Bedste score" value={p.bestScore !== null ? `${p.bestScore}%` : '—'} />
          <StatCard label="Point i alt" value={p.totalPoints.toLocaleString('da-DK')} sub={p.avgPoints !== null ? `Gns. ${p.avgPoints.toLocaleString('da-DK')}/quiz` : undefined} />
          <StatCard label="Gns. svartid" value={p.avgResponseMs !== null ? formatDuration(p.avgResponseMs) : '—'} />
        </div>
      </section>

      {/* Fugle */}
      <section className="space-y-4">
        <SectionHeading>Fugle</SectionHeading>
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sværeste fugle</CardTitle>
              <CardDescription>Laveste rigtig-procent (min. 2 visninger)</CardDescription>
            </CardHeader>
            <CardContent>
              {p.hardestBirds.length === 0
                ? <p className="text-sm text-muted-foreground">Ikke nok data</p>
                : <HardestBirdsList birds={p.hardestBirds} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mest missede</CardTitle>
              <CardDescription>Flest forkerte svar</CardDescription>
            </CardHeader>
            <CardContent>
              {p.missedBirds.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ingen forkerte svar endnu</p>
              ) : (
                <div className="space-y-2">
                  {p.missedBirds.map(b => (
                    <div key={b.bird_id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium truncate min-w-0">{b.bird_name_da}</span>
                      <span className="tabular-nums text-muted-foreground shrink-0">{b.count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {p.confusions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Forvekslinger</CardTitle>
              <CardDescription>Hvad blev valgt i stedet (rigtig → valgt)</CardDescription>
            </CardHeader>
            <CardContent>
              <ConfusionsList confusions={p.confusions} />
            </CardContent>
          </Card>
        )}
      </section>

      {/* Kontekst */}
      <section className="space-y-4">
        <SectionHeading>Kontekst</SectionHeading>
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Sværhedsgrad</CardTitle></CardHeader>
            <CardContent>
              {diffTotal === 0 ? <p className="text-sm text-muted-foreground">Ingen data</p>
                : <BreakdownBars rows={p.difficultyBreakdown} total={diffTotal} label={difficultyLabel} colors={DIFF_COLOR} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Quiz-type</CardTitle></CardHeader>
            <CardContent>
              {modeTotal === 0 ? <p className="text-sm text-muted-foreground">Ingen data</p>
                : <BreakdownBars rows={p.modeBreakdown} total={modeTotal} label={modeLabel} colors={MODE_COLOR} />}
            </CardContent>
          </Card>
        </div>
        {deviceTotal > 0 && (
          <Card>
            <CardHeader><CardTitle>Enheder</CardTitle></CardHeader>
            <CardContent>
              <BreakdownBars rows={p.devices} total={deviceTotal} label={deviceLabel} colors={DEVICE_COLOR} />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Tidspunkt på dagen</CardTitle>
            <CardDescription>Dansk tid</CardDescription>
          </CardHeader>
          <CardContent>
            {p.hourly.every(h => h.count === 0)
              ? <p className="text-sm text-muted-foreground">Ingen data</p>
              : <HourlyChart data={p.hourly} />}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
