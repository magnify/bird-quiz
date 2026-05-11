# Cloudflare R2 for Bird Images

**Date:** 2026-05-11
**Status:** Draft

## Problem

- Supabase free tier storage + bandwidth limits are being approached due to 221 bird images (~80MB) served via Supabase Storage
- Image serving is slower than desired on the free tier
- Moving images to Cloudflare R2 eliminates Supabase Storage bandwidth/egress and storage costs entirely

## Solution

Move the 221 bird images + manifest from Supabase Storage (`bird-images` bucket) to Cloudflare R2. Update the API proxy route and admin tooling to fetch from R2 instead.

## Architecture

```
Before:  Netlify CDN → Next.js API route → Supabase Storage (download)
After:   Netlify CDN → Next.js API route → Cloudflare R2 (S3 GetObject)
```

- Client URLs stay unchanged (`/api/images/{slug}`)
- Netlify CDN caching stays unchanged (1-year TTL)
- All DB and Auth services remain on Supabase

## Changes

### 1. Environment variables (`.env.local`)

Add:
```
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ACCOUNT_ID=
R2_BUCKET_NAME=bird-images
```

### 2. Image serving — `src/app/api/images/[slug]/route.ts`

Swap `supabase.storage.from('bird-images').download(slug)` for R2's S3 `GetObjectCommand`.

- Use `@aws-sdk/client-s3` or the lighter `@aws-sdk/lib-storage`
- Initialize S3 client with R2 endpoint: `https://{account_id}.r2.cloudflarestorage.com`
- Response stays identical: `image/jpeg`, `Cache-Control: public, max-age=31536000`

### 3. Admin image tools

Four API routes currently write to Supabase Storage:

| Route | Operation | R2 equivalent |
|-------|-----------|---------------|
| `replace` | Upload new image + update manifest | `PutObjectCommand` + manifest update |
| `crop` | Upload cropped version | `PutObjectCommand` |
| `restore` | Copy from `originals/` backup | `GetObjectCommand` from originals path, `PutObjectCommand` |
| `approve/credit/commons` | Manifest metadata only | Same (manifest also moves to R2) |

`ImageCropEditor.tsx` — replace range-GET health check (which was a workaround for Supabase's lack of HEAD support) with a proper R2 `HeadObjectCommand`.

### 4. Manifest — `src/lib/data/manifest.ts`

Currently fetched from:
```
${SUPABASE_URL}/storage/v1/object/public/bird-images/manifest.json
```

Move to R2. Serve through existing API proxy by adding a handler for `/api/images/manifest.json` that fetches from R2 (`GetObjectCommand` for `manifest.json`).

### 5. Migration script

One-time script (`scripts/migrate-to-r2.ts`):
1. List all files in Supabase Storage `bird-images` bucket (images + manifest + originals/)
2. Download each file
3. Upload to R2 with identical paths
4. Verify checksums (SHA-256)
5. Clean up: optionally delete from Supabase Storage

~80MB total — well within Supabase's 2GB/month free egress for a one-time transfer.

### 6. Dependencies

Add `@aws-sdk/client-s3` (or a minimal S3 client) to `package.json`.

## What stays the same

- Client URLs (`/api/images/{slug}`)
- Netlify CDN caching config
- Netlify Durable Cache (no changes needed)
- All Supabase DB and Auth services
- Admin audit logging
- Manifest structure and attribution fields
- Backup strategy (`originals/{slug}.jpg` prefix)

## What is removed

- Supabase Storage dependency for image serving
- No more Supabase bandwidth/egress for images
- Range-GET workaround in `ImageCropEditor.tsx` (no longer needed with real HEAD support)

## Risks

- **R2 costs**: First 10GB storage + 10M reads/month free. ~80MB images + minimal reads (most served by Netlify CDN) — effectively zero cost.
- **Migration bandwidth**: ~80MB egress from Supabase. Well within free tier limits.
- **Rollback**: Simply revert env vars and API route — images on Supabase Storage can be kept as backup.
