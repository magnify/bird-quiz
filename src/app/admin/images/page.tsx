import { STATIC_BIRDS } from '@/lib/data/birds-static'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ImagesPage() {
  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Billedhåndtering</CardTitle>
          <CardDescription>
            Administrer fuglebilleder — godkend, afvis eller erstat billeder
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="text-3xl font-bold tabular-nums mb-2">{STATIC_BIRDS.length}</div>
          <div className="text-sm text-muted-foreground">
            fugle klar til billedhåndtering
          </div>
          <div className="text-xs text-muted-foreground mt-4">
            Fuld billedhåndtering med godkendelse, afvisning og upload kommer i næste fase.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
