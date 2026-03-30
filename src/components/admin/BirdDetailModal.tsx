'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Bird } from '@/lib/supabase/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Flag, ExternalLink, Crop, Replace, X, Pencil, Check, Loader2 } from 'lucide-react'
import ImageCropEditor from './ImageCropEditor'
import ImageUploader from './ImageUploader'
import INatPhotoBrowser from './INatPhotoBrowser'

interface ImageData {
  url: string | null
  source: string
  status: string
}

interface Props {
  bird: Bird
  imageData: ImageData | null
  isFlagged: boolean
  onToggleFlag: () => void
  onClose: () => void
  onImageChanged?: () => void
}

type ReplaceTab = 'upload' | 'inaturalist'

export default function BirdDetailModal({ bird, imageData, isFlagged, onToggleFlag, onClose, onImageChanged }: Props) {
  const [cropping, setCropping] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [replaceTab, setReplaceTab] = useState<ReplaceTab>('inaturalist')
  const [imageUrl, setImageUrl] = useState(imageData?.url ?? null)

  const [credit, setCredit] = useState<string | null>(null)
  const [editingCredit, setEditingCredit] = useState(false)
  const [creditDraft, setCreditDraft] = useState('')
  const [savingCredit, setSavingCredit] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/images/credit?bird=${encodeURIComponent(bird.scientific_name)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.attribution) setCredit(data.attribution)
      })
      .catch(() => {})
  }, [bird.scientific_name])

  const saveCredit = useCallback(async () => {
    setSavingCredit(true)
    try {
      const res = await fetch('/api/admin/images/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scientificName: bird.scientific_name, attribution: creditDraft }),
      })
      if (res.ok) {
        setCredit(creditDraft || null)
        setEditingCredit(false)
      }
    } catch {}
    setSavingCredit(false)
  }, [bird.scientific_name, creditDraft])

  const wikiUrl = `https://da.wikipedia.org/wiki/${encodeURIComponent(bird.scientific_name.replace(/ /g, '_'))}`
  const commonsUrl = `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(bird.scientific_name)}&title=Special:MediaSearch&type=image`

  const handleReplaceSuccess = (newPath: string) => {
    setImageUrl(newPath + `?t=${Date.now()}`)
    setReplacing(false)
    onImageChanged?.()
  }

  const handleUpload = async (file: File, attribution?: string) => {
    const formData = new FormData()
    formData.append('file', file, file.name)
    formData.append('scientificName', bird.scientific_name)
    if (attribution) formData.append('attribution', attribution)

    const res = await fetch('/api/admin/images/replace', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Upload fejlede')
    }

    const data = await res.json()
    handleReplaceSuccess(data.path)
  }

  const handleINatReplace = async (url: string, attribution: string, license: string) => {
    const res = await fetch('/api/admin/images/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scientificName: bird.scientific_name,
        url,
        attribution,
        license,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Erstatning fejlede')
    }

    const data = await res.json()
    handleReplaceSuccess(data.path)
  }

  const showNormalView = !cropping && !replacing

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        {cropping && imageUrl ? (
          <div className="p-4">
            <ImageCropEditor
              scientificName={bird.scientific_name}
              imageUrl={imageUrl}
              onCropped={(newUrl) => {
                setImageUrl(newUrl)
                setCropping(false)
                onImageChanged?.()
              }}
              onCancel={() => setCropping(false)}
            />
          </div>
        ) : replacing ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Erstat billede — {bird.name_da}</h3>
              <Button variant="ghost" size="sm" onClick={() => setReplacing(false)}>
                <X className="size-3.5" />
              </Button>
            </div>

            <div className="flex gap-1 border-b">
              <button
                className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                  replaceTab === 'inaturalist'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setReplaceTab('inaturalist')}
              >
                iNaturalist
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                  replaceTab === 'upload'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setReplaceTab('upload')}
              >
                Upload
              </button>
            </div>

            {replaceTab === 'upload' ? (
              <ImageUploader
                scientificName={bird.scientific_name}
                onReplace={handleUpload}
              />
            ) : (
              <INatPhotoBrowser
                scientificName={bird.scientific_name}
                onReplace={handleINatReplace}
              />
            )}
          </div>
        ) : (
          <div className="relative bg-muted" style={{ aspectRatio: '16/10' }}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={bird.name_da}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Intet billede
              </div>
            )}
          </div>
        )}

        <div className="p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl">{bird.name_da}</DialogTitle>
            <DialogDescription>
              {bird.name_en} — <span className="italic">{bird.scientific_name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{bird.category}</Badge>
            {bird.is_easy ? (
              <Badge variant="secondary">Let</Badge>
            ) : bird.is_common ? (
              <Badge variant="secondary">Almindelig</Badge>
            ) : (
              <Badge variant="outline">Svær</Badge>
            )}
          </div>

          {showNormalView && imageUrl && (
            <div className="space-y-2">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Kredit</div>
                {editingCredit ? (
                  <div className="flex gap-1.5">
                    <Input
                      type="text"
                      value={creditDraft}
                      onChange={e => setCreditDraft(e.target.value)}
                      placeholder="Navn eller kilde"
                      className="text-xs h-8"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && saveCredit()}
                    />
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={saveCredit} disabled={savingCredit}>
                      {savingCredit ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setEditingCredit(false)}>
                      <X className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="text-xs p-2 rounded bg-muted text-muted-foreground flex items-center justify-between cursor-pointer hover:bg-muted/80"
                    onClick={() => { setCreditDraft(credit || ''); setEditingCredit(true) }}
                  >
                    <span>{credit || 'Ingen kredit'}</span>
                    <Pencil className="size-3 opacity-50" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {showNormalView && imageUrl && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCropping(true)}
                >
                  <Crop className="size-3.5 mr-1.5" />
                  Beskær billede
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReplacing(true)}
                >
                  <Replace className="size-3.5 mr-1.5" />
                  Erstat billede
                </Button>
              </>
            )}
            {showNormalView && !imageUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReplacing(true)}
              >
                <Replace className="size-3.5 mr-1.5" />
                Tilføj billede
              </Button>
            )}
            <Button
              variant={isFlagged ? 'destructive' : 'outline'}
              size="sm"
              onClick={onToggleFlag}
            >
              <Flag className="size-3.5 mr-1.5" />
              {isFlagged ? 'Fjern markering' : 'Markér billede'}
            </Button>
            <Button variant="outline" size="sm" render={<a href={wikiUrl} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLink className="size-3.5 mr-1.5" />
              Wikipedia (da)
            </Button>
            <Button variant="outline" size="sm" render={<a href={commonsUrl} target="_blank" rel="noopener noreferrer" />}>
              <ExternalLink className="size-3.5 mr-1.5" />
              Wikimedia Commons
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
