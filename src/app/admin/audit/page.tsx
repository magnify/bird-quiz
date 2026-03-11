import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuditPage() {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Logbog</CardTitle>
          <CardDescription>
            Audit log — alle ændringer til fugle, billeder og grupper
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="text-sm text-muted-foreground">
            Alle admin-handlinger logges med tidsstempel, bruger og ændringer.
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Kræver Supabase-forbindelse og admin-autentificering (fase 6).
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
