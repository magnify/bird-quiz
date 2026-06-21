import { getAdminStats } from '@/app/actions/admin'
import { DEFAULT_RANGE, rangeDaysFor, type SessionRow } from '@/lib/admin/analytics'
import { IntervalPicker } from '@/components/admin/IntervalPicker'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const DIFF_COLOR: Record<string, string> = { easy: 'bg-emerald-500', common: 'bg-sky-500', hard: 'bg-amber-500', all: 'bg-slate-400' }
const MODE_COLOR: Record<string, string> = { photo: 'bg-violet-500', name: 'bg-rose-500', mixed: 'bg-teal-500' }

function difficultyLabel(d: string): string {
  return { easy: 'Lette', common: 'Almindelige', hard: 'Svære', all: 'Alle' }[d] ?? d
}
function modeLabel(m: string): string {
  return { photo: 'Foto', name: 'Navn', mixed: 'Blandet' }[m] ?? m
}
function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m === 0 ? `${s}s` : `${m}m ${s % 60}s`
}
function playerLabel(s: SessionRow): string {
  return s.guest_name || (s.guest_id ? `Gæst ${s.guest_id.slice(0, 6)}` : 'Anonym')
}
function accuracyColor(pct: number): string {
  return pct < 30 ? 'text-red-600' : pct < 50 ? 'text-amber-600' : 'text-muted-foreground'
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
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

function BreakdownBars({ rows, total, label, colors }: {
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

function PlayerList({ rows, metric }: { rows: SessionRow[]; metric: (s: SessionRow) => React.ReactNode }) {
  return (
    <div className="space-y-2">
      {rows.map(s => (
        <div key={s.id} className="flex items-center justify-between text-sm">
          <span className="truncate max-w-[140px]">{playerLabel(s)}</span>
          <div className="flex items-center gap-2">
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
  const maxDay = Math.max(1, ...stats.sessionsPerDay.map(d => d.count))

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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Brug & vækst</h2>
        <div className="grid grid-cols-2 gap-4 @5xl/main:grid-cols-4">
          <StatCard label="Fuldførte" value={String(stats.completedSessions)} sub={`${stats.totalSessions} startet · ${stats.completionRate}% fuldført`} />
          <StatCard label="Aktive nu" value={String(stats.activeSessions)} sub="Startet, ikke fuldført (15 min)" accent={stats.activeSessions > 0} />
          <StatCard label="Spillere" value={String(stats.totalPlayers)} sub={`${stats.returningPlayers} tilbagevendende`} />
          <StatCard label="Spørgsmål/quiz" value={stats.avgQuestions !== null ? String(stats.avgQuestions) : '—'} sub={`Gns. varighed ${formatDuration(stats.avgDurationMs)}`} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sessioner pr. dag</CardTitle>
            <CardDescription>Valgt periode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24">
              {stats.sessionsPerDay.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${d.date}: ${d.count}`}>
                  <div className="w-full rounded-t bg-sky-500/80 min-h-px" style={{ height: `${(d.count / maxDay) * 100}%` }} />
                  <span className="text-[10px] text-muted-foreground tabular-nums">{d.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2 · Sådan spilles der */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sådan spilles der</h2>
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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fugle: sværhed & forvekslinger</h2>
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Sværeste fugle</CardTitle>
              <CardDescription>Laveste rigtig-procent (min. 5 visninger)</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.hardestBirds.length === 0 ? <p className="text-sm text-muted-foreground">Ikke nok data i perioden</p> : (
                <div className="space-y-2">
                  {stats.hardestBirds.map(b => (
                    <div key={b.bird_id} className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{b.bird_name_da}</span>
                      <span className={cn('tabular-nums', accuracyColor(b.accuracy))}>{b.accuracy}% ({b.times_correct}/{b.times_shown})</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Forvekslinger</CardTitle>
              <CardDescription>Hvad blev valgt i stedet (rigtig → valgt)</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.confusions.length === 0 ? <p className="text-sm text-muted-foreground">Ikke nok data i perioden</p> : (
                <div className="space-y-2">
                  {stats.confusions.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate">{c.actualName} <span className="text-muted-foreground">→ {c.chosenName}</span></span>
                      <span className="tabular-nums text-muted-foreground">{c.count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4 · Scores & topspillere */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Scores & topspillere</h2>
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
