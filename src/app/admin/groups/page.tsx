import { STATIC_BIRDS, SIMILARITY_GROUPS_RAW } from '@/lib/data/birds-static'

export default function GroupsPage() {
  const birdBySci = new Map(STATIC_BIRDS.map(b => [b.scientific_name, b]))

  const groups = Object.entries(SIMILARITY_GROUPS_RAW)
    .map(([slug, sciNames]) => ({
      slug,
      name: slug.replace(/-/g, ' '),
      members: sciNames
        .map(sci => birdBySci.get(sci))
        .filter(Boolean) as typeof STATIC_BIRDS,
    }))
    .sort((a, b) => b.members.length - a.members.length)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Lighedsgrupper
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Grupper af fugle der ligner hinanden — bruges til at generere distraktorer i quizzen
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => (
          <div
            key={group.slug}
            className="rounded-xl p-4 border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                {group.name}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                {group.members.length}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {group.members.map(bird => (
                <div key={bird.id} className="text-xs flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                  <span>{bird.name_da}</span>
                  <span className="italic" style={{ color: '#4a6b5a' }}>{bird.scientific_name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
