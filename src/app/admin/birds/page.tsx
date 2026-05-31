import { getBirds } from '@/lib/data/birds'
import BirdGrid from '@/components/admin/BirdGrid'
import { getImageAudits } from '@/lib/admin/get-image-audits'

export default async function BirdsPage() {
  const [{ birds }, audits] = await Promise.all([getBirds(), getImageAudits()])

  return (
    <div className="px-4 lg:px-6">
      <BirdGrid birds={birds} audits={audits} />
    </div>
  )
}
