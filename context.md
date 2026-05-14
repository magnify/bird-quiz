# Session Context - v0.7.0

## Current State

**Version:** v0.7.0
**Deployed:** https://bird-quiz.magnify.dk
**Status:** Images migrated to Cloudflare R2 via API proxy, Netlify CDN as primary

## Major Changes

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

### 4. Image Storage: Supabase → Cloudflare R2 ✅

**Problem:** Supabase Storage was a single point of failure — images were served via API proxy or CDN, but storage backend was tied to Supabase's free tier (potential pausing).

**Solution:** Move image storage to Cloudflare R2
- Created `src/lib/r2.ts` — R2 client with `r2Get`, `r2Put`, `r2Head`
- All admin routes (replace, crop, restore, credit, approve) use R2
- API proxy at `/api/images/[slug]` serves from R2
- Migration script `scripts/migrate-to-r2.ts` copies Supabase → R2
- Fallback chain: `NEXT_PUBLIC_IMAGE_CDN_URL` → R2 API proxy
- 221 images + originals + manifest migrated to R2

**Files:**
- `src/lib/r2.ts` — new R2 client module
- `src/app/api/images/[slug]/route.ts` — serves from R2, handles manifest.json
- `src/app/api/admin/images/*/route.ts` — all 5 admin routes use R2
- `src/lib/data/manifest.ts` — fetches via API proxy
- `src/components/admin/ImageCropEditor.tsx` — backup check via API proxy
- `scripts/migrate-to-r2.ts` — one-time migration script

**Result:**
- Storage decoupled from Supabase
- R2 S3-compatible API, proper HEAD support
- No free tier pausing risk for images
- Existing CDN URL still works as primary

### 5. Error Logging & GitHub Integration ✅

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
│   ├── r2.ts                - R2 S3 client (get/put/head)
│   ├── images.ts            - image URL resolution (CDN → API proxy)
│   ├── data/manifest.ts     - fetches manifest via API proxy
│   └── error-tracking/      - error logging system (existing)
├── app/api/images/[slug]/
│   └── route.ts             - serves images + manifest from R2
├── app/api/admin/images/
│   ├── replace/route.ts     - R2-based replace
│   ├── crop/route.ts        - R2-based crop
│   ├── restore/route.ts     - R2-based restore
│   ├── credit/route.ts      - R2-based manifest update
│   └── approve/route.ts     - R2-based manifest update
├── components/admin/
│   └── ImageCropEditor.tsx  - backup check via API proxy
└── scripts/
    └── migrate-to-r2.ts     - one-time Supabase → R2 migration
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
- Images: Netlify CDN → API proxy → R2 (fallback chain)
- Manifest: fetched via `/api/images/manifest.json` from R2

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
3. `cdff926` - chore: add @aws-sdk/client-s3 for R2 image storage
4. `ec16595` - feat: add R2 client module with get/put/head helpers
5. `1239f1b` - feat: serve bird images from Cloudflare R2
6. `b95234d` - feat: admin replace route uses R2
7. `4b6ff8d` - feat: admin routes use R2 (crop, restore, credit, approve)
8. `84b9279` - feat: manifest via API proxy, ImageCropEditor fix
9. `680213a` - feat: migration script + pagination fix
10. `167020f` - fix: manifest.json routing, migration script env loading

## Next Steps / TODO

- [ ] Replace 16 portrait/square images with landscape versions
- [ ] Consider migrating `middleware.ts` to `proxy` pattern (Next.js 16)
- [ ] Opt-in: clean up Supabase Storage bucket (images now in R2)
- [ ] Opt-in: remove `public/images/birds/` (now redundant with R2 + CDN)

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
- After (Netlify CDN / R2): <500ms, cached loads <100ms, no timeouts

**Storage architecture:**
- Primary: `NEXT_PUBLIC_IMAGE_CDN_URL` (configurable CDN, e.g. Netlify)
- Fallback: `/api/images/{slug}` → R2 via S3-compatible API
- Admin writes: directly to R2 (replace, crop, restore)

## Architecture Decisions

### Why position: absolute for header?
- Allows mosaic to float above without z-index battles
- Header is decoration, not layout element
- Cleaner than trying to layer mosaic above sticky header

### Why move images to Netlify CDN + R2?
- Supabase Storage had `cache-control: no-cache` (couldn't fix in dashboard)
- Netlify CDN is fastest option (same domain, no DNS lookup, proper caching)
- R2 provides decoupled storage backend (no Supabase downtime risk)
- Admin operations (replace/crop/restore) write directly to R2
- Dual strategy: CDN for reads, R2 for writes + fallback

### Why semantic typography tokens?
- Easier to resize (change one token, affects all buttons)
- Mobile can override semantic tokens, not every component
- Self-documenting (token name describes purpose)

## Rollback Plan

If anything breaks:
```bash
git revert 167020f  # Revert manifest fix
git push
```

Or full rollback to before R2 migration:
```bash
git revert 167020f cdff926 ec16595 1239f1b b95234d 4b6ff8d 84b9279 680213a
git push
```

Then redeploy.
