'use client'

import type { ImageAudit, FlagReason } from '@/lib/admin/image-status'
import { FLAG_REASONS } from '@/lib/admin/image-status'
import type { BirdImageActions } from '@/hooks/admin/useBirdImageActions'
import { LICENSE_OPTIONS, isKnownLicense } from '@/lib/admin/license-options'
import { InlineText } from './InlineText'
import { InlineSelect } from './InlineSelect'

interface BirdMetaFieldsProps {
  audit: ImageAudit
  actions: BirdImageActions
  pending?: boolean
  variant: 'strip' | 'summary'
}

export function BirdMetaFields({ audit, actions, pending, variant }: BirdMetaFieldsProps) {
  const name = audit.scientificName
  const license = audit.license ?? ''
  const licenseOptions =
    license && !isKnownLicense(license)
      ? [...LICENSE_OPTIONS, { value: license, label: license }]
      : LICENSE_OPTIONS

  const flagOptions = FLAG_REASONS.map(r => ({ value: r.value, label: r.label }))

  const rowClass = variant === 'strip' ? 'flex items-center gap-1 text-[11px]' : 'flex items-center gap-2 text-sm'
  const labelClass = 'shrink-0 font-medium text-muted-foreground'

  return (
    <div className={variant === 'strip' ? 'space-y-0.5' : 'space-y-2'}>
      <div className={rowClass}>
        <span className={labelClass}>Kredit</span>
        <InlineText
          value={audit.attribution ?? ''}
          placeholder="kredit"
          pending={pending}
          className="flex-1 truncate"
          onCommit={(next) => {
            actions.setCredit(name, { attribution: next })
          }}
        />
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Licens</span>
        <InlineSelect
          value={license}
          options={licenseOptions}
          placeholder="licens"
          pending={pending}
          onChange={(next) => {
            actions.setCredit(name, { license: next })
          }}
        />
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Flag</span>
        <InlineSelect
          value={audit.flagged ? (audit.flagReason ?? 'other') : ''}
          options={flagOptions}
          placeholder="markér"
          pending={pending}
          onChange={(next) => {
            actions.toggleFlag(name, next ? (next as FlagReason) : undefined)
          }}
        />
      </div>
    </div>
  )
}
