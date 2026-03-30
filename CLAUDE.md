# Fugle Quiz — Project Guide

## CURRENT STATUS
- **Supabase is ACTIVE** (project `vxrnttqoirpqlhsrrata`)
- If Supabase gets paused again (free tier inactivity), unpause at https://supabase.com/dashboard/project/vxrnttqoirpqlhsrrata
- Migrations applied: `001_initial_schema.sql`, `002_guest_and_scoring.sql`

## Stack
- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Node 22** required (`.nvmrc`). Always: `source ~/.nvm/nvm.sh && nvm use 22`
- **Supabase** backend (project `vxrnttqoirpqlhsrrata`, Frankfurt/eu-central-1)
- **Netlify** hosting at `https://bird-quiz.magnify.dk`
- Secrets in `.env.local` (never commit)

## Architecture

### CSS — Two separate worlds (NEVER mix)
- **`globals.css`**: Standard shadcn neutral zinc tokens. Light `:root` + `.dark` variants. No quiz styles.
- **`src/components/quiz/quiz.css`**: ALL quiz styles, self-contained `--quiz-*` variables. Imported by `QuizApp.tsx`.
- **Admin = light mode**. Quiz renders dark via its own CSS.
- No `!important` — if you think you need it, the architecture is wrong.
- No custom CSS hacks in admin — only shadcn components + Tailwind utilities.

### Key directories
- `src/lib/data/birds-static.ts` — 246 birds, deterministic UUIDs via `uuidv5(scientificName, DNS)`
- `src/lib/data/birds.ts` — data access layer (Supabase with static fallback)
- `src/lib/quiz/engine.ts` — weighted random selection + similarity-based distractors
- `src/lib/quiz/scoring.ts` — points: base + time bonus * difficulty * streak
- `src/lib/images.ts` — `getBirdImageUrl(scientificName)` → Supabase Storage public URL
- `src/lib/supabase/types.ts` — hand-authored DB types (all tables need `Relationships: []`)
- `src/app/actions/` — server actions (quiz, leaderboard, auth, admin)
- `src/app/api/admin/images/` — crop, replace, restore, credit API routes
- `legacy/` — preserved legacy files, do not modify

### Admin
- Password gate via server-side cookie (`admin_auth` = SHA-256 hash, httpOnly, 7-day, path `/`)
- `ADMIN_PASSWORD` env var checked in `src/app/admin/actions.ts`
- Layout is server component → checks cookie → renders `AdminShell` or `AdminLogin`
- Image tooling: crop (4:3), replace (iNaturalist search or upload), restore from backup
- API routes use `request.cookies` (NOT `cookies()` from next/headers — broken on Netlify)

### Images
- 221 images in Supabase Storage bucket `bird-images`
- URL: `{SUPABASE_URL}/storage/v1/object/public/bird-images/{slug}.jpg`
- Manifest: `bird-images/manifest.json` in storage (attribution, source, license)
- Backups: `originals/{slug}.jpg` in storage (before first replacement)
- Local copies in `public/images/birds/` exist but are NOT used at runtime
- Taxonomy mapping: `Accipiter gentilis` → `Astur gentilis`, `Charadrius dubius` → `Thinornis dubius`
- Supabase Storage doesn't support HEAD requests — use range GET for existence checks

### shadcn components installed
card, badge, dialog, input, progress, sidebar, button, sheet, separator, skeleton, tooltip

## Deployment

**Deploy command** (always use full build — never `--no-build`):
```bash
source ~/.nvm/nvm.sh && nvm use 22 && NODE_VERSION=22 /Users/brianstefanjensen/.nvm/versions/node/v20.5.1/bin/netlify deploy --prod --skip-functions-cache
```

- `netlify` CLI is installed under Node v20.5.1 — must reference binary path directly while using Node 22
- **NEVER use `--no-build`** — causes MIME type errors (CSS/JS served as text/plain, 404s)
- GitHub auto-deploy is broken (host key verification) — use CLI
- Netlify env vars: `ADMIN_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

### Netlify Durable Cache (IMPORTANT)
- Netlify caches pages in "Durable Cache" with ~1 year TTL
- New deploys do NOT automatically invalidate this cache
- If pages serve stale JS/CSS chunks after deploy, **purge the cache**:
  ```bash
  # Uses auth token from ~/.config/netlify or similar
  netlify api purgeCache --data '{"site_id":"31e50148-0735-4fab-863c-c8dd952880e2"}'
  ```
- Or via Node: `POST https://api.netlify.com/api/v1/purge` with `{site_id: "31e50148-0735-4fab-863c-c8dd952880e2"}`
- Dynamic pages (`force-dynamic`) + `Netlify-CDN-Cache-Control: no-store` in `netlify.toml` prevent future caching for `/rangliste` and `/resultater`

## Supabase Status

Database is **active**. All wiring code is deployed. If it gets paused again (free tier inactivity), unpause from dashboard and redeploy.

Live features:
- `/rangliste` — leaderboard (server action `getLeaderboard()`)
- `/resultater` — personal results history (localStorage)
- Quiz session tracking, scoring, points
- Guest identity + auth migration
- Admin analytics from real quiz data

## Gotchas
- Next.js 16 deprecates `middleware.ts` → warning shows but works
- Supabase types: every table MUST have `Relationships: []` or queries resolve to `never`
- `shadow-sm` invisible on dark backgrounds — don't use decorative shadows on dark themes
- `ring-1 ring-foreground/10` works on neutral themes, NOT on colored themes

## Open Issues
- 16 portrait/square images need landscape replacements (tracked in admin "Billedproblemer" filter)
  - Portrait: Falco columbarius, Dryocopus martius, Certhia familiaris, Picus viridis, Aegithalos caudatus, Falco peregrinus, Dendrocopos major, Loxia pytyopsittacus, Cyanistes caeruleus
  - Square: Acrocephalus palustris, Falco tinnunculus, Lophophanes cristatus, Milvus milvus, Nucifraga caryocatactes, Remiz pendulinus, Strix aluco
