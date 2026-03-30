import { getAdminStats } from '@/app/actions/admin'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function AnalyticsPage() {
  const stats = await getAdminStats()

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Quiz-sessioner</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stats.completedSessions}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.totalSessions} i alt ({stats.totalSessions - stats.completedSessions} ufærdige)
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Spillere</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stats.totalPlayers}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Unikke gæste-IDer
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Gns. score</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.avgScore !== null ? `${stats.avgScore}%` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Af fuldførte quizzer
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Gns. point</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.avgPoints !== null ? stats.avgPoints.toLocaleString('da-DK') : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Per fuldført quiz
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Seneste resultater</CardTitle>
            <CardDescription>De 10 seneste fuldførte quizzer</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen sessioner endnu</p>
            ) : (
              <div className="space-y-2">
                {stats.recentSessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[120px]">
                      {s.guest_name || 'Anonym'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{s.difficulty}</Badge>
                      <span className="tabular-nums">{s.score}/{s.question_count}</span>
                      {s.points !== null && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {s.points.toLocaleString('da-DK')} pt
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sværeste fugle</CardTitle>
            <CardDescription>Laveste rigtig-procent (min. 5 visninger)</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.hardestBirds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ikke nok data endnu</p>
            ) : (
              <div className="space-y-2">
                {stats.hardestBirds.map(b => (
                  <div key={b.bird_id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{b.bird_name_da}</span>
                      <span className="text-xs text-muted-foreground ml-2 italic">
                        {b.scientific_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{b.accuracy}%</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        ({b.times_correct}/{b.times_shown})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
