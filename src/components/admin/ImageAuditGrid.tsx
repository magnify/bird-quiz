'use client'

import { useState } from 'react'
import type { Bird } from '@/lib/supabase/types'
import { getSupabaseImageUrl } from '@/lib/images'
import { PLACEHOLDER_SVG } from '@/lib/placeholder'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import BirdDetailModal from './BirdDetailModal'
import type { AuditSeverity, ImageAudit } from '@/lib/admin/image-status'
import { useBirdImageActions } from '@/hooks/admin/useBirdImageActions'

type Filter = 'all' | 'critical' | 'warning' | 'ok' | 'portrait' | 'no-license' | 'needs-review' | 'missing'

interface Props {
  audits: ImageAudit[]
  birdsByName: Record<string, Bird>
}

export default function ImageAuditGrid({ audits: initialAudits, birdsByName }: Props) {
  const { audits, statusByName, refreshKey, actions } = useBirdImageActions({ initialAudits })
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [selectedName, setSelectedName] = useState<string | null>(null)

  const filtered = audits.filter(audit => {
    if (search) {
      const q = search.toLowerCase()
      const bird = birdsByName[audit.scientificName]
      const matches =
        audit.scientificName.toLowerCase().includes(q) ||
        bird?.name_da.toLowerCase().includes(q)
      if (!matches) return false
    }

    if (filter === 'all') return true
    if (filter === 'critical' || filter === 'warning' || filter === 'ok') {
      return audit.severity === filter
    }
    if (filter === 'portrait') return audit.isPortrait
    if (filter === 'no-license') return !audit.license
    if (filter === 'needs-review') return audit.needsReview
    if (filter === 'missing') return !audit.hasFile
    return true
  })

  const counts = {
    all: audits.length,
    critical: audits.filter(a => a.severity === 'critical').length,
    warning: audits.filter(a => a.severity === 'warning').length,
    ok: audits.filter(a => a.severity === 'ok').length,
    portrait: audits.filter(a => a.isPortrait).length,
    'no-license': audits.filter(a => !a.license).length,
    'needs-review': audits.filter(a => a.needsReview).length,
    missing: audits.filter(a => !a.hasFile).length,
  }

  const getStatusColor = (severity: AuditSeverity) => {
    if (severity === 'critical') return 'bg-red-500'
    if (severity === 'warning') return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusBadge = (severity: AuditSeverity) => {
    if (severity === 'critical') return { variant: 'destructive' as const, text: 'Kritisk' }
    if (severity === 'warning') return { variant: 'default' as const, text: 'Advarsel' }
    return { variant: 'default' as const, text: 'OK' }
  }

  const selectedAudit = selectedName ? audits.find(a => a.scientificName === selectedName) : null
  const selectedBird = selectedName ? birdsByName[selectedName] : null

  return (
    <>
      <div className="space-y-4">
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
            <div className="text-3xl font-bold tabular-nums text-red-600 mb-2">{counts.critical}</div>
            <div className="text-xs text-muted-foreground">Mangler kredit eller har NC-licens</div>
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
            <div className="text-3xl font-bold tabular-nums text-yellow-600 mb-2">{counts.warning}</div>
            <div className="text-xs text-muted-foreground">Mindre problemer med licens/kvalitet</div>
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
            <div className="text-3xl font-bold tabular-nums text-green-600 mb-2">{counts.ok}</div>
            <div className="text-xs text-muted-foreground">Korrekt licenseret og dokumenteret</div>
          </button>
        </div>

        <Input
          type="search"
          placeholder="Søg fugl..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <div className="flex flex-wrap gap-2">
          {([
            ['all', 'Alle'],
            ['portrait', 'Portrait/Square'],
            ['no-license', 'Mangler licens'],
            ['needs-review', 'Afventer godkendelse'],
            ['missing', 'Intet billede'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                filter === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-input'
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-70">({counts[key]})</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(audit => {
            const bird = birdsByName[audit.scientificName]
            if (!bird) return null
            const imageUrl = `${getSupabaseImageUrl(audit.scientificName)}?t=${refreshKey}`
            const badge = getStatusBadge(audit.severity)
            const status = statusByName.get(audit.scientificName)

            return (
              <button
                key={audit.scientificName}
                onClick={() => setSelectedName(audit.scientificName)}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden border-2 hover:border-primary transition-all cursor-pointer bg-muted"
              >
                <div className={`absolute top-2 left-2 size-3 rounded-full z-10 ${getStatusColor(audit.severity)}`} />

                {audit.needsReview && (
                  <div className="absolute top-2 left-6 size-3 rounded-full z-10 bg-blue-500 ring-2 ring-white" title="Afventer godkendelse" />
                )}

                {audit.flagged && (
                  <div className="absolute top-2 left-10 size-3 rounded-full z-10 bg-destructive ring-2 ring-white" title="Markeret" />
                )}

                {status?.kind === 'missing' ? (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    Intet billede
                  </div>
                ) : (
                  <img
                    src={imageUrl}
                    alt={bird.name_da}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_SVG }}
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                    <div className="text-white text-xs font-medium truncate">{bird.name_da}</div>
                    <div className="text-white/70 text-[10px] truncate">{audit.scientificName}</div>
                    {audit.license && (
                      <div className="text-white/90 text-[10px] font-medium">{audit.license.toUpperCase()}</div>
                    )}
                    {audit.isPortrait && (
                      <div className="text-orange-300 text-[10px]">Portrait/Square</div>
                    )}
                  </div>
                </div>

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
          <div className="text-center py-12 text-muted-foreground">Ingen billeder matcher filteret</div>
        )}
      </div>

      {selectedBird && selectedAudit && (
        <BirdDetailModal
          bird={selectedBird}
          audit={selectedAudit}
          imageUrl={`${getSupabaseImageUrl(selectedBird.scientific_name)}?t=${refreshKey}`}
          actions={actions}
          onClose={() => setSelectedName(null)}
        />
      )}
    </>
  )
}
