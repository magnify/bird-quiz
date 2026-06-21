# Missed Birds Redesign

## Problem

The `/resultater` page shows a "Fugle du missede" carousel with only the top 6 most-missed
birds aggregated across all sessions (filtered to ≥2 misses). Users want to see the latest
session's missed birds alongside the aggregate view, and see full image carousels when
expanding session details.

The post-quiz results screen (`QuizResults.tsx`) also omits the `×N` count badge even when
a bird was missed multiple times in the same session.

## Changes

### 1. MyResults.tsx — Tabbed top section

Replace the single "Fugle du missede" card with a tabbed section containing two views:

**State:** `type MissedTab = 'most-missed' | 'latest'`

**"Mest missede" tab (default)**
- Same logic as current `weakBirds`: aggregate across all sessions, birds missed ≥2×,
  sorted by count descending, top 6.
- Carousel items include `count` for ×N badge (unchanged).

**"Seneste quiz" tab**
- Uses `results[0].missed` (results already newest-first).
- Deduplicate by `scientificName`, count occurrences within the session.
- Map to `MissedBirdsCarousel` items: `key: scientificName`, `imageUrl: getBirdImageUrl(scientificName)`,
  `count` for ×N badge.

**Tab bar**
- Two buttons styled as a segmented control below the "Dine resultater" heading.
- Active tab has visual highlight. Switch is instant (no animation).

**Layout:**
```
[Dine resultater]
[Baseret på N quizzer...]

[Mest missede | Seneste quiz]   ← tab bar

[carousel content]              ← conditionally rendered

[summary stats]
[session list]
```

### 2. MyResults.tsx — Per-session expandable carousels

Replace the current name-chip list in expanded session rows with a `MissedBirdsCarousel`.

- Each `r.missed` array is deduplicated by `scientificName` with count tracking.
- Map to carousel items: `key: scientificName`, `imageUrl: getBirdImageUrl(scientificName)`,
  `count: timesMissedInSession`.
- The carousel replaces the `<div className="result-detail-missed-list">` entirely.
- Keep the "Forkerte (N)" title.

### 3. QuizResults.tsx — Count in post-quiz carousel

Replace the current dedup logic:

```ts
// Before (no count):
const uniqueMissed = [
  ...new Map(missed.map(b => [b.id, b])).values(),
]
```

With count-by-id logic that deduplicates while preserving the highest count per bird:

```ts
const missedCounts = new Map<string, { bird: Bird; count: number }>()
for (const b of missed) {
  const entry = missedCounts.get(b.id)
  if (entry) entry.count++
  else missedCounts.set(b.id, { bird: b, count: 1 })
}
const uniqueMissed = [...missedCounts.values()]
```

Then pass `count` to the carousel items:

```tsx
items={uniqueMissed.map(({ bird, count }) => ({
  key: bird.id,
  nameDa: bird.name_da,
  nameEn: bird.name_en,
  imageUrl: imageUrls.get(bird.id) ?? getBirdImageUrl(bird.scientific_name),
  count,
}))}
```

### Files modified

- `src/components/quiz/MyResults.tsx` — tab toggle, per-session carousels
- `src/components/quiz/QuizResults.tsx` — count-by-id dedup

### Files not modified

- `MissedBirdsCarousel.tsx` — already supports `count`, no changes needed
- `result-history.ts` — data model unchanged
- No CSS changes needed (existing carousel styles work)

### Out of scope

- No "practice" button (per user request)
- No Supabase changes (data stays in localStorage)
- No image preloading changes
