'use client'

import type { Bird } from '@/lib/supabase/types'

interface ImageData {
  url: string | null
  source: 'wikipedia' | 'commons' | 'override' | 'failed'
  status: 'loading' | 'loaded' | 'failed'
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--text-primary)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="relative" style={{ aspectRatio: '16/10', background: 'var(--bg-secondary)' }}>
          {imageData?.url ? (
            <img
              src={imageData.url}
              alt={bird.name_da}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {imageData?.status === 'failed' ? 'Intet billede fundet' : 'Henter...'}
            </div>
          )}
          {/* Source badge */}
          {imageData && (
            <div
              className="absolute bottom-2 left-2 text-xs px-2 py-1 rounded"
              style={{
                background: 'rgba(0,0,0,0.7)',
                color: imageData.source === 'wikipedia' ? '#8bc7f0'
                  : imageData.source === 'override' ? '#4ade80'
                  : imageData.source === 'failed' ? '#f87171'
                  : '#fbbf24',
              }}
            >
              {imageData.source === 'wikipedia' ? 'Wikipedia'
                : imageData.source === 'override' ? 'Override'
                : imageData.source === 'failed' ? 'Fejl'
                : 'Commons'}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-5">
          <h2 className="text-xl font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
            {bird.name_da}
          </h2>
          <div className="text-sm mb-0.5" style={{ color: 'var(--text-secondary)' }}>
            {bird.name_en}
          </div>
          <div className="text-sm italic mb-4" style={{ color: '#4a6b5a' }}>
            {bird.scientific_name}
          </div>

          {/* Tags */}
          <div className="flex gap-2 flex-wrap mb-4">
            <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              {bird.category}
            </span>
            {bird.is_easy && (
              <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
                Let
              </span>
            )}
            {bird.is_common && (
              <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                Almindelig
              </span>
            )}
          </div>

          {/* Image URL */}
          {imageData?.url && (
            <div className="mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Billede-URL
              </div>
              <div
                className="text-xs p-2 rounded break-all"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                {imageData.url}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onToggleFlag}
              className="text-xs px-3 py-2 rounded-lg font-medium cursor-pointer transition-colors"
              style={{
                background: isFlagged ? 'rgba(248,113,113,0.15)' : 'var(--bg-secondary)',
                border: `1px solid ${isFlagged ? '#f87171' : 'var(--border)'}`,
                color: isFlagged ? '#f87171' : 'var(--text-secondary)',
              }}
            >
              {isFlagged ? 'Fjern markering' : 'Markér billede'}
            </button>
            <a
              href={wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-2 rounded-lg font-medium no-underline transition-colors"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: '#8bc7f0',
              }}
            >
              Wikipedia (da)
            </a>
            <a
              href={commonsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-2 rounded-lg font-medium no-underline transition-colors"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: '#fbbf24',
              }}
            >
              Wikimedia Commons
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
