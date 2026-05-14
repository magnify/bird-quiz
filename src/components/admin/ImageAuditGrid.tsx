'use client'

import { useState, useCallback } from 'react'
import type { Bird } from '@/lib/supabase/types'
import { getSupabaseImageUrl } from '@/lib/images'
import { PLACEHOLDER_SVG } from '@/lib/placeholder'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import BirdDetailModal from './BirdDetailModal'
import { flagBirdImage, unflagBirdImage } from '@/app/actions/birds'

type AuditStatus = 'critical' | 'warning' | 'ok'
type Filter = 'all' | 'critical' | 'warning' | 'ok' | 'portrait' | 'no-license' | 'needs-review'

interface ImageAudit {
  bird: Bird
  status: AuditStatus
  license?: string
  attribution?: string
  source: string
  issues: string[]
  isPortrait: boolean
  needsReview: boolean
}

interface Props {
  audits: ImageAudit[]
  initialFlaggedBirdIds?: string[]
}

function recalculateStatus(audit: ImageAudit): AuditStatus {
  const issues = audit.issues.filter(i => !i.includes('Skal gennemgås'))
  if (audit.needsReview) {
    issues.push('Skal gennemgås (auto-erstattet)')
  }

  const criticalIssues = issues.filter(i =>
    i.includes('Mangler kredit') ||
    i.includes('Uklar kilde') ||
    i.includes('NC-licens')
  )

  return issues.length === 0 ? 'ok' : criticalIssues.length > 0 ? 'critical' : 'warning'
}

export default function ImageAuditGrid({ audits, initialFlaggedBirdIds = [] }: Props) {
  const [auditState, setAuditState] = useState(audits)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set(initialFlaggedBirdIds))

  const toggleFlag = useCallback(async (scientificName: string, reason?: string) => {
    const wasFlagged = flaggedIds.has(scientificName)
    // Optimistic update
    setFlaggedIds(prev => {
      const next = new Set(prev)
      if (wasFlagged) next.delete(scientificName)
      else next.add(scientificName)
      return next
    })
    const result = wasFlagged
      ? await unflagBirdImage(scientificName)
      : await flagBirdImage(scientificName, reason || 'needs_replacement')
    if (!result.ok) {
      console.error('Flag toggle failed:', result.error)
      // Revert
      setFlaggedIds(prev => {
        const next = new Set(prev)
        if (wasFlagged) next.add(scientificName)
        else next.delete(scientificName)
        return next
      })
      alert(`Kunne ikke ${wasFlagged ? 'fjerne markering' : 'markere'}: ${result.error}`)
    }
  }, [flaggedIds])

  // Filter audits
  const filtered = auditState.filter(audit => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesSearch =
        audit.bird.name_da.toLowerCase().includes(searchLower) ||
        audit.bird.scientific_name.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // Status filter
    if (filter === 'all') return true
    if (filter === 'critical' || filter === 'warning' || filter === 'ok') {
      return audit.status === filter
    }
    if (filter === 'portrait') return audit.isPortrait
    if (filter === 'no-license') return !audit.license
    if (filter === 'needs-review') return audit.needsReview

    return true
  })

  // Count by status
  const counts = {
    all: auditState.length,
    critical: auditState.filter(a => a.status === 'critical').length,
    warning: auditState.filter(a => a.status === 'warning').length,
    ok: auditState.filter(a => a.status === 'ok').length,
    portrait: auditState.filter(a => a.isPortrait).length,
    'no-license': auditState.filter(a => !a.license).length,
    'needs-review': auditState.filter(a => a.needsReview).length,
  }

  const getStatusColor = (status: AuditStatus) => {
    if (status === 'critical') return 'bg-red-500'
    if (status === 'warning') return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusBadge = (status: AuditStatus) => {
    if (status === 'critical') return { variant: 'destructive' as const, text: 'Kritisk' }
    if (status === 'warning') return { variant: 'default' as const, text: 'Advarsel' }
    return { variant: 'default' as const, text: 'OK' }
  }

  const handleImageChanged = useCallback(() => {
    setRefreshKey(Date.now())
  }, [])

  const handleApproved = useCallback((scientificName: string) => {
    setAuditState(prev => prev.map(audit => {
      if (audit.bird.scientific_name !== scientificName) return audit

      const updated = {
        ...audit,
        needsReview: false,
        issues: audit.issues.filter(i => !i.includes('Skal gennemgås')),
      }
      updated.status = recalculateStatus(updated)
      return updated
    }))
  }, [])

  const selectedAudit = selectedBird
    ? auditState.find(a => a.bird.id === selectedBird.id)
    : null

  return (
    <>
      <div className="space-y-4">
        {/* Metric Cards as Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setFilter('critical')}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              filter === 'critical'
                ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                : 'border-border hover:border-red-300 bg-card'
            }`}
          >
            <div className="text-sm text-muted-foreground mb-1">Kritiske problemer</div>
            <div className="text-3xl font-bold tabular-nums text-red-600 mb-2">
              {counts.critical}
            </div>
            <div className="text-xs text-muted-foreground">
              Mangler kredit eller har NC-licens
            </div>
          </button>

          <button
            onClick={() => setFilter('warning')}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              filter === 'warning'
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                : 'border-border hover:border-yellow-300 bg-card'
            }`}
          >
            <div className="text-sm text-muted-foreground mb-1">Advarsler</div>
            <div className="text-3xl font-bold tabular-nums text-yellow-600 mb-2">
              {counts.warning}
            </div>
            <div className="text-xs text-muted-foreground">
              Mindre problemer med licens/kvalitet
            </div>
          </button>

          <button
            onClick={() => setFilter('ok')}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              filter === 'ok'
                ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                : 'border-border hover:border-green-300 bg-card'
            }`}
          >
            <div className="text-sm text-muted-foreground mb-1">OK</div>
            <div className="text-3xl font-bold tabular-nums text-green-600 mb-2">
              {counts.ok}
            </div>
            <div className="text-xs text-muted-foreground">
              Korrekt licenseret og dokumenteret
            </div>
          </button>
        </div>

        {/* Search */}
        <Input
          type="search"
          placeholder="Søg fugl..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {/* Secondary Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-input'
            }`}
          >
            Alle
            <span className="ml-1.5 text-xs opacity-70">
              ({counts.all})
            </span>
          </button>
          <button
            onClick={() => setFilter('portrait')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              filter === 'portrait'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-input'
            }`}
          >
            Portrait/Square
            <span className="ml-1.5 text-xs opacity-70">
              ({counts.portrait})
            </span>
          </button>
          <button
            onClick={() => setFilter('no-license')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              filter === 'no-license'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-input'
            }`}
          >
            Mangler licens
            <span className="ml-1.5 text-xs opacity-70">
              ({counts['no-license']})
            </span>
          </button>
          <button
            onClick={() => setFilter('needs-review')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              filter === 'needs-review'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-background hover:bg-muted border-input'
            }`}
          >
            Afventer godkendelse
            <span className="ml-1.5 text-xs opacity-70">
              ({counts['needs-review']})
            </span>
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(audit => {
            const imageUrl = `${getSupabaseImageUrl(audit.bird.scientific_name)}?t=${refreshKey}`
            const badge = getStatusBadge(audit.status)

            return (
              <button
                key={audit.bird.id}
                onClick={() => setSelectedBird(audit.bird)}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden border-2 hover:border-primary transition-all cursor-pointer bg-muted"
              >
                {/* Status indicator dot */}
                <div className={`absolute top-2 left-2 size-3 rounded-full z-10 ${getStatusColor(audit.status)}`} />

                {/* Needs review indicator */}
                {audit.needsReview && (
                  <div className="absolute top-2 left-6 size-3 rounded-full z-10 bg-blue-500 ring-2 ring-white" title="Afventer godkendelse" />
                )}

                {/* Flagged indicator */}
                {flaggedIds.has(audit.bird.scientific_name) && (
                  <div className="absolute top-2 left-10 size-3 rounded-full z-10 bg-destructive ring-2 ring-white" title="Markeret" />
                )}

                {/* Image */}
                <img
                  src={imageUrl}
                  alt={audit.bird.name_da}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_SVG }}
                />

                {/* Overlay info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                    <div className="text-white text-xs font-medium truncate">
                      {audit.bird.name_da}
                    </div>
                    <div className="text-white/70 text-[10px] truncate">
                      {audit.bird.scientific_name}
                    </div>
                    {audit.license && (
                      <div className="text-white/90 text-[10px] font-medium">
                        {audit.license.toUpperCase()}
                      </div>
                    )}
                    {audit.isPortrait && (
                      <div className="text-orange-300 text-[10px]">
                        Portrait/Square
                      </div>
                    )}
                  </div>
                </div>

                {/* Issues badge (always visible) */}
                {audit.issues.length > 0 && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
                      {badge.text}
                    </Badge>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Ingen billeder matcher filteret
          </div>
        )}
      </div>

      {selectedBird && (
        <BirdDetailModal
          bird={selectedBird}
          imageData={{
            url: `${getSupabaseImageUrl(selectedBird.scientific_name)}?t=${refreshKey}`,
            source: 'supabase',
            status: 'loaded',
          }}
          isFlagged={flaggedIds.has(selectedBird.id)}
          needsReview={selectedAudit?.needsReview || false}
          onToggleFlag={(reason) => toggleFlag(selectedBird.scientific_name, reason)}
          onClose={() => setSelectedBird(null)}
          onImageChanged={handleImageChanged}
          onApproved={handleApproved}
        />
      )}
    </>
  )
}
