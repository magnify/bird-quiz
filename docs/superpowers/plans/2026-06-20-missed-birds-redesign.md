# Missed Birds Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Redesign the `/resultater` page to show latest session's missed birds alongside the aggregate view, replace per-session name chips with image carousels, and add ×N count badges to the post-quiz results.

**Architecture:** Two files modified — `MyResults.tsx` (tab toggle + per-session carousels) and `QuizResults.tsx` (count-based dedup). No data model or CSS changes needed.

**Tech Stack:** Next.js, TypeScript, CSS (quiz.css), localStorage

---

### Task 1: QuizResults.tsx — count-based dedup

**Files:**
- Modify: `src/components/quiz/QuizResults.tsx:75-77`

- [ ] **Step 1: Replace Map-based dedup with count-based dedup**

In `QuizResults.tsx`, replace lines 75-77:

```ts
const uniqueMissed = [
  ...new Map(missed.map(b => [b.id, b])).values(),
]
```

With count-by-id logic:

```ts
const missedCounts = new Map<string, { bird: Bird; count: number }>()
for (const b of missed) {
  const entry = missedCounts.get(b.id)
  if (entry) {
    entry.count++
  } else {
    missedCounts.set(b.id, { bird: b, count: 1 })
  }
}
const uniqueMissed = [...missedCounts.values()]
```

- [ ] **Step 2: Pass count to carousel items**

Replace the carousel items mapping (lines 163-169):

```tsx
<MissedBirdsCarousel
  items={uniqueMissed.map(b => ({
    key: b.id,
    nameDa: b.name_da,
    nameEn: b.name_en,
    imageUrl: imageUrls.get(b.id) ?? getBirdImageUrl(b.scientific_name),
  }))}
/>
```

With:

```tsx
<MissedBirdsCarousel
  items={uniqueMissed.map(({ bird, count }) => ({
    key: bird.id,
    nameDa: bird.name_da,
    nameEn: bird.name_en,
    imageUrl: imageUrls.get(bird.id) ?? getBirdImageUrl(bird.scientific_name),
    count,
  }))}
/>
```

- [ ] **Step 3: Build and verify**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npm run build`

### Task 2: MyResults.tsx — tab toggle + per-session carousels

**Files:**
- Modify: `src/components/quiz/MyResults.tsx`

- [ ] **Step 1: Add dedup-with-count helper**

Add a helper function before the `MyResults` component (after the format functions, around line 41):

```ts
function dedupeWithCount(
  missed: { nameDa: string; nameEn: string; scientificName: string }[]
): { nameDa: string; nameEn: string; scientificName: string; count: number }[] {
  const counts = new Map<string, { nameDa: string; nameEn: string; scientificName: string; count: number }>()
  for (const b of missed) {
    const entry = counts.get(b.scientificName)
    if (entry) {
      entry.count++
    } else {
      counts.set(b.scientificName, { ...b, count: 1 })
    }
  }
  return [...counts.values()]
}
```

- [ ] **Step 2: Add missedTab state and derived data**

After the `weakBirds` useMemo (line 84), add:

```ts
const [missedTab, setMissedTab] = useState<'most-missed' | 'latest'>('most-missed')

const latestMissed = useMemo(() => {
  if (results.length === 0) return []
  return dedupeWithCount(results[0].missed)
}, [results])
```

Also add the `useState` import if not already there — it is (line 5).

- [ ] **Step 3: Replace the weak birds card with tabbed section**

Replace lines 157-172 (the entire `{weakBirds.length > 0 && (...)}` block):

```tsx
{results.length > 0 && (
  <div className="result-card result-card--padded">
    <div className="my-results-missed-tabs">
      <button
        className={`my-results-missed-tab ${missedTab === 'most-missed' ? 'active' : ''}`}
        onClick={() => setMissedTab('most-missed')}
      >
        Mest missede
      </button>
      <button
        className={`my-results-missed-tab ${missedTab === 'latest' ? 'active' : ''}`}
        onClick={() => setMissedTab('latest')}
      >
        Seneste quiz
      </button>
    </div>

    {missedTab === 'most-missed' && weakBirds.length > 0 && (
      <>
        <p className="setting-label setting-label--spaced">
          Fugle du missede
        </p>
        <MissedBirdsCarousel
          items={weakBirds.map(b => ({
            key: b.scientificName,
            nameDa: b.nameDa,
            nameEn: b.nameEn,
            imageUrl: getBirdImageUrl(b.scientificName),
            count: b.count,
          }))}
        />
      </>
    )}

    {missedTab === 'latest' && latestMissed.length > 0 && (
      <>
        <p className="setting-label setting-label--spaced">
          Fugle du missede i seneste quiz ({latestMissed.length})
        </p>
        <MissedBirdsCarousel
          items={latestMissed.map(b => ({
            key: b.scientificName,
            nameDa: b.nameDa,
            nameEn: b.nameEn,
            imageUrl: getBirdImageUrl(b.scientificName),
            count: b.count,
          }))}
        />
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Replace per-session name chips with carousel**

Replace the missed bird list inside the expanded session section (lines 209-221). Change from:

```tsx
{r.missed.length > 0 && (
  <div className="result-detail-missed">
    <span className="result-detail-missed-title">
      Forkerte ({r.missed.length})
    </span>
    <div className="result-detail-missed-list">
      {r.missed.map((m, i) => (
        <span key={i} className="result-missed-bird">
          {m.nameDa}
        </span>
      ))}
    </div>
  </div>
)}
```

To:

```tsx
{r.missed.length > 0 && (
  <div className="result-detail-missed">
    <span className="result-detail-missed-title">
      Forkerte ({r.missed.length})
    </span>
    <MissedBirdsCarousel
      items={dedupeWithCount(r.missed).map(b => ({
        key: b.scientificName,
        nameDa: b.nameDa,
        nameEn: b.nameEn,
        imageUrl: getBirdImageUrl(b.scientificName),
        count: b.count,
      }))}
    />
  </div>
)}
```

- [ ] **Step 5: Build and verify**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npm run build`
