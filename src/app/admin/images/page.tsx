import { STATIC_BIRDS } from '@/lib/data/birds-static'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ImageAuditGrid from '@/components/admin/ImageAuditGrid'
import { MetadataTable } from '@/components/admin/MetadataTable'
import { ViewToggle } from '@/components/admin/ViewToggle'
import { getImageAudits } from '@/lib/admin/get-image-audits'

// Always re-read R2 so router.refresh() after an edit reflects current state.
export const dynamic = 'force-dynamic'

export default async function ImagesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  const isTable = view === 'table'
  const audits = await getImageAudits()
  const birdsByName = Object.fromEntries(STATIC_BIRDS.map(b => [b.scientific_name, b]))

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Billedaudit</CardTitle>
              <CardDescription>
                Licens, kvalitet og compliance for alle {audits.length} fuglebilleder
              </CardDescription>
            </div>
            <ViewToggle current={isTable ? 'table' : 'grid'} />
          </div>
        </CardHeader>
        <CardContent>
          {isTable
            ? <MetadataTable audits={audits} birdsByName={birdsByName} />
            : <ImageAuditGrid audits={audits} birdsByName={birdsByName} />}
        </CardContent>
      </Card>
    </div>
  )
}
