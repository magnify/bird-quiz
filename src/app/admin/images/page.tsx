import { STATIC_BIRDS } from '@/lib/data/birds-static'

export default function ImagesPage() {
  const total = STATIC_BIRDS.length
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Billeder
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Administrer fuglebilleder — godkend, afvis eller erstat billeder
      </p>
      <div
        className="rounded-xl p-8 border text-center"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="text-4xl mb-3" style={{ color: 'var(--accent)' }}>{total}</div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          fugle klar til billedhåndtering
        </div>
        <div className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Fuld billedhåndtering med godkendelse, afvisning og upload kommer i næste fase.
        </div>
      </div>
    </div>
  )
}
