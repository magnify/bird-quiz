import { getBirds } from '@/lib/data/birds'
import { getFlaggedBirdIds } from '@/app/actions/birds'
import BirdGrid from '@/components/admin/BirdGrid'

export default async function BirdsPage() {
  const { birds } = await getBirds()
  const flaggedBirdIds = await getFlaggedBirdIds()

  return (
    <div className="px-4 lg:px-6">
      <BirdGrid birds={birds} initialFlaggedBirdIds={[...flaggedBirdIds]} />
    </div>
  )
}
