import Link from 'next/link'
import { getAdminStats } from '@/app/actions/admin'
import { DEFAULT_RANGE, rangeDaysFor, type SessionRow } from '@/lib/admin/analytics'
import { IntervalPicker } from '@/components/admin/IntervalPicker'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/admin/StatCard'
import { BreakdownBars } from '@/components/admin/BreakdownBars'
import { SessionsAreaChart } from '@/components/admin/SessionsAreaChart'
import { HourlyChart } from '@/components/admin/HourlyChart'
import { SectionHeading } from '@/components/admin/SectionHeading'
import { HardestBirdsList } from '@/components/admin/HardestBirdsList'
import { ConfusionsList } from '@/components/admin/ConfusionsList'
import { countryNameDa, flagEmoji } from '@/lib/admin/countries'
import {
  DIFF_COLOR, MODE_COLOR, DEVICE_COLOR, LANG_COLOR,
  difficultyLabel, modeLabel, deviceLabel, languageLabel, formatDuration, playerLabel,
} from '@/lib/admin/labels'

function PlayerList({ rows, metric }: { rows: SessionRow[]; metric: (s: SessionRow) => React.ReactNode }) {
  return (
    <div className="space-y-2">
      {rows.map(s => (
        <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
          {s.guest_id
            ? <Link href={`/admin/players/${s.guest_id}`} className="truncate min-w-0 hover:underline">{playerLabel(s.guest_name, s.guest_id)}</Link>
            : <span className="truncate min-w-0">{playerLabel(s.guest_name, s.guest_id)}</span>}
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary">{difficultyLabel(s.difficulty)}</Badge>
            {metric(s)}
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams
  const rangeKey = range ?? DEFAULT_RANGE
  const stats = await getAdminStats(rangeDaysFor(rangeKey))
  const sampleTotal = stats.difficultyBreakdown.reduce((a, b) => a + b.count, 0)
  const countryTotal = stats.topCountries.reduce((a, b) => a + b.count, 0)
  const deviceTotal = stats.deviceBreakdown.reduce((a, b) => a + b.count, 0)
  const languageTotal = stats.languageBreakdown.reduce((a, b) => a + b.count, 0)
  const topCountry = stats.topCountries[0]
  const countryRows = stats.topCountries.map(c => ({ key: c.country, count: c.count }))

  return (
    <div className="px-4 lg:px-6 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Analyse</h1>
        <IntervalPicker current={rangeKey} />
      </div>

      {!stats.healthy && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          ⚠ Sporing offline — databasen kan ikke nås
          {stats.error ? ` (${stats.error})` : ''}. Tjek Supabase-projektet (måske sat på pause).
          Ingen quizdata gemmes, så længe den er nede.
        </div>
      )}

      {/* 1 · Brug & vækst */}
      <section className="space-y-4">
        <SectionHeading>Brug & vækst</SectionHeading>
        <div className="grid grid-cols-2 gap-4 @5xl/main:grid-cols-4">
          <StatCard label="Fuldførte" value={String(stats.completedSessions)} sub={`${stats.totalSessions} startet · ${stats.completionRate}% fuldført`} />
          <StatCard label="Aktive nu" value={String(stats.activeSessions)} sub="Startet, ikke fuldført (15 min)" accent={stats.activeSessions > 0} />
          <StatCard label="Spillere" value={String(stats.totalPlayers)} sub={`${stats.returningPlayers} tilbagevendende`} />
          <StatCard label="Spørgsmål/quiz" value={stats.avgQuestions !== null ? String(stats.avgQuestions) : '—'} sub={`Gns. varighed ${formatDuration(stats.avgDurationMs)}`} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sessioner pr. dag</CardTitle>
            <CardDescription>{rangeKey === 'all' ? 'Seneste 30 dage' : 'Valgt periode'}</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionsAreaChart data={stats.sessionsPerDay} />
          </CardContent>
        </Card>
      </section>

      {/* 1b · Hvem spiller */}
      <section className="space-y-4">
        <SectionHeading>Hvem spiller</SectionHeading>
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Lande</CardTitle>
              <CardDescription>
                {topCountry
                  ? `Mest fra ${flagEmoji(topCountry.country)} ${countryNameDa(topCountry.country)} (${Math.round((topCountry.count / countryTotal) * 100)}%)`
                  : 'Hvor spillerne er fra'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {countryTotal === 0
                ? <p className="text-sm text-muted-foreground">Ingen lokationsdata endnu</p>
                : <BreakdownBars rows={countryRows} total={countryTotal} label={c => `${flagEmoji(c)} ${countryNameDa(c)}`} colors={{}} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Enheder</CardTitle>
              <CardDescription>Mobil, computer eller tablet</CardDescription>
            </CardHeader>
            <CardContent>
              {deviceTotal === 0
                ? <p className="text-sm text-muted-foreground">Ingen enhedsdata endnu</p>
                : <BreakdownBars rows={stats.deviceBreakdown} total={deviceTotal} label={deviceLabel} colors={DEVICE_COLOR} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sprog</CardTitle>
              <CardDescription>Dansk eller engelsk</CardDescription>
            </CardHeader>
            <CardContent>
              {languageTotal === 0
                ? <p className="text-sm text-muted-foreground">Ingen sprogdata endnu</p>
                : <BreakdownBars rows={stats.languageBreakdown} total={languageTotal} label={languageLabel} colors={LANG_COLOR} />}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Tidspunkt på dagen</CardTitle>
            <CardDescription>Sessioner pr. time (dansk tid)</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.hourly.every(h => h.count === 0)
              ? <p className="text-sm text-muted-foreground">Ingen data i perioden</p>
              : <HourlyChart data={stats.hourly} />}
          </CardContent>
        </Card>
      </section>

      {/* 2 · Sådan spilles der */}
      <section className="space-y-4">
        <SectionHeading>Sådan spilles der</SectionHeading>
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Sværhedsgrad</CardTitle></CardHeader>
            <CardContent>
              {sampleTotal === 0 ? <p className="text-sm text-muted-foreground">Ingen data i perioden</p>
                : <BreakdownBars rows={stats.difficultyBreakdown} total={sampleTotal} label={difficultyLabel} colors={DIFF_COLOR} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Quiz-type</CardTitle></CardHeader>
            <CardContent>
              {sampleTotal === 0 ? <p className="text-sm text-muted-foreground">Ingen data i perioden</p>
                : <BreakdownBars rows={stats.modeBreakdown} total={sampleTotal} label={modeLabel} colors={MODE_COLOR} />}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3 · Fugle: sværhed & forvekslinger */}
      <section className="space-y-4">
        <SectionHeading>Fugle: sværhed & forvekslinger</SectionHeading>
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sværeste fugle</CardTitle>
              <CardDescription>Laveste rigtig-procent (min. 5 visninger)</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.hardestBirds.length === 0
                ? <p className="text-sm text-muted-foreground">Ikke nok data i perioden</p>
                : <HardestBirdsList birds={stats.hardestBirds} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Forvekslinger</CardTitle>
              <CardDescription>Hvad blev valgt i stedet (rigtig → valgt)</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.confusions.length === 0
                ? <p className="text-sm text-muted-foreground">Ikke nok data i perioden</p>
                : <ConfusionsList confusions={stats.confusions} />}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4 · Scores & topspillere */}
      <section className="space-y-4">
        <SectionHeading>Scores & topspillere</SectionHeading>
        <div className="grid grid-cols-2 gap-4 @5xl/main:grid-cols-2">
          <StatCard label="Gns. score" value={stats.avgScore !== null ? `${stats.avgScore}%` : '—'} sub="Af fuldførte quizzer" />
          <StatCard label="Gns. point" value={stats.avgPoints !== null ? stats.avgPoints.toLocaleString('da-DK') : '—'} sub="Per fuldført quiz" />
        </div>
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Topspillere</CardTitle><CardDescription>Højeste point</CardDescription></CardHeader>
            <CardContent>
              {stats.topSessions.length === 0 ? <p className="text-sm text-muted-foreground">Ingen sessioner i perioden</p>
                : <PlayerList rows={stats.topSessions} metric={s => <span className="text-xs text-muted-foreground tabular-nums">{(s.points ?? 0).toLocaleString('da-DK')} pt</span>} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Seneste resultater</CardTitle><CardDescription>De 10 seneste fuldførte</CardDescription></CardHeader>
            <CardContent>
              {stats.recentSessions.length === 0 ? <p className="text-sm text-muted-foreground">Ingen sessioner i perioden</p>
                : <PlayerList rows={stats.recentSessions} metric={s => <span className="tabular-nums">{s.score}/{s.question_count}</span>} />}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
