'use client'

import { useState } from 'react'
import type { Bird } from '@/lib/supabase/types'
import { getAdminImageUrl } from '@/lib/images'
import { PLACEHOLDER_SVG } from '@/lib/placeholder'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import BirdDetailModal from './BirdDetailModal'
import type { AuditSeverity, ImageAudit } from '@/lib/admin/image-status'
import { useBirdImageActions } from '@/hooks/admin/useBirdImageActions'
import {
  AUDIT_FILTERS,
  auditCounts,
  auditImageVersion,
  matchesAuditFilter,
  matchesSearch,
  type AuditFilter,
} from '@/lib/admin/audit-filters'

interface Props {
  audits: ImageAudit[]
  birdsByName: Record<string, Bird>
}

const SEVERITY_DOT: Record<AuditSeverity, string> = {
  critical: 'bg-red-500',
  warning: 'bg-yellow-500',
  ok: 'bg-green-500',
}

function severityBadge(severity: AuditSeverity): { variant: 'destructive' | 'default'; text: string } {
  if (severity === 'critical') return { variant: 'destructive', text: 'Kritisk' }
  if (severity === 'warning') return { variant: 'default', text: 'Advarsel' }
  return { variant: 'default', text: 'OK' }
}

// Colour the severity filter chips so the bar reads at a glance.
function chipClass(key: AuditFilter, active: boolean): string {
  if (active) return 'bg-primary text-primary-foreground border-primary'
  const tint: Partial<Record<AuditFilter, string>> = {
    critical: 'text-red-700 border-red-300 hover:bg-red-50',
    warning: 'text-yellow-700 border-yellow-300 hover:bg-yellow-50',
    ok: 'text-green-700 border-green-300 hover:bg-green-50',
  }
  return `bg-background hover:bg-muted border-input ${tint[key] ?? ''}`
}

export default function ImageAuditGrid({ audits: initialAudits, birdsByName }: Props) {
  const { audits, statusByName, pending, actions } = useBirdImageActions({ initialAudits })
  const [filter, setFilter] = useState<AuditFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedName, setSelectedName] = useState<string | null>(null)

  const counts = auditCounts(audits)
  const filtered = audits.filter(
    a => matchesAuditFilter(a, filter) && matchesSearch(a, birdsByName[a.scientificName]?.name_da, search),
  )

  const selectedAudit = selectedName ? audits.find(a => a.scientificName === selectedName) : null
  const selectedBird = selectedName ? birdsByName[selectedName] : null

  return (
    <>
      <div className="space-y-4">
        <Input
          type="search"
          placeholder="Søg fugl..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {/* Single filter bar — one source of truth (no duplicate filter UIs). */}
        <div className="flex flex-wrap gap-2">
          {AUDIT_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${chipClass(key, filter === key)}`}
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
            const badge = severityBadge(audit.severity)
            const status = statusByName.get(audit.scientificName)
            const isPending = pending.has(audit.scientificName)
            const imageUrl = getAdminImageUrl(audit.scientificName, auditImageVersion(audit))

            return (
              <button
                key={audit.scientificName}
                onClick={() => setSelectedName(audit.scientificName)}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden border-2 hover:border-primary transition-all cursor-pointer bg-muted"
              >
                <div className={`absolute top-2 left-2 size-3 rounded-full z-10 ${SEVERITY_DOT[audit.severity]}`} />

                {audit.needsReview && (
                  <div className="absolute top-2 left-6 size-3 rounded-full z-10 bg-blue-500 ring-2 ring-white" title="Afventer godkendelse" />
                )}

                {audit.flagged && (
                  <div className="absolute top-2 left-10 size-3 rounded-full z-10 bg-destructive ring-2 ring-white" title="Markeret" />
                )}

                {isPending && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
                    <Loader2 className="size-6 animate-spin text-white" />
                  </div>
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
                    {audit.issues.length > 0 && (
                      <ul className="pt-1 space-y-0.5">
                        {audit.issues.map((issue, i) => (
                          <li key={i} className="text-yellow-200 text-[10px] leading-tight">• {issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {audit.issues.length > 0 && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge
                      variant={badge.variant}
                      className="text-[10px] px-1.5 py-0"
                      title={audit.issues.join(' · ')}
                    >
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
          imageUrl={getAdminImageUrl(selectedBird.scientific_name, auditImageVersion(selectedAudit))}
          actions={actions}
          onClose={() => setSelectedName(null)}
        />
      )}
    </>
  )
}
