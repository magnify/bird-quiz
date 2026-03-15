'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Bird } from '@/lib/supabase/types'
import BirdDetailModal from './BirdDetailModal'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type Filter = 'all' | 'easy' | 'common' | 'hard' | 'flagged' | 'portrait'

interface ImageData {
  url: string | null
  source: 'local'
  status: 'loaded'
}

function getLocalImageUrl(scientificName: string): string {
  const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
  return `/images/birds/${slug}.jpg`
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

const FLAG_KEY = 'bird_admin_flags'

function loadFlags(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(FLAG_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function saveFlags(flags: Set<string>) {
  localStorage.setItem(FLAG_KEY, JSON.stringify([...flags]))
}

export default function BirdGrid({ birds }: { birds: Bird[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null)

  // Build image data map from local files (instant, no fetching)
  const imageData = new Map<string, ImageData>(
    birds.map(b => [b.id, { url: getLocalImageUrl(b.scientific_name), source: 'local', status: 'loaded' }])
  )

  // Load flags from localStorage
  useEffect(() => {
    setFlagged(loadFlags())
  }, [])

  const toggleFlag = useCallback((birdId: string) => {
    setFlagged(prev => {
      const next = new Set(prev)
      const sci = birds.find(b => b.id === birdId)?.scientific_name
      if (!sci) return prev
      if (next.has(sci)) next.delete(sci)
      else next.add(sci)
      saveFlags(next)
      return next
    })
  }, [birds])

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
      case 'flagged': return flagged.has(bird.scientific_name)
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
    { key: 'flagged', label: 'Markerede', count: flagged.size },
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
          const isFlagged = flagged.has(bird.scientific_name)
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
          isFlagged={flagged.has(selectedBird.scientific_name)}
          onToggleFlag={() => toggleFlag(selectedBird.id)}
          onClose={() => setSelectedBird(null)}
        />
      )}
    </>
  )
}
