'use client'

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
import { Flag, ExternalLink } from 'lucide-react'

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
}

export default function BirdDetailModal({ bird, imageData, isFlagged, onToggleFlag, onClose }: Props) {
  const wikiUrl = `https://da.wikipedia.org/wiki/${encodeURIComponent(bird.scientific_name.replace(/ /g, '_'))}`
  const commonsUrl = `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(bird.scientific_name)}&title=Special:MediaSearch&type=image`

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <div className="relative bg-muted" style={{ aspectRatio: '16/10' }}>
          {imageData?.url ? (
            <img
              src={imageData.url}
              alt={bird.name_da}
              className="w-full h-full object-cover"
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

          {imageData?.url && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Billede-URL
              </div>
              <div className="text-xs p-2 rounded bg-muted break-all text-muted-foreground">
                {imageData.url}
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
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
