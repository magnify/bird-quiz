'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { Bird } from '@/lib/supabase/types'
import { PLACEHOLDER_SVG } from '@/lib/placeholder'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Crop, Replace, Pencil, Check, Loader2, ArrowLeft, Flag, AlertTriangle, ImageOff } from 'lucide-react'
import ImageCropEditor from './ImageCropEditor'
import ImageUploader from './ImageUploader'
import INatPhotoBrowser from './INatPhotoBrowser'
import CommonsPhotoBrowser from './CommonsPhotoBrowser'
import type { FlagReason, ImageAudit } from '@/lib/admin/image-status'
import { FLAG_REASONS, auditStatus } from '@/lib/admin/image-status'
import type { BirdImageActions } from '@/hooks/admin/useBirdImageActions'

interface Props {
  bird: Bird
  audit: ImageAudit
  imageUrl: string | null
  actions: BirdImageActions
  onClose: () => void
}

type View = 'summary' | 'metadata' | 'replacing' | 'cropping'
type ReplaceTab = 'upload' | 'inaturalist' | 'commons'

const NOT_FLAGGED = '__not_flagged__'

export default function BirdDetailModal({ bird, audit, imageUrl: initialImageUrl, actions, onClose }: Props) {
  const [view, setView] = useState<View>('summary')
  const [replaceTab, setReplaceTab] = useState<ReplaceTab>('commons')
  const [imageUrl, setImageUrl] = useState(initialImageUrl)

  const [creditDraft, setCreditDraft] = useState('')
  const [licenseDraft, setLicenseDraft] = useState('')
  const [flagDraft, setFlagDraft] = useState<string>(NOT_FLAGGED)
  const [savingMeta, setSavingMeta] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)

  const status = auditStatus(audit)
  const credit = audit.attribution ?? null
  const license = audit.license ?? null

  const openMetadataEditor = useCallback(() => {
    setCreditDraft(credit || '')
    setLicenseDraft(license || '')
    setFlagDraft(audit.flagged ? (audit.flagReason || 'other') : NOT_FLAGGED)
    setMetaError(null)
    setView('metadata')
  }, [credit, license, audit.flagged, audit.flagReason])

  const saveMeta = useCallback(async () => {
    setSavingMeta(true)
    setMetaError(null)

    const targetFlagged = flagDraft !== NOT_FLAGGED
    const flagChanged = targetFlagged !== audit.flagged || (targetFlagged && flagDraft !== audit.flagReason)

    try {
      const creditPromise = fetch('/api/admin/images/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scientificName: bird.scientific_name,
          attribution: creditDraft,
          license: licenseDraft,
        }),
      }).then(async res => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Kunne ikke gemme kredit (HTTP ${res.status})`)
        }
      })

      const flagPromise = flagChanged
        ? actions.toggleFlag(bird.scientific_name, targetFlagged ? (flagDraft as FlagReason) : undefined)
        : Promise.resolve()

      await Promise.all([creditPromise, flagPromise])

      toast.success('Metadata gemt')
      setSavingMeta(false)
      actions.refresh()
      onClose()
      return
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Netværksfejl'
      setMetaError(message)
      toast.error('Kunne ikke gemme metadata', { description: message })
    }
    setSavingMeta(false)
  }, [actions, audit.flagged, audit.flagReason, bird.scientific_name, creditDraft, flagDraft, licenseDraft, onClose])

  const handleApprove = useCallback(async () => {
    setApproving(true)
    const ok = await actions.approve(bird.scientific_name)
    setApproving(false)
    if (ok) onClose()
  }, [actions, bird.scientific_name, onClose])

  // After a replace/crop the modal returns to the summary so the new image can be
  // reviewed and approved; the server is the source of truth, so refresh from it.
  const handleReplaceSuccess = (newPath: string) => {
    setImageUrl(newPath)
    toast.success('Billede erstattet — afventer godkendelse')
    actions.refresh()
    setView('summary')
  }

  const handleUpload = async (file: File, attribution?: string) => {
    const formData = new FormData()
    formData.append('file', file, file.name)
    formData.append('scientificName', bird.scientific_name)
    if (attribution) formData.append('attribution', attribution)

    const res = await fetch('/api/admin/images/replace', { method: 'POST', body: formData })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Upload fejlede')
    }
    const data = await res.json()
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
    handleReplaceSuccess(data.path)
  }

  const handleINatReplace = (url: string, attribution: string, license: string) =>
    handleRemoteReplace({ url, attribution, license, source: 'inaturalist' })

  const handleCommonsReplace = (photo: { fullUrl: string; attribution: string; license: string; descriptionUrl: string }) =>
    handleRemoteReplace({
      url: photo.fullUrl,
      attribution: photo.attribution,
      license: photo.license,
      source: 'wikimedia-commons',
      sourceUrl: photo.descriptionUrl,
    })

  const showApproveButton = status.kind === 'review' || status.kind === 'flagged'
  const approveLabel = status.kind === 'flagged' ? 'Fjern markering & godkend' : 'Markér som godkendt'
  // Replace + crop apply to any bird that already has an image, regardless of
  // approval state (pre-refactor parity). The 'missing' case is handled by the
  // separate "Tilføj billede" branch in the footer.
  const showEditActions = status.kind !== 'missing'

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-5xl p-0 max-h-[95vh] flex flex-col" showCloseButton={view === 'summary'}>
        {view === 'cropping' && imageUrl && (
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <ImageCropEditor
              scientificName={bird.scientific_name}
              imageUrl={imageUrl}
              onCropped={(newUrl) => {
                setImageUrl(newUrl)
                toast.success('Billede beskåret — afventer godkendelse')
                actions.refresh()
                setView('summary')
              }}
              onCancel={() => setView('summary')}
            />
          </div>
        )}

        {view === 'replacing' && (
          <>
            <div className="border-b">
              <div className="flex items-center justify-between p-4 pb-2">
                <Button variant="ghost" size="sm" className="h-7 -ml-2" onClick={() => setView('summary')}>
                  <ArrowLeft className="size-3.5 mr-1.5" />
                  Tilbage
                </Button>
                <h3 className="text-sm font-semibold">
                  {status.kind === 'missing' ? 'Tilføj billede' : 'Erstat billede'} — {bird.name_da}
                </h3>
                <span className="w-16" aria-hidden />
              </div>

              <div className="flex gap-1 px-4">
                {(['commons', 'inaturalist', 'upload'] as const).map(tab => (
                  <button
                    key={tab}
                    className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                      replaceTab === tab
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setReplaceTab(tab)}
                  >
                    {tab === 'commons' ? 'Wikimedia' : tab === 'inaturalist' ? 'iNaturalist' : 'Upload'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {replaceTab === 'upload' ? (
                <ImageUploader scientificName={bird.scientific_name} onReplace={handleUpload} />
              ) : replaceTab === 'commons' ? (
                <CommonsPhotoBrowser scientificName={bird.scientific_name} onReplace={handleCommonsReplace} />
              ) : (
                <INatPhotoBrowser scientificName={bird.scientific_name} onReplace={handleINatReplace} />
              )}
            </div>
          </>
        )}

        {view === 'metadata' && (
          <form
            className="flex-1 flex flex-col min-h-0"
            onSubmit={e => { e.preventDefault(); saveMeta() }}
          >
            <div className="border-b">
              <div className="flex items-center justify-between p-4 pb-3">
                <Button type="button" variant="ghost" size="sm" className="h-7 -ml-2" onClick={() => setView('summary')} disabled={savingMeta}>
                  <ArrowLeft className="size-3.5 mr-1.5" />
                  Tilbage
                </Button>
                <h3 className="text-sm font-semibold">Rediger metadata — {bird.name_da}</h3>
                <span className="w-16" aria-hidden />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="bdm-credit">Kredit</label>
                <Input
                  id="bdm-credit"
                  type="text"
                  value={creditDraft}
                  onChange={e => setCreditDraft(e.target.value)}
                  placeholder="Navn eller kilde"
                  autoFocus
                  disabled={savingMeta}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="bdm-license">Licens</label>
                <Input
                  id="bdm-license"
                  type="text"
                  value={licenseDraft}
                  onChange={e => setLicenseDraft(e.target.value)}
                  placeholder="own, cc0, cc-by, etc."
                  disabled={savingMeta}
                />
              </div>

              <fieldset className="space-y-2" disabled={savingMeta}>
                <legend className="text-xs font-medium mb-1">Markering</legend>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="bdm-flag"
                    value={NOT_FLAGGED}
                    checked={flagDraft === NOT_FLAGGED}
                    onChange={() => setFlagDraft(NOT_FLAGGED)}
                  />
                  Ikke markeret
                </label>
                {FLAG_REASONS.map(r => (
                  <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="bdm-flag"
                      value={r.value}
                      checked={flagDraft === r.value}
                      onChange={() => setFlagDraft(r.value)}
                    />
                    {r.label}
                  </label>
                ))}
              </fieldset>

              {metaError && (
                <div className="text-xs text-destructive">{metaError}</div>
              )}
            </div>

            <DialogFooter className="mx-0 mb-0">
              <Button type="button" variant="ghost" size="sm" onClick={() => setView('summary')} disabled={savingMeta}>
                Annullér
              </Button>
              <Button type="submit" size="sm" disabled={savingMeta}>
                {savingMeta ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Check className="size-3.5 mr-1.5" />}
                Gem
              </Button>
            </DialogFooter>
          </form>
        )}

        {view === 'summary' && (
          <>
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="relative bg-muted aspect-[16/10]">
                {imageUrl && status.kind !== 'missing' ? (
                  <img
                    src={imageUrl}
                    alt={bird.name_da}
                    className="absolute inset-0 w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_SVG }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Intet billede
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-xl">{bird.name_da}</DialogTitle>
                  <DialogDescription>
                    {bird.name_en} — <span className="italic">{bird.scientific_name}</span>
                  </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 flex-wrap items-center">
                  <Badge variant="outline">{bird.category}</Badge>
                  {bird.is_easy ? (
                    <Badge variant="secondary">Let</Badge>
                  ) : bird.is_common ? (
                    <Badge variant="secondary">Almindelig</Badge>
                  ) : (
                    <Badge variant="outline">Svær</Badge>
                  )}
                  {status.kind === 'flagged' && (
                    <Badge variant="destructive">
                      <Flag className="size-3 mr-1" />
                      {status.reasonLabel}
                    </Badge>
                  )}
                  {status.kind === 'review' && (
                    <Badge variant="secondary">
                      <AlertTriangle className="size-3 mr-1" />
                      Skal gennemgås
                    </Badge>
                  )}
                  {status.kind === 'approved' && (
                    <Badge variant="outline">
                      <Check className="size-3 mr-1" />
                      Godkendt
                    </Badge>
                  )}
                  {status.kind === 'missing' && (
                    <Badge variant="secondary">
                      <ImageOff className="size-3 mr-1" />
                      Intet billede
                    </Badge>
                  )}
                </div>

                {audit.issues.length > 0 && (
                  <div className="space-y-1 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-yellow-800">
                      <AlertTriangle className="size-3.5" />
                      {audit.severity === 'critical' ? 'Kritiske problemer' : 'Advarsler'}
                    </div>
                    <ul className="space-y-0.5 text-yellow-800">
                      {audit.issues.map((issue, i) => (
                        <li key={i}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {status.kind !== 'missing' && (
                  <div className="space-y-2 rounded-md border p-3 text-xs">
                    <div>
                      <div className="font-medium text-muted-foreground">Kredit</div>
                      <div className="text-muted-foreground">{credit || 'Ingen kredit'}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Licens</div>
                      <div className="text-muted-foreground">{license || 'Ingen licens'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mx-0 mb-0 flex-wrap">
              {status.kind === 'missing' ? (
                <Button size="sm" onClick={() => setView('replacing')}>
                  <Replace className="size-3.5 mr-1.5" />
                  Tilføj billede
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={openMetadataEditor}>
                    <Pencil className="size-3.5 mr-1.5" />
                    Rediger metadata
                  </Button>
                  {showEditActions && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setView('replacing')}>
                        <Replace className="size-3.5 mr-1.5" />
                        Erstat billede
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setView('cropping')}>
                        <Crop className="size-3.5 mr-1.5" />
                        Beskær billede
                      </Button>
                    </>
                  )}
                  {showApproveButton && (
                    <Button size="sm" onClick={handleApprove} disabled={approving}>
                      {approving ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Check className="size-3.5 mr-1.5" />}
                      {approveLabel}
                    </Button>
                  )}
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
