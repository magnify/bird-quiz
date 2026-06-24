'use client'

import { useMemo, useState } from 'react'
import type { Bird } from '@/lib/supabase/types'
import type { AuditSeverity, ImageAudit } from '@/lib/admin/image-status'
import { getAdminImageUrl } from '@/lib/images'
import { auditImageVersion, matchesSearch } from '@/lib/admin/audit-filters'
import { namesInCopyright } from '@/lib/admin/copyright-check'
import { useBirdImageActions } from '@/hooks/admin/useBirdImageActions'
import { LICENSE_OPTIONS, isKnownLicense } from '@/lib/admin/license-options'
import { InlineText } from './InlineText'
import { InlineSelect } from './InlineSelect'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  audits: ImageAudit[]
  birdsByName: Record<string, Bird>
}

const SEVERITY: Record<AuditSeverity, { dot: string; label: string }> = {
  critical: { dot: 'bg-red-500', label: 'Kritisk' },
  warning: { dot: 'bg-yellow-500', label: 'Advarsel' },
  ok: { dot: 'bg-green-500', label: 'OK' },
}

export function MetadataTable({ audits: initialAudits, birdsByName }: Props) {
  const { audits, actions, pending } = useBirdImageActions({ initialAudits })
  const [search, setSearch] = useState('')
  const [onlyNameInCredit, setOnlyNameInCredit] = useState(false)

  const rows = useMemo(
    () =>
      audits.map(a => {
        const bird = birdsByName[a.scientificName]
        return { a, bird, nameHits: namesInCopyright(a.attribution, bird?.name_da ?? '', bird?.name_en) }
      }),
    [audits, birdsByName],
  )

  const nameInCreditCount = rows.filter(r => r.nameHits.length > 0).length
  const filtered = rows.filter(
    r =>
      matchesSearch(r.a, r.bird?.name_da, search) &&
      (!onlyNameInCredit || r.nameHits.length > 0),
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Søg navn, kilde eller kreditering…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <button
          type="button"
          onClick={() => setOnlyNameInCredit(v => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
            onlyNameInCredit
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-input bg-background hover:bg-muted text-muted-foreground',
          )}
        >
          Navn i kreditering
          <Badge variant="secondary" className="tabular-nums">{nameInCreditCount}</Badge>
        </button>
        <span className="text-sm text-muted-foreground tabular-nums ml-auto">
          {filtered.length} / {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="py-2 pl-3 pr-2 font-medium">Billede</th>
              <th className="py-2 px-2 font-medium">Navn</th>
              <th className="py-2 px-2 font-medium">Kilde</th>
              <th className="py-2 px-2 font-medium">Kreditering</th>
              <th className="py-2 px-2 font-medium">Licens</th>
              <th className="py-2 px-2 pr-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ a, bird, nameHits }) => {
              const isPending = pending.has(a.scientificName)
              const license = a.license ?? ''
              const licenseOptions = license && !isKnownLicense(license)
                ? [...LICENSE_OPTIONS, { value: license, label: license }]
                : LICENSE_OPTIONS
              return (
                <tr
                  key={a.scientificName}
                  className={cn(
                    'border-b last:border-0 align-top hover:bg-muted/30',
                    nameHits.length > 0 && 'bg-amber-50/60 hover:bg-amber-100/50',
                  )}
                >
                  <td className="py-2 pl-3 pr-2">
                    {a.hasFile ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getAdminImageUrl(a.scientificName, auditImageVersion(a))}
                        alt={bird?.name_da ?? a.scientificName}
                        className="size-10 rounded object-cover bg-muted"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-10 rounded bg-muted" />
                    )}
                  </td>
                  <td className="py-2 px-2 min-w-0">
                    <div className="font-medium">{bird?.name_da ?? '—'}</div>
                    <div className="text-xs italic text-muted-foreground">{a.scientificName}</div>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{a.source || '—'}</td>
                  <td className="py-2 px-2 max-w-md">
                    <InlineText
                      value={a.attribution ?? ''}
                      placeholder="kredit"
                      pending={isPending}
                      className="w-full"
                      onCommit={next => { actions.setCredit(a.scientificName, { attribution: next }) }}
                    />
                    {nameHits.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {nameHits.map(n => (
                          <Badge key={n} className="bg-amber-200 text-amber-900 hover:bg-amber-200">Navn: {n}</Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 whitespace-nowrap">
                    <InlineSelect
                      value={license}
                      options={licenseOptions}
                      placeholder="licens"
                      pending={isPending}
                      onChange={next => { actions.setCredit(a.scientificName, { license: next }) }}
                    />
                  </td>
                  <td className="py-2 px-2 pr-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn('inline-block size-2 rounded-full', SEVERITY[a.severity].dot)} title={SEVERITY[a.severity].label} />
                      {a.needsReview && <Badge variant="secondary">Gennemsyn</Badge>}
                      {a.flagged && <Badge variant="destructive">Flag</Badge>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Ingen rækker matcher</p>
        )}
      </div>
    </div>
  )
}
