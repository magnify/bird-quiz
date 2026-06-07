# Inline metadata editing — design

**Date:** 2026-06-07
**Status:** Approved (pending spec review)

## Problem

Editing image metadata (credit, license, flag) currently requires opening the
detail modal and entering a separate "Rediger metadata" form. Fixing the common
`Advarsel` issues (Mangler kredit, Mangler licens) across many birds is slow.
The admin wants to add/remove all metadata inline — both on the grid and in the
modal — without the form ceremony.

## Goal

Edit **all** image metadata (Kredit, Licens, Flag) inline, in two places:
- the **ImageAuditGrid** card (an always-visible meta strip), and
- the **BirdDetailModal** summary view.

Each field saves independently, on blur/Enter, with a toast, reconciling to
server truth via `router.refresh()` (the existing admin state model).

Out of scope: `BirdGrid` (/admin/birds) — it is a taxonomy browser, not image
audit, and keeps its current card layout.

## Decisions (from brainstorming)

- **All metadata inline**: Kredit, Licens, Flag.
- **Both locations**: grid card meta strip + modal summary.
- **Save trigger**: auto-save on blur / Enter; Esc cancels.
- **Field types**: Kredit = free text; Licens = picker (+ custom); Flag = picker.
- **Grid model**: always-visible meta strip below the thumbnail. Clicking the
  photo opens the modal; field interactions `stopPropagation` so they don't.
- **Keep** the modal's existing "Rediger metadata" view. Inline editing is
  added alongside it, not a replacement. (Two entry points to the same data is
  accepted here because the inline path is for quick single-field edits and the
  form remains for deliberate multi-field edits.)

## Architecture

### Components

- **`BirdMetaFields`** (new, `src/components/admin/BirdMetaFields.tsx`)
  - Props: `audit: ImageAudit`, `actions: BirdImageActions`, `variant: 'strip' | 'summary'`.
  - Renders three inline controls (Kredit/Licens/Flag). `variant` controls
    density (compact strip on cards vs. roomier in the modal). One component,
    used in both places — no duplicated logic.
  - In the grid, the wrapping element calls `stopPropagation` on pointer events
    so editing never triggers the card's open-modal click.

- **`InlineText`** (new, small) — click-to-edit text input. Saves on blur/Enter,
  cancels on Esc, shows a pending spinner while saving, disabled during save.

- **`InlineSelect`** (new, small) — dropdown built on the existing shadcn
  primitives. Used for Licens and Flag. Supports an "Andet…" custom entry for
  Licens that reveals an `InlineText`.

### Data / state

- **`useBirdImageActions`** gains:
  - `setCredit(scientificName, { attribution?, license? }): Promise<boolean>` —
    POSTs to the existing `/api/admin/images/credit`, then `toast` + `router.refresh()`.
    Marks the bird pending while in flight.
  - Flag continues to use the existing `toggleFlag(name, reason?)`.
- No new API endpoints. The credit route already accepts `{ attribution, license }`;
  an inline save sends the current values with the one edited field changed.

### License options

- **`src/lib/admin/license-options.ts`** (new, pure): the curated list
  (`cc-by-2.0`, `cc-by-3.0`, `cc-by-4.0`, `cc-by-sa-2.0`, `cc-by-sa-3.0`,
  `cc-by-sa-4.0`, `cc0`, `public-domain`, `own`, `copyright`) plus helpers:
  - `LICENSE_OPTIONS: { value, label }[]`
  - `isKnownLicense(value: string): boolean` — to decide whether an existing
    value is a preset or a custom string (so the picker shows "Andet…" + text).

## Data flow (one inline credit edit)

1. User clicks the Kredit value in the grid strip → `InlineText` enters edit mode.
2. User types, presses Enter (or blurs).
3. `BirdMetaFields` calls `actions.setCredit(name, { attribution, license })`.
4. Hook marks bird pending → POST credit route → on ok: `toast.success` +
   `router.refresh()`; on failure: `toast.error(reason)`.
5. `router.refresh()` re-reads R2 server-side → fresh audit props flow in →
   counts/badges/issues update from truth. Pending clears.

## Error handling

- Server failures surface as a red Sonner toast with the real message.
- On failure no optimistic value is kept; the refresh reflects server truth.
- Per-field pending state prevents double-submits.

## Testing

- **Unit:** `license-options` (known vs custom detection, option completeness).
  Any value normalization in `setCredit`.
- **Not unit-tested (stated honestly):** the click→edit→save→toast React
  interaction. Best covered by Playwright e2e later; this spec does not claim
  unit coverage of the UI behaviour.

## Files

New:
- `src/components/admin/BirdMetaFields.tsx`
- `src/components/admin/InlineText.tsx`
- `src/components/admin/InlineSelect.tsx`
- `src/lib/admin/license-options.ts` (+ `.test.ts`)

Changed:
- `src/hooks/admin/useBirdImageActions.ts` — add `setCredit`.
- `src/components/admin/ImageAuditGrid.tsx` — render `BirdMetaFields variant="strip"` in the card; ensure photo-click vs field-click separation.
  - **Card restructure (required):** the card is currently a single `<button>`.
    Inputs/selects cannot be nested inside a button (invalid HTML). Restructure
    to a `<div>` card whose **photo region** is the modal trigger (a button or
    click handler), with the meta strip as a sibling below it — not nested in
    the trigger.
- `src/components/admin/BirdDetailModal.tsx` — render `BirdMetaFields variant="summary"` on the summary view (alongside the kept "Rediger metadata" button).
