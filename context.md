# Session Context — Admin tooling + #19 layout incident

_Last updated: 2026-06-12_

## ⚠️ TOP PRIORITY: production is broken (#19 layout)

- **Live prod deploy `6a2b19c4` (2026-06-11)** shipped two never-before-deployed
  changes together: the mobile UX batch (incl. #19) + the admin inline-metadata
  feature. **#19 broke the desktop mosaic and mobile layout** ("a lot of things
  broke — desktop, mosaic mobile").
- **Last known-GOOD prod deploy: `6a21e4a3` (2026-06-04)** — the "kill hardcoded
  values" deploy, before the UX batch and before the admin feature.
- Decision in progress: user chose **fix-forward**, then said **"reload and use
  Fable"** (Fable = the user's Claude *mobile app* session, which authored #19).
  Ambiguous whether the layout fix happens in the mobile session or here — was
  about to clarify when asked to save context. **Resolve this before acting.**

### Rollback (if needed)
```bash
netlify api restoreSiteDeploy --data '{"site_id":"31e50148-0735-4fab-863c-c8dd952880e2","deploy_id":"6a21e4a3badd962ff34ee9e4"}'
```

### What #19 (commit ea87d2b) changed — root-cause surface
- `.quiz-app-root`: `position:fixed; inset:0; overflow:hidden` → `display:flex;
  flex-direction:column; min-height:100dvh` (body scrolls now).
- `.screen` lost `height:100%` + `overflow-y/x`. Active-question viewport lock is
  now **desktop-only** (`@media (min-width:641px) .quiz-app-root:has(.quiz-body--immersive)`).
- Mobile bottom nav: `position:fixed` → `position:sticky` (z 100→50), per-screen
  `padding-bottom:76px` hacks removed.
- `.app-header`: `position:absolute` → normal flow.
- Mosaic still relies on `.start-mosaic-side { overflow:hidden }`; the parent no
  longer clips overflow. **Leading (unconfirmed) suspicion:** mosaic bleed sizing
  (`--mosaic-width: calc(min(56vw,480px)+12px)`) + loss of root `overflow:hidden`.
- NOT yet diagnosed with a screenshot — do NOT guess the visual symptom; get
  evidence first (systematic-debugging Phase 1).

## Git / branch state
- `main` @ `91c4b27`, pushed to `origin/main` (in sync).
- Contains: colleague/Fable UX batch (4 commits) + admin inline-metadata (7 commits).
- Feature branch `inline-metadata-editing` merged & deleted.
- Untracked throwaway: `scripts/list-r2-tmp.ts` (debug script, ignore/leave).
- `deno.lock` regenerates on build — discard it before rebases (`git checkout -- deno.lock`).

## Admin inline-metadata feature (DONE, works, deployed)
Spec: `docs/superpowers/specs/2026-06-07-inline-metadata-editing-design.md`
Plan: `docs/superpowers/plans/2026-06-07-inline-metadata-editing.md`
- `src/lib/admin/license-options.ts` (+test) — license presets, `isKnownLicense`.
- `src/hooks/admin/useBirdImageActions.ts` — added `setCredit` (toast + router.refresh).
- `src/components/admin/InlineText.tsx`, `InlineSelect.tsx` (native select),
  `BirdMetaFields.tsx` (variant 'strip' | 'summary').
- Wired into `ImageAuditGrid` card (restructured `<button>`→`<div>` + photo button
  + meta strip) and `BirdDetailModal` summary (kept the "Rediger metadata" form).
- 50 unit tests pass.

## Admin state model (rebuilt earlier this session — important)
- `useBirdImageActions` is server-truth: mirrors props, every mutation →
  server write → Sonner toast → `router.refresh()`. NO frozen optimistic snapshot
  (that was the old bug: counts/severity didn't update). Admin pages are
  `force-dynamic` so refresh re-reads R2.
- Admin images: `getAdminImageUrl(name, version)` → `/api/images/slug?nocache=1`;
  the route returns `no-store` for `?nocache` (quiz keeps 1-yr cache). Crop loads
  same-origin (NO crossOrigin — that was failing the load).
- Billedproblemer (portrait) is now dimension-based: crop/replace measure JPEG
  size (`src/lib/admin/image-dimensions.ts`) and store width/height in manifest;
  `isPortrait` derives from ratio (<1.25), falling back to the static list only
  for un-remeasured images.
- SALT deduped into `src/lib/admin/auth.ts` (env-overridable, same default).
- Brand strings centralized in `src/lib/brand.ts` (fixed stale share domain →
  www.fuglequiz.dk).

## Open GitHub issues (rest were closed by the UX batch)
- #14 ID tips (feature), #34 wider crops (asset task), #18 & #28 only PARTIALLY
  addressed by the UX batch (tiles/copyright overlay) — verify if done.

## Deploy
```bash
source ~/.nvm/nvm.sh && nvm use 22 && NODE_VERSION=22 \
  /Users/brianstefanjensen/.nvm/versions/node/v20.5.1/bin/netlify deploy --prod --skip-functions-cache
```
- `main` is in sync with origin and currently deployed (but BROKEN, see top).
- Rule: anything deployed must be committed AND pushed (it is).

## Verify commands
- Build: `source ~/.nvm/nvm.sh && nvm use 22 && npx next build`
- Tests: `source ~/.nvm/nvm.sh && nvm use 22 && npx vitest run src/`
- Live CSS marker for #19: `.quiz-app-root` should be `display:flex;min-height:100dvh`
  (deployed) vs `position:fixed;inset:0` (old/good).
