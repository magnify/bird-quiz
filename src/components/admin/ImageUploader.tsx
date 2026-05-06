'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Loader2, Check, X } from 'lucide-react'

interface Props {
  scientificName: string
  onReplace: (file: File, attribution?: string) => Promise<void>
}

const MAX_DIMENSION = 2000
const JPEG_QUALITY = 0.85
const RESIZE_THRESHOLD_BYTES = 2 * 1024 * 1024

async function downscaleIfLarge(file: File): Promise<File> {
  if (file.size < RESIZE_THRESHOLD_BYTES) return file

  const bitmap = await createImageBitmap(file)
  const longEdge = Math.max(bitmap.width, bitmap.height)
  if (longEdge <= MAX_DIMENSION && file.size < RESIZE_THRESHOLD_BYTES) return file

  const scale = Math.min(1, MAX_DIMENSION / longEdge)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!blob) throw new Error('Kunne ikke komprimere billede')
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
}

export default function ImageUploader({ scientificName, onReplace }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [attribution, setAttribution] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const prepared = await downscaleIfLarge(file)
      await onReplace(prepared, attribution || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fejlede')
    } finally {
      setUploading(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded px-3 py-2">
        <strong>Anbefalet:</strong> Liggende billede i 4:3 format (1200×900px eller større).
        Efter upload kan du beskære billedet.
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
      />

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
          {error}
        </div>
      )}

      {preview && (
        <div className="space-y-2 border rounded-lg p-3">
          <img
            src={preview}
            alt="Preview"
            className="w-full rounded object-contain max-h-64"
          />
          <div className="text-xs text-muted-foreground">
            {file?.name} ({file ? Math.round(file.size / 1024) : 0} KB)
          </div>
          <Input
            type="text"
            placeholder="Kredit (f.eks. Brian S. Jensen)"
            value={attribution}
            onChange={e => setAttribution(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="size-3.5 mr-1.5" />
              )}
              Upload &amp; erstat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={uploading}
            >
              <X className="size-3.5 mr-1.5" />
              Ryd
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
