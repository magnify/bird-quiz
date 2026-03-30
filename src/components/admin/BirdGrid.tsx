'use client'

import { useState, useCallback } from 'react'
import type { Bird } from '@/lib/supabase/types'
import BirdDetailModal from './BirdDetailModal'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { flagBirdImage, unflagBirdImage } from '@/app/actions/birds'
import { getBirdImageUrl } from '@/lib/images'

type Filter = 'all' | 'easy' | 'common' | 'hard' | 'flagged' | 'portrait'

interface ImageData {
  url: string | null
  source: 'supabase'
  status: 'loaded'
}

// Birds with portrait or square images (ratio <= 1.0) that crop poorly
const PORTRAIT_IMAGES = new Set([
  'Falco columbarius',
  'Dryocopus martius',
  'Certhia familiaris',
  'Picus viridis',
  'Aegithalos caudatus',
  'Falco peregrinus',
  'Dendrocopos major',
  'Loxia pytyopsittacus',
  'Cyanistes caeruleus',
  'Acrocephalus palustris',
  'Falco tinnunculus',
  'Lophophanes cristatus',
  'Milvus milvus',
  'Nucifraga caryocatactes',
  'Remiz pendulinus',
  'Strix aluco',
])

interface BirdGridProps {
  birds: Bird[]
  initialFlaggedBirdIds: string[]
}

export default function BirdGrid({ birds, initialFlaggedBirdIds }: BirdGridProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set(initialFlaggedBirdIds))
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null)
  const [imageVersions, setImageVersions] = useState<Map<string, number>>(() => new Map())

  // Build image data map from Supabase Storage URLs with cache-busting
  const imageData = new Map<string, ImageData>(
    birds.map(b => {
      const version = imageVersions.get(b.id)
      const url = getBirdImageUrl(b.scientific_name) + (version ? `?v=${version}` : '')
      return [b.id, { url, source: 'supabase', status: 'loaded' }]
    })
  )

  const handleImageChanged = useCallback((birdId: string) => {
    setImageVersions(prev => {
      const next = new Map(prev)
      next.set(birdId, Date.now())
      return next
    })
  }, [])

  const toggleFlag = useCallback((birdId: string) => {
    setFlaggedIds(prev => {
      const next = new Set(prev)
      if (next.has(birdId)) {
        next.delete(birdId)
        unflagBirdImage(birdId)
      } else {
        next.add(birdId)
        flagBirdImage(birdId, 'needs_replacement')
      }
      return next
    })
  }, [])

  // Filter birds
  const filtered = birds.filter(bird => {
    if (search) {
      const q = search.toLowerCase()
      if (
        !bird.name_da.toLowerCase().includes(q) &&
        !bird.name_en.toLowerCase().includes(q) &&
        !bird.scientific_name.toLowerCase().includes(q)
      ) return false
    }
    switch (filter) {
      case 'easy': return bird.is_easy
      case 'common': return bird.is_common
      case 'hard': return !bird.is_easy && !bird.is_common
      case 'flagged': return flaggedIds.has(bird.id)
      case 'portrait': return PORTRAIT_IMAGES.has(bird.scientific_name)
      default: return true
    }
  })

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Alle', count: birds.length },
    { key: 'easy', label: 'Lette', count: birds.filter(b => b.is_easy).length },
    { key: 'common', label: 'Almindelige', count: birds.filter(b => b.is_common).length },
    { key: 'hard', label: 'Svære', count: birds.filter(b => !b.is_easy && !b.is_common).length },
    { key: 'portrait', label: 'Billedproblemer', count: PORTRAIT_IMAGES.size },
    { key: 'flagged', label: 'Markerede', count: flaggedIds.size },
  ]

  return (
    <>
      {/* Toolbar */}
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
                filter === f.key && (f.key === 'flagged' || f.key === 'portrait')
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

      {/* Status */}
      <div className="text-xs mb-4 text-muted-foreground">
        {filtered.length} af {birds.length} fugle
      </div>

      {/* Grid */}
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
        {filtered.map(bird => {
          const img = imageData.get(bird.id)
          const isFlagged = flaggedIds.has(bird.id)
          const isPortrait = PORTRAIT_IMAGES.has(bird.scientific_name)
          return (
            <Card
              key={bird.id}
              onClick={() => setSelectedBird(bird)}
              className="overflow-hidden cursor-pointer p-0"
            >
              <div className="relative bg-muted" style={{ aspectRatio: '4/3' }}>
                {img?.url ? (
                  <img
                    src={img.url}
                    alt={bird.name_da}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    Intet foto
                  </div>
                )}
                {isFlagged && (
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-destructive" />
                )}
                {isPortrait && (
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

      {selectedBird && (
        <BirdDetailModal
          bird={selectedBird}
          imageData={imageData.get(selectedBird.id) || null}
          isFlagged={flaggedIds.has(selectedBird.id)}
          onToggleFlag={() => toggleFlag(selectedBird.id)}
          onClose={() => setSelectedBird(null)}
          onImageChanged={() => handleImageChanged(selectedBird.id)}
        />
      )}
    </>
  )
}
