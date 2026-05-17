'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Search, Check, ExternalLink } from 'lucide-react'

interface CommonsPhoto {
  title: string
  thumbnailUrl: string
  fullUrl: string
  descriptionUrl: string
  width: number
  height: number
  attribution: string
  license: string
  licenseUrl?: string
}

interface Props {
  scientificName: string
  onReplace: (photo: CommonsPhoto) => Promise<void>
}

export default function CommonsPhotoBrowser({ scientificName, onReplace }: Props) {
  const [photos, setPhotos] = useState<CommonsPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CommonsPhoto | null>(null)
  const [searched, setSearched] = useState(false)
  const [query, setQuery] = useState(scientificName)

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    setPhotos([])
    setSelected(null)
    setSearched(true)

    try {
      const res = await fetch(`/api/admin/images/commons?query=${encodeURIComponent(query)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Søgning fejlede: ${res.status}`)
      }
      const data = await res.json()
      setPhotos(data.results || [])
      if ((data.results || []).length === 0) {
        setError('Ingen billeder fundet. Prøv et andet søgenavn.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Søgning fejlede')
    } finally {
      setLoading(false)
    }
  }

  const autoSearched = useRef(false)
  useEffect(() => {
    if (autoSearched.current) return
    autoSearched.current = true
    handleSearch()
  }, [])

  const handleUsePhoto = async () => {
    if (!selected) return
    setReplacing(true)
    setError(null)
    try {
      await onReplace(selected)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke erstatte billede')
    } finally {
      setReplacing(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded px-3 py-2">
        <strong>Wikimedia Commons</strong> — kun CC og Public Domain billeder.
        Kredit og licens gemmes automatisk med link til Commons-siden.
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg (f.eks. artsnavn)..."
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button size="sm" onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
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
          <div className="text-xs space-y-1">
            <div className="text-muted-foreground break-all">
              {selected.attribution}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-medium">
                Licens: {selected.license.toUpperCase()}
              </span>
              <a
                href={selected.descriptionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
              >
                Commons-side <ExternalLink className="size-3" />
              </a>
            </div>
            <div className="text-muted-foreground">
              {selected.width}×{selected.height}
              {selected.width > selected.height ? ' (landscape)' : ' (portrait)'}
            </div>
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
          {photos.map((photo, i) => {
            const isLandscape = photo.width > photo.height
            return (
              <button
                key={i}
                className="relative aspect-square rounded overflow-hidden border hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                onClick={() => setSelected(photo)}
                title={photo.title}
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute top-1 right-1 flex flex-col gap-1 items-end">
                  <span
                    className={`text-[10px] font-medium px-1 py-0.5 rounded ${
                      isLandscape ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {isLandscape ? 'L' : 'P'}
                  </span>
                  <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                    {photo.license.toUpperCase()}
                  </span>
                </div>
              </button>
            )
          })}
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
