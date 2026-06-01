import { getBirds } from '@/lib/data/birds'
import BirdGrid from '@/components/admin/BirdGrid'
import { getImageAudits } from '@/lib/admin/get-image-audits'

// Always re-read R2 so router.refresh() after an edit reflects current state.
export const dynamic = 'force-dynamic'

export default async function BirdsPage() {
  const [{ birds }, audits] = await Promise.all([getBirds(), getImageAudits()])

  return (
    <div className="px-4 lg:px-6">
      <BirdGrid birds={birds} audits={audits} />
    </div>
  )
}
