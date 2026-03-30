'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Search, Check, ImageIcon } from 'lucide-react'

// iNaturalist uses different names for some species
const INAT_NAME_MAP: Record<string, string> = {
  'Accipiter gentilis': 'Astur gentilis',
  'Charadrius dubius': 'Thinornis dubius',
}

interface Photo {
  id: number
  url: string // square thumbnail URL
  attribution: string
  license_code: string
  original_dimensions?: { width: number; height: number }
}

interface Observation {
  id: number
  photos: Photo[]
}

interface SelectedPhoto {
  thumbnailUrl: string
  largeUrl: string
  attribution: string
  license: string
  isLandscape: boolean
}

interface Props {
  scientificName: string
  onReplace: (url: string, attribution: string, license: string) => Promise<void>
}

function upgradeUrl(url: string, size: 'medium' | 'large' | 'original'): string {
  // iNaturalist URLs contain /square.jpg or /small.jpg — upgrade to requested size
  return url.replace(/\/square\.|\/small\.|\/medium\.|\/large\.|\/original\./, `/${size}.`)
}

export default function INatPhotoBrowser({ scientificName, onReplace }: Props) {
  const [photos, setPhotos] = useState<SelectedPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SelectedPhoto | null>(null)
  const [searched, setSearched] = useState(false)
  const [query, setQuery] = useState(INAT_NAME_MAP[scientificName] || scientificName)

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    setPhotos([])
    setSelected(null)
    setSearched(true)

    try {
      const searchName = encodeURIComponent(query)
      const url = `https://api.inaturalist.org/v1/observations?taxon_name=${searchName}&photos=true&quality_grade=research&per_page=20&order_by=votes&photo_license=cc-by,cc-by-nc,cc-by-sa,cc-by-nc-sa`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`iNaturalist API error: ${res.status}`)

      const data = await res.json()
      const results: SelectedPhoto[] = []
      const seen = new Set<number>()

      for (const obs of data.results as Observation[]) {
        for (const photo of obs.photos) {
          if (seen.has(photo.id)) continue
          seen.add(photo.id)

          const dims = photo.original_dimensions
          const isLandscape = dims ? dims.width > dims.height : true

          results.push({
            thumbnailUrl: upgradeUrl(photo.url, 'medium'),
            largeUrl: upgradeUrl(photo.url, 'large'),
            attribution: photo.attribution,
            license: photo.license_code || 'cc-by',
            isLandscape,
          })
        }
      }

      setPhotos(results)
      if (results.length === 0) {
        setError('Ingen billeder fundet. Prøv et andet søgenavn.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Søgning fejlede')
    } finally {
      setLoading(false)
    }
  }

  const handleUsePhoto = async () => {
    if (!selected) return
    setReplacing(true)
    setError(null)

    try {
      await onReplace(selected.largeUrl, selected.attribution, selected.license)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke erstatte billede')
    } finally {
      setReplacing(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg artsnavn..."
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button size="sm" onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Search className="size-3.5" />
          )}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
          {error}
        </div>
      )}

      {selected && (
        <div className="space-y-2 border rounded-lg p-3">
          <img
            src={selected.thumbnailUrl}
            alt="Valgt billede"
            className="w-full rounded object-contain max-h-64"
          />
          <div className="text-xs text-muted-foreground break-all">
            {selected.attribution}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleUsePhoto} disabled={replacing}>
              {replacing ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Check className="size-3.5 mr-1.5" />
              )}
              Brug dette billede
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(null)}
              disabled={replacing}
            >
              Annullér
            </Button>
          </div>
        </div>
      )}

      {photos.length > 0 && !selected && (
        <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
          {photos.map((photo, i) => (
            <button
              key={i}
              className="relative aspect-square rounded overflow-hidden border hover:ring-2 hover:ring-primary transition-all cursor-pointer"
              onClick={() => setSelected(photo)}
            >
              <img
                src={photo.thumbnailUrl}
                alt={`iNaturalist foto ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute top-1 right-1">
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1 py-0.5 rounded ${
                    photo.isLandscape
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  <ImageIcon className="size-2.5" />
                  {photo.isLandscape ? 'L' : 'P'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {searched && !loading && photos.length === 0 && !error && (
        <div className="text-sm text-muted-foreground text-center py-4">
          Ingen resultater
        </div>
      )}
    </div>
  )
}
