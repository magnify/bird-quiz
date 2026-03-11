import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AnalyticsPage() {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Quiz-analyse</CardTitle>
          <CardDescription>
            Quiz-statistik, brugeranalyse og sværhedsdata
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="text-sm text-muted-foreground">
            Quiz-sessioner, svartider, sværhedsfordeling og brugerengagement.
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Kræver Supabase-forbindelse og quiz-tracking (fase 5).
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
