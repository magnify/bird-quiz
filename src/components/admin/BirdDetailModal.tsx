'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Bird } from '@/lib/supabase/types'
import { PLACEHOLDER_SVG } from '@/lib/placeholder'
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
import { Flag, Crop, Replace, X, Pencil, Check, Loader2, Clock, ArrowLeft } from 'lucide-react'
import ImageCropEditor from './ImageCropEditor'
import ImageUploader from './ImageUploader'
import INatPhotoBrowser from './INatPhotoBrowser'
import CommonsPhotoBrowser from './CommonsPhotoBrowser'

interface ImageData {
  url: string | null
  source: string
  status: string
}

interface Props {
  bird: Bird
  imageData: ImageData | null
  isFlagged: boolean
  needsReview?: boolean
  onToggleFlag: (reason?: string) => void
  onClose: () => void
  onImageChanged?: () => void
  onApproved?: (scientificName: string) => void
}

const FLAG_REASONS: { value: string; label: string }[] = [
  { value: 'wrong-species', label: 'Forkert art' },
  { value: 'bad-crop', label: 'Dårlig komposition' },
  { value: 'low-quality', label: 'Lav kvalitet' },
  { value: 'licensing', label: 'Licens-problem' },
  { value: 'other', label: 'Andet' },
]

type ReplaceTab = 'upload' | 'inaturalist' | 'commons'

export default function BirdDetailModal({ bird, imageData, isFlagged, needsReview = false, onToggleFlag, onClose, onImageChanged, onApproved }: Props) {
  const [cropping, setCropping] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [replaceTab, setReplaceTab] = useState<ReplaceTab>('commons')
  const [imageUrl, setImageUrl] = useState(imageData?.url ?? null)

  const [credit, setCredit] = useState<string | null>(null)
  const [license, setLicense] = useState<string | null>(null)
  const [editingMeta, setEditingMeta] = useState(false)
  const [creditDraft, setCreditDraft] = useState('')
  const [licenseDraft, setLicenseDraft] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)
  const [pickingReason, setPickingReason] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/images/credit?bird=${encodeURIComponent(bird.scientific_name)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.attribution) setCredit(data.attribution)
        if (data?.license) setLicense(data.license)
      })
      .catch(() => {})
  }, [bird.scientific_name])

  const handleApprove = useCallback(async () => {
    setApproving(true)
    try {
      const res = await fetch('/api/admin/images/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scientificName: bird.scientific_name }),
      })
      if (res.ok) {
        setApproved(true)
        onApproved?.(bird.scientific_name)
      }
    } catch {}
    setApproving(false)
  }, [bird.scientific_name, onImageChanged])

  const startEditingMeta = useCallback(() => {
    setCreditDraft(credit || '')
    setLicenseDraft(license || '')
    setMetaError(null)
    setEditingMeta(true)
  }, [credit, license])

  const cancelEditingMeta = useCallback(() => {
    setEditingMeta(false)
    setMetaError(null)
  }, [])

  const saveMeta = useCallback(async () => {
    setSavingMeta(true)
    setMetaError(null)
    try {
      const res = await fetch('/api/admin/images/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scientificName: bird.scientific_name,
          attribution: creditDraft,
          license: licenseDraft,
        }),
      })
      if (res.ok) {
        setCredit(creditDraft || null)
        setLicense(licenseDraft || null)
        setEditingMeta(false)
        onImageChanged?.()
      } else {
        const data = await res.json().catch(() => ({}))
        setMetaError(data.error || `Kunne ikke gemme (HTTP ${res.status})`)
      }
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : 'Netværksfejl')
    }
    setSavingMeta(false)
  }, [bird.scientific_name, creditDraft, licenseDraft, onImageChanged])


  const handleReplaceSuccess = (newPath: string) => {
    // API already returns direct Supabase URL with timestamp
    console.log('[Replace] Success! Setting new image URL:', newPath)
    setImageUrl(newPath)
    setReplacing(false)
    onImageChanged?.()
  }

  const handleUpload = async (file: File, attribution?: string) => {
    console.log('[Upload] Starting file upload:', { scientificName: bird.scientific_name, fileName: file.name, size: file.size, attribution })

    const formData = new FormData()
    formData.append('file', file, file.name)
    formData.append('scientificName', bird.scientific_name)
    if (attribution) formData.append('attribution', attribution)

    const res = await fetch('/api/admin/images/replace', {
      method: 'POST',
      body: formData,
    })

    console.log('[Upload] API response status:', res.status)

    if (!res.ok) {
      const data = await res.json()
      console.error('[Upload] API error:', data)
      throw new Error(data.error || 'Upload fejlede')
    }

    const data = await res.json()
    console.log('[Upload] API success:', data)

    // Update credit field if attribution provided
    if (attribution) {
      setCredit(attribution)
      setCreditDraft(attribution)
    }

    handleReplaceSuccess(data.path)
  }

  const handleRemoteReplace = async (opts: {
    url: string
    attribution: string
    license: string
    source: string
    sourceUrl?: string
  }) => {
    const res = await fetch('/api/admin/images/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scientificName: bird.scientific_name,
        url: opts.url,
        attribution: opts.attribution,
        license: opts.license,
        source: opts.source,
        source_url: opts.sourceUrl,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Erstatning fejlede')
    }

    const data = await res.json()

    setCredit(opts.attribution)
    setCreditDraft(opts.attribution)
    setLicense(opts.license)
    setLicenseDraft(opts.license)

    handleReplaceSuccess(data.path)
  }

  const handleINatReplace = (url: string, attribution: string, license: string) =>
    handleRemoteReplace({ url, attribution, license, source: 'inaturalist' })

  const handleCommonsReplace = (photo: {
    fullUrl: string
    attribution: string
    license: string
    descriptionUrl: string
  }) =>
    handleRemoteReplace({
      url: photo.fullUrl,
      attribution: photo.attribution,
      license: photo.license,
      source: 'wikimedia-commons',
      sourceUrl: photo.descriptionUrl,
    })

  const showNormalView = !cropping && !replacing

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl p-0 max-h-[90vh] overflow-y-auto" showCloseButton={!replacing && !cropping}>
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
          <div className="flex flex-col max-h-[85vh]">
            <div className="sticky top-0 z-10 bg-background border-b">
              <div className="flex items-center justify-between p-4 pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 -ml-2"
                  onClick={() => setReplacing(false)}
                >
                  <ArrowLeft className="size-3.5 mr-1.5" />
                  Tilbage
                </Button>
                <h3 className="text-sm font-semibold">Erstat billede — {bird.name_da}</h3>
                <span className="w-16" aria-hidden />
              </div>

              <div className="flex gap-1 px-4">
                <button
                  className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                    replaceTab === 'commons'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setReplaceTab('commons')}
                >
                  Wikimedia
                </button>
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
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {replaceTab === 'upload' ? (
                <ImageUploader
                  scientificName={bird.scientific_name}
                  onReplace={handleUpload}
                />
              ) : replaceTab === 'commons' ? (
                <CommonsPhotoBrowser
                  scientificName={bird.scientific_name}
                  onReplace={handleCommonsReplace}
                />
              ) : (
                <INatPhotoBrowser
                  scientificName={bird.scientific_name}
                  onReplace={handleINatReplace}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="relative bg-muted" style={{ aspectRatio: '16/10' }}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={bird.name_da}
                className="w-full h-full object-contain rounded-lg"
                style={{ maxHeight: '50vh' }}
                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_SVG }}
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
            editingMeta ? (
              <form
                className="space-y-3 rounded-md border p-3"
                onSubmit={e => { e.preventDefault(); saveMeta() }}
              >
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="bdm-credit">
                    Kredit
                  </label>
                  <Input
                    id="bdm-credit"
                    type="text"
                    value={creditDraft}
                    onChange={e => setCreditDraft(e.target.value)}
                    placeholder="Navn eller kilde"
                    className="text-xs h-8"
                    autoFocus
                    disabled={savingMeta}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor="bdm-license">
                    Licens
                  </label>
                  <Input
                    id="bdm-license"
                    type="text"
                    value={licenseDraft}
                    onChange={e => setLicenseDraft(e.target.value)}
                    placeholder="own, cc0, cc-by, etc."
                    className="text-xs h-8"
                    disabled={savingMeta}
                  />
                </div>
                {metaError && (
                  <div className="text-xs text-destructive">{metaError}</div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button type="submit" size="sm" disabled={savingMeta}>
                    {savingMeta ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Check className="size-3.5 mr-1.5" />}
                    Gem
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={cancelEditingMeta} disabled={savingMeta}>
                    Annullér
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Kredit</div>
                    <div className="text-xs text-muted-foreground">{credit || 'Ingen kredit'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Licens</div>
                  <div className="text-xs text-muted-foreground">{license || 'Ingen licens'}</div>
                </div>
                <Button variant="outline" size="sm" onClick={startEditingMeta} className="w-full">
                  <Pencil className="size-3.5 mr-1.5" />
                  Rediger kredit & licens
                </Button>
              </div>
            )
          )}

          {showNormalView && (() => {
            const status: 'flagged' | 'review' | 'approved' =
              isFlagged ? 'flagged' : (needsReview && !approved) ? 'review' : 'approved'

            const markApproved = async () => {
              if (isFlagged) onToggleFlag()
              if (needsReview && !approved) await handleApprove()
            }

            return (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Status</div>
                <div className="flex gap-1 p-1 rounded-md border bg-muted/40 w-fit">
                  <Button
                    variant={status === 'approved' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7"
                    onClick={markApproved}
                    disabled={approving || status === 'approved'}
                  >
                    {approving ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Check className="size-3.5 mr-1.5" />}
                    Godkendt
                  </Button>
                  <Button
                    variant={status === 'review' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7"
                    disabled
                    title="Sættes automatisk ved bulk-erstatning"
                  >
                    <Clock className="size-3.5 mr-1.5" />
                    Afventer
                  </Button>
                  <Button
                    variant={status === 'flagged' ? 'destructive' : 'ghost'}
                    size="sm"
                    className="h-7"
                    onClick={() => setPickingReason(v => !v)}
                  >
                    <Flag className="size-3.5 mr-1.5" />
                    Markeret
                  </Button>
                </div>
                {status === 'review' && (
                  <div className="text-xs text-muted-foreground">
                    Auto-erstattet — klik Godkendt for at bekræfte
                  </div>
                )}
                {pickingReason && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground self-center mr-1">Årsag:</span>
                    {FLAG_REASONS.map(r => (
                      <Button
                        key={r.value}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          onToggleFlag(r.value)
                          setPickingReason(false)
                        }}
                      >
                        {r.label}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setPickingReason(false)}
                    >
                      Annullér
                    </Button>
                  </div>
                )}
              </div>
            )
          })()}

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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
