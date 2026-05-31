'use client'

import { useState } from 'react'
import type { Bird } from '@/lib/supabase/types'
import BirdDetailModal from './BirdDetailModal'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getSupabaseImageUrl } from '@/lib/images'
import { PLACEHOLDER_SVG } from '@/lib/placeholder'
import type { ImageAudit } from '@/lib/admin/image-status'
import { useBirdImageActions } from '@/hooks/admin/useBirdImageActions'

type Filter = 'all' | 'easy' | 'common' | 'hard' | 'flagged' | 'portrait' | 'missing'

interface BirdGridProps {
  birds: Bird[]
  audits: ImageAudit[]
}

export default function BirdGrid({ birds, audits: initialAudits }: BirdGridProps) {
  const { audits, statusByName, refreshKey, actions } = useBirdImageActions({ initialAudits })
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null)

  const auditByName = new Map(audits.map(a => [a.scientificName, a]))

  const filtered = birds.filter(bird => {
    if (search) {
      const q = search.toLowerCase()
      if (
        !bird.name_da.toLowerCase().includes(q) &&
        !bird.name_en.toLowerCase().includes(q) &&
        !bird.scientific_name.toLowerCase().includes(q)
      ) return false
    }
    const audit = auditByName.get(bird.scientific_name)
    switch (filter) {
      case 'easy': return bird.is_easy
      case 'common': return bird.is_common
      case 'hard': return !bird.is_easy && !bird.is_common
      case 'flagged': return audit?.flagged ?? false
      case 'portrait': return audit?.isPortrait ?? false
      case 'missing': return !(audit?.hasFile ?? false)
      default: return true
    }
  })

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Alle', count: birds.length },
    { key: 'easy', label: 'Lette', count: birds.filter(b => b.is_easy).length },
    { key: 'common', label: 'Almindelige', count: birds.filter(b => b.is_common).length },
    { key: 'hard', label: 'Svære', count: birds.filter(b => !b.is_easy && !b.is_common).length },
    { key: 'portrait', label: 'Billedproblemer', count: audits.filter(a => a.isPortrait).length },
    { key: 'flagged', label: 'Markerede', count: audits.filter(a => a.flagged).length },
    { key: 'missing', label: 'Intet billede', count: audits.filter(a => !a.hasFile).length },
  ]

  const selectedAudit = selectedBird ? auditByName.get(selectedBird.scientific_name) : null

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <Input
          type="text"
          placeholder="Søg fugle..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <Badge
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              className={`cursor-pointer ${
                filter === f.key && (f.key === 'flagged' || f.key === 'portrait' || f.key === 'missing')
                  ? 'bg-destructive/15 text-destructive'
                  : ''
              }`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} ({f.count})
            </Badge>
          ))}
        </div>
      </div>

      <div className="text-xs mb-4 text-muted-foreground">
        {filtered.length} af {birds.length} fugle
      </div>

      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
        {filtered.map(bird => {
          const audit = auditByName.get(bird.scientific_name)
          const status = statusByName.get(bird.scientific_name)
          const isMissing = status?.kind === 'missing'
          const imageUrl = `${getSupabaseImageUrl(bird.scientific_name)}?t=${refreshKey}`
          return (
            <Card
              key={bird.id}
              onClick={() => setSelectedBird(bird)}
              className="overflow-hidden cursor-pointer p-0"
            >
              <div className="relative bg-muted" style={{ aspectRatio: '4/3' }}>
                {isMissing ? (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    Intet foto
                  </div>
                ) : (
                  <img
                    src={imageUrl}
                    alt={bird.name_da}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_SVG }}
                  />
                )}
                {audit?.flagged && (
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-destructive" />
                )}
                {audit?.isPortrait && (
                  <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-orange-400" />
                )}
              </div>
              <CardContent className="p-3">
                <div className="font-medium text-sm">{bird.name_da}</div>
                <div className="text-xs text-muted-foreground">{bird.name_en}</div>
                <div className="text-xs italic text-muted-foreground mt-0.5">{bird.scientific_name}</div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {bird.is_easy ? (
                    <Badge variant="secondary" className="text-xs">let</Badge>
                  ) : bird.is_common ? (
                    <Badge variant="secondary" className="text-xs">alm.</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">svær</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">{bird.category}</Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedBird && selectedAudit && (
        <BirdDetailModal
          bird={selectedBird}
          audit={selectedAudit}
          imageUrl={`${getSupabaseImageUrl(selectedBird.scientific_name)}?t=${refreshKey}`}
          actions={actions}
          onClose={() => setSelectedBird(null)}
        />
      )}
    </>
  )
}
