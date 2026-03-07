import { STATIC_BIRDS } from '@/lib/data/birds-static'
import BirdGrid from '@/components/admin/BirdGrid'

export default function BirdsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Fugle
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Klik en fugl for detaljer — kontroller billeder, kilder og data
      </p>
      <BirdGrid birds={STATIC_BIRDS} />
    </div>
  )
}
