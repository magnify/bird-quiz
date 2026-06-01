import { STATIC_BIRDS } from '@/lib/data/birds-static'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ImageAuditGrid from '@/components/admin/ImageAuditGrid'
import { getImageAudits } from '@/lib/admin/get-image-audits'

// Always re-read R2 so router.refresh() after an edit reflects current state.
export const dynamic = 'force-dynamic'

export default async function ImagesPage() {
  const audits = await getImageAudits()
  const birdsByName = Object.fromEntries(STATIC_BIRDS.map(b => [b.scientific_name, b]))

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Billedaudit</CardTitle>
          <CardDescription>
            Licens, kvalitet og compliance for alle {audits.length} fuglebilleder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageAuditGrid audits={audits} birdsByName={birdsByName} />
        </CardContent>
      </Card>
    </div>
  )
}
