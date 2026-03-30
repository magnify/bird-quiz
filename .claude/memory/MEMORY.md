# Fugle Quiz — Session Context (2026-03-28)

## What was done this session

### Implemented: Start Screen Mosaic, Persistent Header, Zoom Transition

**Files created:**
- `src/components/quiz/BirdMosaic.tsx` — staggered-column mosaic component (4 columns, dynamic row count, random Y offsets)

**Files modified:**
- `src/components/quiz/quiz.css` — persistent header, mosaic layout, leave modal, zoom transition, photo shadow removal
- `src/components/quiz/QuizApp.tsx` — persistent header, leave modal, zoom transition overlay, mosaic wiring
- `src/components/quiz/QuizSetup.tsx` — restructured: two-column (mosaic left, settings right), removed logo/footer
- `src/components/quiz/QuizQuestion.tsx` — stripped old `.quiz-header` (moved to persistent header)
- `src/components/quiz/QuizResults.tsx` — removed redundant nav buttons (covered by header), removed `onHome` prop
- `src/hooks/useQuiz.ts` — added `'transitioning'` screen state, `pendingQuestions` ref, `firstBirdId` state, `completeTransition` callback

## Current state: WORKING but needs polish

Build passes (`npx next build` = 0 errors). Dev server works (the "Errors: 1" is a middleware deprecation warning, not a real error).

## Open issues from latest screenshot (PRIORITY — FIX NEXT SESSION)

### 1. Not enough images filling the mosaic height
- The dynamic row calculation runs in `useEffect` but may not recalculate after the first render properly
- Need more rows or the measurement needs debugging — columns stop short of viewport bottom
- The mosaic should overfill the viewport so no gaps show

### 2. Column stagger offsets too subtle
- `translateY` offsets are percentage-based (`-30% to +5%`) — percentage of column height, not viewport
- Switch back to pixel-based offsets with a larger range (e.g., `-100px to +60px`)
- Each column should clearly start at a different point

### 3. Settings form not centered in right column
- "Fugle Quiz" title and settings are left-biased within the right 50%
- `.start-settings-area` has `align-items: center` but inner content may have conflicting widths
- Verify `max-width` on `.start-settings` and `.start-actions` isn't causing misalignment

### 4. Form looks heavy/overwhelming
- Too many bordered pill buttons stacked creates visual noise
- User asked about showing one setting at a time (stepper) — UX improvement to explore
- Consider: lighter/thinner borders, less uppercase, more breathing room
- The green Start Quiz button dominates — could be toned down slightly

### 5. White gap at bottom of page
- Body/html background color showing below the dark quiz background
- Fix: set `background: var(--quiz-background)` on `body` or ensure `.screen` fills viewport fully

### 6. Animation improvements
- Image mosaic tiles fade-in on load is "clunky" — add staggered delays per tile
- Zoom transition when starting quiz needs smoothing
- Consider a gentle slow drift animation on the mosaic columns

## Architecture decisions

- `Screen` type: `'start' | 'transitioning' | 'quiz' | 'results'`
- Questions pre-generated when settings change (stored in `useRef`)
- `firstBirdId` tracked in `useState` so mosaic re-renders with highlight
- `startQuiz` → `'transitioning'` → zoom animation → `completeTransition` → `'quiz'`
- Header rendered outside `.screen` divs, uses `app-header--transparent` class on start
- Logo hidden on start screen, shown on quiz/results
- Quiz screen height: `calc(100dvh - 45px)` for persistent header

## CSS class mapping

| Purpose | Class | Notes |
|---------|-------|-------|
| Persistent header | `.app-header` | Sticky, z-100 |
| Transparent header (start) | `.app-header--transparent` | No bg/border |
| Header logo+title | `.app-header-left` | Hidden on start screen |
| Header center | `.app-header-center` | Counter · score · points |
| Header links | `.app-header-link` | Resultater, Rangliste |
| Start layout | `.start-layout` | Two-column grid 1fr 1fr |
| Mosaic container | `.start-mosaic-side` | Left column, overflow hidden |
| Settings container | `.start-settings-area` | Right column, centered |
| Mosaic grid | `.mosaic-grid` | Flex, justify-content center |
| Mosaic column | `.mosaic-column` | Vertical strip with translateY |
| Mosaic tile | `.mosaic-tile` | Square, 4px radius |
| Leave modal | `.leave-modal-overlay` | Blurred backdrop, z-200 |
| Zoom overlay | `.mosaic-zoom-overlay` | Fixed, z-150 |
| Fading start | `.start-layout--fading` | opacity 0 during transition |
