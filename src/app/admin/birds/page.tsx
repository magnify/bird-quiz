import { STATIC_BIRDS } from '@/lib/data/birds-static'
import BirdGrid from '@/components/admin/BirdGrid'

export default function BirdsPage() {
  return (
    <div className="px-4 lg:px-6">
      <BirdGrid birds={STATIC_BIRDS} />
    </div>
  )
}
