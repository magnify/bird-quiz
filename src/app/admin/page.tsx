import { STATIC_BIRDS } from '@/lib/data/birds-static'

export default function AdminDashboard() {
  const birds = STATIC_BIRDS
  const total = birds.length
  const easy = birds.filter(b => b.is_easy).length
  const common = birds.filter(b => b.is_common).length
  const categories = birds.reduce((acc, b) => {
    acc[b.category] = (acc[b.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const cards = [
    { label: 'Alle fugle', value: total, color: 'var(--accent)' },
    { label: 'Lette fugle', value: easy, color: '#4ade80' },
    { label: 'Almindelige', value: common, color: '#fbbf24' },
    { label: 'Alle fugle (pool)', value: total, color: 'var(--text-secondary)' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Oversigt
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        Dashboard for Dansk Fugleviden
      </p>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div
            key={card.label}
            className="rounded-xl p-5 border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              {card.label}
            </div>
            <div className="text-3xl font-bold" style={{ color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="rounded-xl p-5 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          Kategorier
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <div
              key={cat}
              className="flex items-center justify-between px-4 py-3 rounded-lg"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <span className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>
                {cat}
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty breakdown */}
      <div className="rounded-xl p-5 border mt-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
          Sværhedsfordeling
        </h2>
        <div className="space-y-3">
          {[
            { label: 'Lette fugle', count: easy, color: '#4ade80' },
            { label: 'Almindelige fugle', count: common, color: '#fbbf24' },
            { label: 'Alle fugle', count: total, color: 'var(--text-secondary)' },
          ].map(row => (
            <div key={row.label}>
              <div className="flex justify-between mb-1">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span className="text-sm font-semibold" style={{ color: row.color }}>{row.count}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(row.count / total) * 100}%`, background: row.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
