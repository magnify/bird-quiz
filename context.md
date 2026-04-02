# Session Context - v0.4.0+ Work & Recent Fixes

## Current State

**Version:** v0.4.0
**Last Deploy:** Pending (local changes not yet deployed)
**Branch:** main
**Node:** v22 required

## Recent Work Summary

### v0.4.0 - Unified Quiz Layouts (Deployed)

**Commit:** `b193997` - Major refactor

**Changes:**
- Unified PhotoMode and NameMode into single `QuizQuestion` component
- Fixed mixed mode to generate BOTH photo AND name questions per bird
- Improved name mode UX with split-screen layout
- Better question framing: "Find billedet af [bird name]"
- Removed floating nav, unified header across all pages
- Added hover effect to logo
- Created reusable `Logo` component
- Added `MobileBottomNav` component
- New pages: `/om` and `/kaffe`
- Code cleanup: deleted PhotoMode.tsx and NameMode.tsx

**Files Changed:**
- Deleted: `NameMode.tsx`, `PhotoMode.tsx`
- Created: `Logo.tsx`, `MobileBottomNav.tsx`, `/om/page.tsx`, `/kaffe/page.tsx`
- Modified: `QuizQuestion.tsx`, `QuizApp.tsx`, `QuizHeader.tsx`, `quiz.css`, `engine.ts`

### Post-v0.4.0 Fixes (Deployed)

1. **`a94062b`** - Revert Om icon to info circle (bird logo doesn't scale to 20px)
2. **`9aee544`** - Standardize button and input heights
3. **`994ea25`** - Reduce action button font-weight from 700 to 600
4. **`483e977`** - Fix mosaic z-index by adding to parent container (CSS approach, didn't work)
5. **`2987d1e`** - Fix mosaic z-index by overriding .screen child z-index (CSS approach, didn't work)

### Today's Work (Not Yet Deployed)

#### 1. Mosaic Z-Index Fix (Proper DOM Restructure)

**Problem:** Mosaic was nested inside `.screen` div, creating stacking context that prevented it from appearing above header, even with CSS z-index hacks.

**Solution:** Moved BirdMosaic out of QuizSetup component tree to be direct child of `quiz-app-root`, rendered before header in DOM.

**Changes:**
- Moved BirdMosaic from QuizSetup to QuizApp
- Created `.mosaic-container` positioned fixed with z-index 150 (above header's 100)
- Removed `.start-mosaic-side` container from QuizSetup
- Updated QuizSetup to remove `birds`, `firstBirdId`, `onTileRef` props
- Added `mosaic-container--fading` class for transition animations
- Mobile: hide mosaic completely via CSS

**Files Modified:**
- `src/components/quiz/QuizApp.tsx` - render mosaic at top level
- `src/components/quiz/QuizSetup.tsx` - removed mosaic, simplified layout
- `src/components/quiz/quiz.css` - new `.mosaic-container` styles

**DOM Structure (Before):**
```
quiz-app-root
  └─ QuizHeader (z-index: 100)
  └─ QuizSetup (.screen)
      └─ .start-layout
          └─ .start-mosaic-side
              └─ BirdMosaic (trapped in stacking context)
```

**DOM Structure (After):**
```
quiz-app-root
  └─ .mosaic-container (z-index: 150, fixed positioning)
      └─ BirdMosaic
  └─ QuizHeader (z-index: 100)
  └─ QuizSetup (.screen)
      └─ .start-layout (centered)
```

#### 2. Error Logging & Monitoring System

**Status:** Fully implemented (already existed, now documented)

**Discovered:** Comprehensive error logging system was already in place:
- Client-side error tracking (React, global errors, promises, images)
- Server endpoint `/api/error-log` with GitHub issue creation
- Automatic deduplication via error hashing
- Recurring errors update existing issues with count
- Image error handler hook for React components

**Added Today:**
- Wrapped QuizApp in ErrorBoundary component
- Created `ERROR_LOGGING.md` documentation
- Verified image error tracking is active in QuizQuestion

**Setup Required:**
1. Set `GITHUB_TOKEN` env var in Netlify (repo scope)
2. Token enables automatic GitHub issue creation
3. Without token, errors log to console only

**Error Types Tracked:**
- `react-error` - React component errors
- `global-error` - Uncaught JavaScript errors
- `unhandled-promise` - Unhandled promise rejections
- `image-load-error` - Failed image loads
- `api-error` - API failures

**Files:**
- `src/lib/error-tracking/ErrorBoundary.tsx` - boundary + logError function
- `src/lib/error-tracking/image-error-handler.ts` - image error hook
- `src/app/api/error-log/route.ts` - server endpoint, GitHub integration
- `ERROR_LOGGING.md` - setup documentation

## Deployment Checklist

Before deploying:
- [x] Build succeeds locally (`npm run build`)
- [ ] Test mosaic appears above header on desktop
- [ ] Test mosaic hidden on mobile
- [ ] Verify no console errors
- [ ] Set `GITHUB_TOKEN` in Netlify env vars
- [ ] Update MEMORY.md with final status

**Deploy Command:**
```bash
source ~/.nvm/nvm.sh && nvm use 22 && NODE_VERSION=22 /Users/brianstefanjensen/.nvm/versions/node/v20.5.1/bin/netlify deploy --prod --skip-functions-cache
```

**After Deploy:**
- Purge Netlify cache if pages serve stale chunks:
  ```bash
  netlify api purgeCache --data '{"site_id":"31e50148-0735-4fab-863c-c8dd952880e2"}'
  ```

## Known Issues

1. **16 portrait/square images** still need landscape replacements (tracked in admin)
2. **GitHub auto-deploy broken** (host key verification) - use CLI deploy
3. **Middleware deprecation warning** - Next.js 16 prefers `proxy` over `middleware.ts` (works but warns)

## Architecture Notes

### CSS Separation (CRITICAL)
- `globals.css` - shadcn zinc tokens, admin styles ONLY
- `quiz.css` - ALL quiz styles, self-contained `--quiz-*` variables
- Admin = light mode, Quiz = dark mode (independent)
- NEVER mix the two systems

### Typography Tokens
Two-layer system in quiz.css:
- Layer 1: Scale values (`--quiz-text-xs` through `--quiz-text-4xl`)
- Layer 2: Semantic tokens (`--quiz-title`, `--quiz-button`, etc.)
- Components use semantic tokens, mobile overrides semantic tokens

### Z-Index Layers
- Mosaic: 150 (desktop start screen only)
- Header: 100 (persistent, sticky)
- Mobile nav: 100 (fixed bottom)
- Modals/overlays: 200+
- Screens: 0-10 (default stacking)

## Files Changed This Session

**Modified:**
- `src/components/quiz/QuizApp.tsx`
- `src/components/quiz/QuizSetup.tsx`
- `src/components/quiz/quiz.css`

**Created:**
- `ERROR_LOGGING.md`

**No deletions**

## Git Status

```bash
git status
# On branch main
# Changes not staged for commit:
#   modified:   src/components/quiz/QuizApp.tsx
#   modified:   src/components/quiz/QuizSetup.tsx
#   modified:   src/components/quiz/quiz.css
#
# Untracked files:
#   ERROR_LOGGING.md
#   CONTEXT.md (this file)
```

## Next Steps

1. Test locally - verify mosaic z-index fix works
2. Commit changes with message: "fix: restructure mosaic DOM for proper z-index layering"
3. Set `GITHUB_TOKEN` in Netlify
4. Deploy to production
5. Test on live site (desktop + mobile)
6. Update MEMORY.md with completion status
