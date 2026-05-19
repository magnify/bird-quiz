import { getBirds } from '@/lib/data/birds'
import { getFlaggedScientificNames } from '@/app/actions/birds'
import BirdGrid from '@/components/admin/BirdGrid'

export default async function BirdsPage() {
  const { birds } = await getBirds()
  const flaggedNames = await getFlaggedScientificNames()

  return (
    <div className="px-4 lg:px-6">
      <BirdGrid birds={birds} initialFlaggedBirdIds={[...flaggedNames]} />
    </div>
  )
}
