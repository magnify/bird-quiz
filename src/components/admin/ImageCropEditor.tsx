'use client'

import { useState, useRef, useCallback } from 'react'
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button } from '@/components/ui/button'
import { Crop as CropIcon, RotateCcw, Loader2, Check, X } from 'lucide-react'

interface Props {
  scientificName: string
  imageUrl: string
  onCropped: (newUrl: string) => void
  onCancel: () => void
}

export default function ImageCropEditor({ scientificName, imageUrl, onCropped, onCancel }: Props) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasBackup, setHasBackup] = useState<boolean | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // Check if backup exists in Supabase Storage on mount
  // Supabase Storage doesn't support HEAD — use a range GET to minimize bandwidth
  const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
  const backupUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bird-images/originals/${slug}.jpg`
  if (hasBackup === null) {
    fetch(backupUrl, { headers: { Range: 'bytes=0-0' } })
      .then(res => setHasBackup(res.ok || res.status === 206))
      .catch(() => setHasBackup(false))
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight, width, height } = e.currentTarget
    // Set initial centered 4:3 crop
    const initialCrop = centerCrop(
      makeAspectCrop(
        { unit: '%', width: 90 },
        4 / 3,
        width,
        height,
      ),
      width,
      height,
    )
    setCrop(initialCrop)
    // We need to suppress the unused variable warning
    void naturalWidth
    void naturalHeight
  }, [])

  const handleSave = useCallback(async () => {
    if (!completedCrop || !imgRef.current) return

    setError(null)
    setSaving(true)

    try {
      const image = imgRef.current
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      const canvas = document.createElement('canvas')
      const cropX = completedCrop.x * scaleX
      const cropY = completedCrop.y * scaleY
      const cropWidth = completedCrop.width * scaleX
      const cropHeight = completedCrop.height * scaleY

      canvas.width = cropWidth
      canvas.height = cropHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      ctx.drawImage(
        image,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight,
      )

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
          'image/jpeg',
          0.92,
        )
      })

      const formData = new FormData()
      formData.append('file', blob, 'cropped.jpg')
      formData.append('scientificName', scientificName)

      const res = await fetch('/api/admin/images/crop', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.reason ? `${data.error} (${data.reason})` : data.error || 'Failed to save')
      }

      const data = await res.json()
      setHasBackup(true)
      onCropped(data.path + `?t=${Date.now()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setSaving(false)
    }
  }, [completedCrop, scientificName, onCropped])

  const handleRestore = useCallback(async () => {
    setError(null)
    setRestoring(true)

    try {
      const res = await fetch('/api/admin/images/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scientificName }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to restore')
      }

      const data = await res.json()
      onCropped(data.path + `?t=${Date.now()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukendt fejl')
    } finally {
      setRestoring(false)
    }
  }, [scientificName, onCropped])

  return (
    <div className="space-y-3">
      <ReactCrop
        crop={crop}
        onChange={(c) => setCrop(c)}
        onComplete={(c) => setCompletedCrop(c)}
        aspect={4 / 3}
        keepSelection
        ruleOfThirds
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Crop preview"
          onLoad={onImageLoad}
          style={{ maxHeight: '60vh', width: '100%', objectFit: 'contain' }}
          crossOrigin="anonymous"
        />
      </ReactCrop>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!completedCrop || saving || restoring}
        >
          {saving ? (
            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
          ) : (
            <CropIcon className="size-3.5 mr-1.5" />
          )}
          Beskær &amp; gem
        </Button>

        {hasBackup && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestore}
            disabled={saving || restoring}
          >
            {restoring ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="size-3.5 mr-1.5" />
            )}
            Nulstil original
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={saving || restoring}
        >
          <X className="size-3.5 mr-1.5" />
          Annullér
        </Button>
      </div>
    </div>
  )
}
