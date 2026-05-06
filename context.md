# Session Context - v0.6.0

## Current State

**Version:** v0.6.0
**Deployed:** https://bird-quiz.magnify.dk
**Status:** All major refactors complete, images migrated to Netlify CDN

## Major Changes (v0.5.0 → v0.6.0)

### 1. Header & Mosaic Architecture Refactor ✅

**Problem:** Mosaic was positioned fixed (out of layout flow), causing overlap with form and requiring hardcoded breakpoints.

**Solution:** Proper DOM restructure
- Header: `position: absolute` (floats above all content)
- Header: Always transparent, logo hidden on start screen via `hideLogo` prop
- Mosaic: Back in QuizSetup layout flow (flexbox with form)
- No z-index battles, naturally responsive

**Files:**
- `src/components/quiz/QuizApp.tsx` - removed mosaic container, added hideLogo
- `src/components/quiz/QuizSetup.tsx` - restored mosaic in layout
- `src/components/quiz/QuizHeader.tsx` - added hideLogo prop, removed transparent prop
- `src/components/quiz/quiz.css` - header absolute, mosaic in flow, breakpoint 1024px
- `src/components/quiz/Leaderboard.tsx` - removed transparent prop
- `src/components/quiz/MyResults.tsx` - removed transparent prop

**Result:**
- Desktop (>1024px): Mosaic left, form right, naturally responsive
- Tablet/Mobile (≤1024px): Mosaic hidden, form centered
- Clean architecture, no CSS hacks

### 2. Simplified Answer Feedback Borders ✅

**Problem:** Complex overlay div with box-shadow inset + background for showing correct/wrong.

**Solution:** Simple border on image element
- Removed `.photo-overlay` div entirely
- Added `.correct` / `.wrong` classes directly to `.bird-photo`
- Border with rounded corners (`var(--quiz-radius-lg)`)

**Files:**
- `src/components/quiz/QuizQuestion.tsx` - removed overlay div, added classes to img
- `src/components/quiz/quiz.css` - simple border instead of overlay

**Result:** Cleaner markup, easier to maintain, matches app styling.

### 3. Image Migration: Supabase → Netlify CDN ✅

**Problem:** Images from Supabase Storage were slow/unreliable on mobile due to:
- `cache-control: no-cache` headers (Cloudflare CDN couldn't cache)
- First loads went to origin (slow)
- Mobile timeouts frequent

**Solution:** Serve images from Netlify public folder
- Updated `src/lib/images.ts` - returns `/images/birds/{slug}.jpg` instead of Supabase URL
- Images in `public/images/birds/` (221 files, ~50MB)
- Netlify CDN serves with proper caching
- Same domain = faster DNS

**Files:**
- `src/lib/images.ts` - switched to local paths

**Result:**
- Much faster loading
- Reliable (no timeouts)
- Proper caching by default
- Better mobile performance

### 4. Error Logging & GitHub Integration ✅

**Status:** Fully implemented and working

**Components:**
- Client-side: `ErrorBoundary`, `useImageErrorHandler`, global error handlers
- Server: `/api/error-log` - creates GitHub issues automatically
- Deduplication: Error hashing prevents duplicate issues
- GitHub: Auto-creates issues with labels (bug, auto-generated, error-type)

**Setup:**
- ✅ `GITHUB_TOKEN` set in Netlify env vars
- ✅ Repo config: `magnify/bird-quiz`
- ✅ QuizApp wrapped in ErrorBoundary
- ✅ Image error handlers active

**Note:** Slow image loads don't trigger `onerror` (they hang), only hard failures create issues. This is why switching to Netlify CDN was critical.

**Docs:** See `ERROR_LOGGING.md` for full setup guide.

## File Structure

### Key Files Modified
```
src/
├── components/quiz/
│   ├── QuizApp.tsx          - mosaic removed, ErrorBoundary wrapper, hideLogo
│   ├── QuizSetup.tsx        - mosaic restored in layout flow
│   ├── QuizHeader.tsx       - hideLogo prop, removed transparent prop
│   ├── QuizQuestion.tsx     - simplified borders (no overlay)
│   ├── Leaderboard.tsx      - removed transparent prop
│   ├── MyResults.tsx        - removed transparent prop
│   └── quiz.css             - header absolute, mosaic in flow, simple borders
├── lib/
│   ├── images.ts            - switched to Netlify CDN paths
│   └── error-tracking/      - error logging system (existing)
└── app/api/error-log/       - GitHub integration (existing)

public/
└── images/birds/            - 221 bird images served by Netlify CDN

docs/
├── ERROR_LOGGING.md         - error logging setup guide
├── REFACTOR_PLAN.md         - header/mosaic refactor plan
└── CONTEXT.md               - this file
```

## CSS Architecture

**Two separate systems** (never mix):

### Admin CSS (`globals.css`)
- Shadcn zinc tokens
- Light mode only
- Admin pages + components

### Quiz CSS (`quiz.css`)
- Self-contained `--quiz-*` variables
- Dark theme
- All quiz components

**Typography:** Two-layer semantic token system
- Scale: `--quiz-text-xs` → `--quiz-text-4xl` (raw values)
- Semantic: `--quiz-title`, `--quiz-button`, etc. (usage tokens)
- Components use semantic, mobile overrides semantic

**Key patterns:**
- Header: `position: absolute`, `z-index: 100`, always transparent
- Mosaic: in layout flow, `z-index: auto`, hidden <1024px
- Borders: direct on img element, rounded corners
- Images: Netlify CDN (`/images/birds/{slug}.jpg`)

## Deployment

**Site:** https://bird-quiz.magnify.dk
**Platform:** Netlify

**Deploy command:**
```bash
source ~/.nvm/nvm.sh && nvm use 22 && \
NODE_VERSION=22 /Users/brianstefanjensen/.nvm/versions/node/v20.5.1/bin/netlify deploy --prod --skip-functions-cache
```

**Important:**
- NEVER use `--no-build` (breaks MIME types)
- Node 22 required (`.nvmrc`)
- netlify CLI installed under Node 20.5.1 (use full path)

**Cache purge** (if stale JS/CSS after deploy):
```bash
netlify api purgeCache --data '{"site_id":"31e50148-0735-4fab-863c-c8dd952880e2"}'
```

## Known Issues

1. **16 portrait/square images** need landscape replacements (tracked in admin "Billedproblemer" filter)
2. **GitHub auto-deploy broken** (host key verification) - use CLI
3. **Middleware deprecation** - Next.js 16 warns about `middleware.ts`, prefers `proxy`

## Git Commits (This Session)

1. `31d4fdf` - v0.5.1: header/mosaic refactor + simplified borders
2. `7ace15e` - v0.6.0: switch to Netlify CDN for images

## Next Steps / TODO

- [ ] Replace 16 portrait/square images with landscape versions
- [ ] Consider migrating `middleware.ts` to `proxy` pattern (Next.js 16)
- [ ] Optional: Investigate why error logging doesn't catch timeouts (low priority now that images are fast)

## Testing Checklist

- [x] Desktop (>1280px): Mosaic visible left, form right
- [x] Laptop (1024-1280px): Mosaic hidden, form centered
- [x] Tablet (640-1024px): Mosaic hidden, form centered
- [x] Mobile (<640px): Mosaic hidden, form full-width, bottom nav
- [x] Images load fast and reliably
- [x] Borders show correct/wrong with rounded corners
- [x] Header transparent on all pages
- [x] Logo hidden on start screen
- [x] Error logging creates GitHub issues

## Performance Notes

**Image Loading:**
- Before (Supabase): ~2-5s first load, frequent timeouts on mobile
- After (Netlify CDN): <500ms, cached loads <100ms, no timeouts

**Why Netlify CDN is better:**
- Same domain (no DNS lookup)
- Proper `cache-control` headers
- Global CDN distribution
- No cold start delays

## Architecture Decisions

### Why position: absolute for header?
- Allows mosaic to float above without z-index battles
- Header is decoration, not layout element
- Cleaner than trying to layer mosaic above sticky header

### Why move images to Netlify?
- Supabase Storage had `cache-control: no-cache` (couldn't fix in dashboard)
- Script to update headers was complex and fragile
- Netlify CDN is simpler, faster, more reliable
- Trade-off: 221 images in git (~50MB), but worth it for performance

### Why semantic typography tokens?
- Easier to resize (change one token, affects all buttons)
- Mobile can override semantic tokens, not every component
- Self-documenting (token name describes purpose)

## Rollback Plan

If anything breaks:
```bash
git revert 7ace15e  # Revert v0.6.0 (images)
git revert 31d4fdf  # Revert v0.5.1 (refactor)
git push
```

Then redeploy.
