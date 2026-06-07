# Inline Metadata Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins edit image metadata (Kredit, Licens, Flag) inline — both on the ImageAuditGrid card and in the BirdDetailModal summary — saving per-field on blur/Enter with a toast.

**Architecture:** A single `BirdMetaFields` component (variant `strip` | `summary`) composes small `InlineText` and `InlineSelect` controls. Saves go through a new `setCredit` action on `useBirdImageActions` (existing `/api/admin/images/credit`) and the existing `toggleFlag`; both already toast + `router.refresh()` to reconcile to server truth. License presets live in a pure, tested module.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind, Sonner, Vitest. `InlineSelect` uses a styled native `<select>` (no shadcn Select is installed).

---

## File structure

New:
- `src/lib/admin/license-options.ts` — license preset list + helpers (pure)
- `src/lib/admin/license-options.test.ts` — unit tests
- `src/components/admin/InlineText.tsx` — click-to-edit text, save on blur/Enter
- `src/components/admin/InlineSelect.tsx` — styled native `<select>`
- `src/components/admin/BirdMetaFields.tsx` — composes the three fields

Changed:
- `src/hooks/admin/useBirdImageActions.ts` — add `setCredit`
- `src/components/admin/BirdDetailModal.tsx` — render `BirdMetaFields variant="summary"`
- `src/components/admin/ImageAuditGrid.tsx` — restructure card `<button>` → `<div>` + render `BirdMetaFields variant="strip"`

Testing reality: only the pure license module is unit-tested. Components are verified by `next build` (type-checks) and manual/e2e — the repo has no React component test setup, and this plan does not pretend otherwise.

Commands:
- Build: `source ~/.nvm/nvm.sh && nvm use 22 && npx next build`
- Unit tests: `source ~/.nvm/nvm.sh && nvm use 22 && npx vitest run src/`

---

### Task 1: License options module (pure, TDD)

**Files:**
- Create: `src/lib/admin/license-options.ts`
- Test: `src/lib/admin/license-options.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/admin/license-options.test.ts
import { describe, it, expect } from 'vitest'
import { LICENSE_OPTIONS, isKnownLicense } from './license-options'

describe('LICENSE_OPTIONS', () => {
  it('includes the common presets', () => {
    const values = LICENSE_OPTIONS.map(o => o.value)
    expect(values).toEqual(
      expect.arrayContaining(['cc-by-2.0', 'cc-by-sa-4.0', 'cc0', 'own', 'copyright']),
    )
  })

  it('every option has a non-empty label', () => {
    for (const o of LICENSE_OPTIONS) expect(o.label.length).toBeGreaterThan(0)
  })
})

describe('isKnownLicense', () => {
  it('matches presets case-insensitively', () => {
    expect(isKnownLicense('cc-by-2.0')).toBe(true)
    expect(isKnownLicense('CC-BY-2.0')).toBe(true)
  })

  it('rejects unknown / empty values', () => {
    expect(isKnownLicense('weird-license')).toBe(false)
    expect(isKnownLicense('')).toBe(false)
    expect(isKnownLicense(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx vitest run src/lib/admin/license-options.test.ts`
Expected: FAIL — cannot find module `./license-options`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/admin/license-options.ts
export interface LicenseOption {
  value: string
  label: string
}

export const LICENSE_OPTIONS: LicenseOption[] = [
  { value: 'cc-by-2.0', label: 'CC BY 2.0' },
  { value: 'cc-by-3.0', label: 'CC BY 3.0' },
  { value: 'cc-by-4.0', label: 'CC BY 4.0' },
  { value: 'cc-by-sa-2.0', label: 'CC BY-SA 2.0' },
  { value: 'cc-by-sa-3.0', label: 'CC BY-SA 3.0' },
  { value: 'cc-by-sa-4.0', label: 'CC BY-SA 4.0' },
  { value: 'cc0', label: 'CC0 / Public Domain' },
  { value: 'public-domain', label: 'Public Domain' },
  { value: 'own', label: 'Eget billede' },
  { value: 'copyright', label: 'Copyright (med tilladelse)' },
]

export function isKnownLicense(value: string | undefined): boolean {
  if (!value) return false
  const v = value.toLowerCase()
  return LICENSE_OPTIONS.some(o => o.value === v)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx vitest run src/lib/admin/license-options.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/license-options.ts src/lib/admin/license-options.test.ts
git commit -m "feat: license preset options module"
```

---

### Task 2: Add `setCredit` to the actions hook

**Files:**
- Modify: `src/hooks/admin/useBirdImageActions.ts`

- [ ] **Step 1: Extend the `BirdImageActions` interface**

In `src/hooks/admin/useBirdImageActions.ts`, add to the `BirdImageActions` interface (after `approve`):

```ts
  setCredit(scientificName: string, patch: { attribution?: string; license?: string }): Promise<boolean>
```

- [ ] **Step 2: Implement `setCredit` inside the hook**

Add this `useCallback` next to `approve` (it reuses `auditByName` to fill the unedited field so the credit route receives both values):

```ts
  const setCredit = useCallback(
    async (scientificName: string, patch: { attribution?: string; license?: string }): Promise<boolean> => {
      const current = auditByName.get(scientificName)
      const attribution = patch.attribution ?? current?.attribution ?? ''
      const license = patch.license ?? current?.license ?? ''

      setPendingFor(scientificName, true)
      const res = await fetch('/api/admin/images/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scientificName, attribution, license }),
      }).catch(() => null)
      setPendingFor(scientificName, false)

      if (res?.ok) {
        toast.success('Metadata gemt')
        router.refresh()
        return true
      }
      toast.error('Kunne ikke gemme metadata')
      return false
    },
    [auditByName, router, setPendingFor],
  )
```

- [ ] **Step 3: Expose it on the returned actions**

Update the `actions` memo to include `setCredit`:

```ts
  const actions: BirdImageActions = useMemo(
    () => ({ toggleFlag, approve, setCredit, refresh }),
    [toggleFlag, approve, setCredit, refresh],
  )
```

- [ ] **Step 4: Build to type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx next build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/admin/useBirdImageActions.ts
git commit -m "feat: setCredit action with toast + refresh"
```

---

### Task 3: `InlineText` control

**Files:**
- Create: `src/components/admin/InlineText.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/admin/InlineText.tsx
'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface InlineTextProps {
  value: string
  placeholder: string
  pending?: boolean
  className?: string
  /** Save the new value. Return false to keep editing (e.g. on failure). */
  onCommit: (next: string) => void | Promise<void>
}

export function InlineText({ value, placeholder, pending, className, onCommit }: InlineTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <button
        type="button"
        className={`text-left hover:underline ${value ? '' : 'text-muted-foreground'} ${className ?? ''}`}
        onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true) }}
      >
        {pending ? <Loader2 className="size-3 animate-spin inline" /> : (value || `+ ${placeholder}`)}
      </button>
    )
  }

  const commit = async () => {
    setEditing(false)
    if (draft !== value) await onCommit(draft)
  }

  return (
    <input
      autoFocus
      value={draft}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() }
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      }}
      className={`w-full rounded border border-input bg-background px-1.5 py-0.5 text-xs ${className ?? ''}`}
    />
  )
}
```

- [ ] **Step 2: Build to type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx next build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/InlineText.tsx
git commit -m "feat: InlineText click-to-edit control"
```

---

### Task 4: `InlineSelect` control

**Files:**
- Create: `src/components/admin/InlineSelect.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/admin/InlineSelect.tsx
'use client'

import { Loader2 } from 'lucide-react'

interface Option { value: string; label: string }

interface InlineSelectProps {
  value: string
  options: Option[]
  placeholder: string
  pending?: boolean
  className?: string
  onChange: (next: string) => void | Promise<void>
}

export function InlineSelect({ value, options, placeholder, pending, className, onChange }: InlineSelectProps) {
  if (pending) return <Loader2 className="size-3 animate-spin inline" />
  return (
    <select
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.value) }}
      className={`rounded border border-input bg-background px-1.5 py-0.5 text-xs ${value ? '' : 'text-muted-foreground'} ${className ?? ''}`}
    >
      <option value="">{`+ ${placeholder}`}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
```

- [ ] **Step 2: Build to type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx next build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/InlineSelect.tsx
git commit -m "feat: InlineSelect native-select control"
```

---

### Task 5: `BirdMetaFields` component

**Files:**
- Create: `src/components/admin/BirdMetaFields.tsx`

Notes: License uses `InlineSelect` with `LICENSE_OPTIONS`; if the current license
is a non-preset value (`isKnownLicense` false but non-empty), append it as a
one-off option so it stays selectable. Flag uses `InlineSelect` over `FLAG_REASONS`
(empty value = unflagged) and routes through `actions.toggleFlag`.

- [ ] **Step 1: Write the component**

```tsx
// src/components/admin/BirdMetaFields.tsx
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
          onCommit={(next) => actions.setCredit(name, { attribution: next })}
        />
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Licens</span>
        <InlineSelect
          value={license}
          options={licenseOptions}
          placeholder="licens"
          pending={pending}
          onChange={(next) => actions.setCredit(name, { license: next })}
        />
      </div>
      <div className={rowClass}>
        <span className={labelClass}>Flag</span>
        <InlineSelect
          value={audit.flagged ? (audit.flagReason ?? 'other') : ''}
          options={flagOptions}
          placeholder="markér"
          pending={pending}
          onChange={(next) => actions.toggleFlag(name, next ? (next as FlagReason) : undefined)}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx next build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/BirdMetaFields.tsx
git commit -m "feat: BirdMetaFields inline editor"
```

---

### Task 6: Render `BirdMetaFields` in the modal summary

**Files:**
- Modify: `src/components/admin/BirdDetailModal.tsx`

The summary view currently shows a read-only Kredit/Licens block (the
`status.kind !== 'missing'` block) and keeps the "Rediger metadata" button.
Add the inline editor above the read-only block (the read-only block stays — it
mirrors the kept form; the inline editor is the quick path).

- [ ] **Step 1: Import the component**

Add near the other imports in `BirdDetailModal.tsx`:

```tsx
import { BirdMetaFields } from './BirdMetaFields'
```

- [ ] **Step 2: Render it in the summary**

In the summary view, immediately before the `{status.kind !== 'missing' && (` read-only credit block, insert:

```tsx
                {status.kind !== 'missing' && (
                  <div className="rounded-md border p-3">
                    <BirdMetaFields audit={audit} actions={actions} variant="summary" />
                  </div>
                )}
```

- [ ] **Step 3: Build to type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx next build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/BirdDetailModal.tsx
git commit -m "feat: inline metadata fields in detail modal summary"
```

---

### Task 7: Restructure the audit card and add the meta strip

**Files:**
- Modify: `src/components/admin/ImageAuditGrid.tsx`

The card is currently a single `<button>` (`onClick={() => setSelectedName(...)}`).
Inputs/selects cannot live inside a button. Restructure: outer `<div>` card;
the image/placeholder area becomes the clickable modal trigger; the meta strip
is a sibling below it.

- [ ] **Step 1: Import the component**

Add to imports in `ImageAuditGrid.tsx`:

```tsx
import { BirdMetaFields } from './BirdMetaFields'
```

- [ ] **Step 2: Replace the card `<button>` wrapper with a `<div>` + clickable photo region**

Find the `return (` inside `filtered.map(audit => {` (the `<button key={audit.scientificName} onClick={() => setSelectedName(...)} ...>`). Replace the outer `<button>...</button>` with this structure — the existing dots/overlay/image markup moves inside the inner photo `<button>`, and the meta strip is added after it:

```tsx
              <div
                key={audit.scientificName}
                className="group relative rounded-lg overflow-hidden border-2 bg-muted"
              >
                <button
                  type="button"
                  onClick={() => setSelectedName(audit.scientificName)}
                  className="relative block w-full aspect-[4/3] cursor-pointer hover:opacity-95 transition-opacity"
                >
                  {/* keep the existing severity dot, needsReview/flagged dots,
                      pending overlay, image/placeholder, hover overlay, and the
                      issues Badge here, exactly as before */}
                </button>

                <div className="border-t bg-background p-2" onClick={(e) => e.stopPropagation()}>
                  <BirdMetaFields audit={audit} actions={actions} pending={isPending} variant="strip" />
                </div>
              </div>
```

Keep the inner contents (dots, `isPending` overlay, `<img>`, hover overlay,
issues badge) unchanged — only the wrapping element and the appended meta strip
are new. The grid container's `aspect-[4/3]` moves from the card to the inner
photo button (the card is now taller because of the strip).

- [ ] **Step 3: Build to type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx next build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Manual verification (admin auth required)**

Run the prod-style flow per the project deploy, then in `/admin → Billeder`:
- The strip shows under each card; editing Kredit (Enter) shows a toast and the
  Advarsel/counts update; the photo click still opens the modal.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ImageAuditGrid.tsx
git commit -m "feat: inline metadata strip on audit cards"
```

---

## Self-review

- **Spec coverage:** all-metadata-inline (Task 5), both locations (Tasks 6–7),
  auto-save on blur/Enter (Task 3), license & flag pickers (Tasks 4–5), keep
  "Rediger metadata" view (Task 6 keeps the form), `setCredit` no new endpoint
  (Task 2), license-options pure + tested (Task 1), card `<button>` restructure
  (Task 7). Covered.
- **Types:** `BirdImageActions.setCredit` signature defined in Task 2 and used in
  Task 5; `FlagReason`/`FLAG_REASONS` from `image-status`; `LICENSE_OPTIONS`/
  `isKnownLicense` from Task 1 used in Task 5 — consistent.
- **Honest testing:** only Task 1 is unit-tested; component tasks verify via
  `next build` + manual, matching the repo's lack of component-test infra.
