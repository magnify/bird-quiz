# Cloudflare R2 Image Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move 221 bird images + manifest from Supabase Storage to Cloudflare R2, reducing Supabase free tier storage/bandwidth usage while keeping same client URLs.

**Architecture:** Create a shared R2 client module (`src/lib/r2.ts`), swap all Supabase Storage calls in the API proxy route and 4 admin routes to use R2's S3-compatible API. One-time migration script copies existing data.

**Tech Stack:** `@aws-sdk/client-s3` (R2 S3-compatible API), Next.js API routes, Cloudflare R2

---

### File Structure

```
Modified:
  src/lib/r2.ts                          (NEW — R2 client module)
  src/app/api/images/[slug]/route.ts     (swap download source)
  src/app/api/admin/images/replace/route.ts
  src/app/api/admin/images/crop/route.ts
  src/app/api/admin/images/restore/route.ts
  src/app/api/admin/images/credit/route.ts
  src/app/api/admin/images/approve/route.ts
  src/lib/data/manifest.ts               (update fetch URL)
  src/components/admin/ImageCropEditor.tsx (replace range-GET with HEAD)
  .env.local.example                     (add R2 env vars)
  package.json                            (add @aws-sdk/client-s3)

Created:
  scripts/migrate-to-r2.ts               (one-time migration)
```

---

### Task 1: Install dependency + add R2 env vars

**Files:**
- Modify: `package.json`
- Modify: `.env.local.example`

- [ ] **Step 1: Install `@aws-sdk/client-s3`**

```
npm install @aws-sdk/client-s3
```

- [ ] **Step 2: Add R2 env vars to `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=bird-images
```

- [ ] **Step 3: Add to `.env.local`** (actual values from Cloudflare dashboard)

- [ ] **Step 4: Commit**

```
git add package.json package-lock.json .env.local.example
git commit -m "chore: add @aws-sdk/client-s3 for R2 image storage"
```

---

### Task 2: Create shared R2 client module

**Files:**
- Create: `src/lib/r2.ts`

A thin wrapper around the S3 SDK. Exports three functions: `r2Get`, `r2Put`, `r2Head`. The S3 client is initialized lazily from env vars.

- [ ] **Step 1: Create `src/lib/r2.ts`**

```typescript
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 credentials: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

const BUCKET = process.env.R2_BUCKET_NAME || 'bird-images'

export async function r2Get(key: string): Promise<Buffer | null> {
  try {
    const client = getR2Client()
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
    const response = await client.send(command)
    const bytes = await response.Body?.transformToByteArray()
    return bytes ? Buffer.from(bytes) : null
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NoSuchKey') return null
    throw err
  }
}

export async function r2Put(key: string, buffer: Buffer, contentType: string): Promise<void> {
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })
  await client.send(command)
}

export async function r2Head(key: string): Promise<boolean> {
  try {
    const client = getR2Client()
    const command = new HeadObjectCommand({ Bucket: BUCKET, Key: key })
    await client.send(command)
    return true
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NotFound') return false
    throw err
  }
}
```

- [ ] **Step 2: Run type check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```
git add src/lib/r2.ts
git commit -m "feat: add R2 client module with get/put/head helpers"
```

---

### Task 3: Update image serving API route

**Files:**
- Modify: `src/app/api/images/[slug]/route.ts`

Swap `supabase.storage.from(BUCKET).download(fileName)` for `r2Get(fileName)`. Remove the Supabase import and the `BUCKET` constant.

- [ ] **Step 1: Rewrite `src/app/api/images/[slug]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { r2Get } from '@/lib/r2'

const ONE_YEAR = 31536000

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  const fileName = slug.endsWith('.jpg') ? slug : `${slug}.jpg`

  try {
    const buffer = await r2Get(fileName)

    if (!buffer) {
      console.error(`Image not found in R2: ${fileName}`)
      return NextResponse.json(
        { error: 'Image not found', file: fileName },
        { status: 404 }
      )
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': `public, max-age=${ONE_YEAR}`,
        'X-Source': 'r2',
      },
    })
  } catch (error) {
    console.error(`Error fetching image ${fileName}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch image', file: fileName },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Build check**

```
npm run build
```
Expected: compiles successfully.

- [ ] **Step 3: Commit**

```
git add src/app/api/images/[slug]/route.ts
git commit -m "feat: serve bird images from Cloudflare R2 instead of Supabase Storage"
```

---

### Task 4: Update admin replace route

**Files:**
- Modify: `src/app/api/admin/images/replace/route.ts`

Swap all `supabase.storage.from(BUCKET)` calls for `r2Get`/`r2Put`. The backup check, the image upload, and the manifest read/write all change.

- [ ] **Step 1: Rewrite `src/app/api/admin/images/replace/route.ts`**

Key changes:
- Replace `import { createServiceClient } from '@/lib/supabase/server'` with `import { r2Get, r2Put } from '@/lib/r2'`
- Remove `const supabase = createServiceClient()` and `const storage = supabase.storage.from(BUCKET)`
- Replace backup check: `storage.download('originals/${slug}.jpg')` → `r2Get('originals/${slug}.jpg')`
- Replace backup upload: `storage.upload(...)` → `r2Put(...)`
- Replace image upload: `storage.upload(...)` → `r2Put(...)`
- Replace manifest download: `storage.download('manifest.json')` → `r2Get('manifest.json')`
- Replace manifest upload: `storage.upload(...)` → `r2Put(...)`
- Remove `getSupabaseImageUrl` import, replace the returned URL with the API proxy path: `getBirdImageUrl(scientificName)`

Full file:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { r2Get, r2Put } from '@/lib/r2'
import { toSlug, getBirdImageUrl } from '@/lib/images'

const SALT = 'dansk-fugleviden-admin-2026'

function verifyAdmin(request: NextRequest): { ok: boolean; reason?: string } {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return { ok: false, reason: 'no ADMIN_PASSWORD env var' }
  const token = request.cookies.get('admin_auth')?.value
  if (!token) return { ok: false, reason: 'no admin_auth cookie' }
  const hash = createHash('sha256').update(expected + SALT).digest('hex')
  if (token !== hash) return { ok: false, reason: 'cookie mismatch' }
  return { ok: true }
}

interface ManifestEntry {
  file: string
  source: string
  attribution?: string
  license?: string
  source_url?: string
}

export async function POST(request: NextRequest) {
  const auth = verifyAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
  }

  try {
    const contentType = request.headers.get('content-type') || ''
    let scientificName: string
    let imageBuffer: Buffer
    let source: string
    let attribution: string | undefined
    let license: string | undefined
    let sourceUrl: string | undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      scientificName = formData.get('scientificName') as string
      if (!file || !scientificName) {
        return NextResponse.json({ error: 'Missing file or scientificName' }, { status: 400 })
      }
      imageBuffer = Buffer.from(await file.arrayBuffer())
      attribution = (formData.get('attribution') as string) || undefined
      source = 'upload'
    } else {
      const body = await request.json()
      scientificName = body.scientificName
      const url = body.url as string
      attribution = body.attribution as string | undefined
      license = body.license as string | undefined
      sourceUrl = body.source_url as string | undefined
      source = (body.source as string) || 'inaturalist'

      if (!url || !scientificName) {
        return NextResponse.json({ error: 'Missing url or scientificName' }, { status: 400 })
      }

      const res = await fetch(url, {
        headers: source === 'wikimedia-commons' ? { 'User-Agent': 'bird-quiz/1.0 (https://bird-quiz.magnify.dk)' } : {},
      })
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to download image: ${res.status}` }, { status: 502 })
      }
      imageBuffer = Buffer.from(await res.arrayBuffer())
    }

    const slug = toSlug(scientificName)

    // Back up the original if no backup exists yet
    const backupBuffer = await r2Get(`originals/${slug}.jpg`)
    if (!backupBuffer) {
      const currentBuffer = await r2Get(`${slug}.jpg`)
      if (currentBuffer) {
        await r2Put(`originals/${slug}.jpg`, currentBuffer, 'image/jpeg')
      }
    }

    // Upload the replacement image
    await r2Put(`${slug}.jpg`, imageBuffer, 'image/jpeg')

    // Update manifest.json in R2
    let manifest: Record<string, ManifestEntry> = {}
    const manifestData = await r2Get('manifest.json')
    if (manifestData) {
      manifest = JSON.parse(manifestData.toString())
    }

    manifest[scientificName] = {
      file: `${slug}.jpg`,
      source,
      ...(attribution && { attribution }),
      ...(license && { license }),
      ...(sourceUrl && { source_url: sourceUrl }),
    }

    const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
    await r2Put('manifest.json', manifestBuffer, 'application/json')

    const directUrl = getBirdImageUrl(scientificName)
    const cacheBustedUrl = `${directUrl}?t=${Date.now()}`
    return NextResponse.json({ ok: true, path: cacheBustedUrl })
  } catch (err) {
    console.error('Replace error:', err)
    const message = err instanceof Error ? err.message : 'Failed to replace image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Build check**

```
npm run build
```
Expected: compiles successfully.

- [ ] **Step 3: Commit**

```
git add src/app/api/admin/images/replace/route.ts
git commit -m "feat: admin replace route uses R2 instead of Supabase Storage"
```

---

### Task 5: Update admin crop route

**Files:**
- Modify: `src/app/api/admin/images/crop/route.ts`

Same pattern as replace: swap Supabase Storage calls for `r2Get`/`r2Put`.

- [ ] **Step 1: Rewrite `src/app/api/admin/images/crop/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { r2Get, r2Put } from '@/lib/r2'
import { toSlug, getBirdImageUrl } from '@/lib/images'

const SALT = 'dansk-fugleviden-admin-2026'

function verifyAdmin(request: NextRequest): { ok: boolean; reason?: string } {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return { ok: false, reason: 'no ADMIN_PASSWORD env var' }
  const token = request.cookies.get('admin_auth')?.value
  if (!token) return { ok: false, reason: 'no admin_auth cookie' }
  const hash = createHash('sha256').update(expected + SALT).digest('hex')
  if (token !== hash) return { ok: false, reason: 'cookie mismatch' }
  return { ok: true }
}

export async function POST(request: NextRequest) {
  const auth = verifyAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const scientificName = formData.get('scientificName') as string | null

    if (!file || !scientificName) {
      return NextResponse.json({ error: 'Missing file or scientificName' }, { status: 400 })
    }

    const slug = toSlug(scientificName)

    // Back up the original if no backup exists yet
    const backupBuffer = await r2Get(`originals/${slug}.jpg`)
    if (!backupBuffer) {
      const currentBuffer = await r2Get(`${slug}.jpg`)
      if (currentBuffer) {
        await r2Put(`originals/${slug}.jpg`, currentBuffer, 'image/jpeg')
      }
    }

    // Upload the cropped image
    const buffer = Buffer.from(await file.arrayBuffer())
    await r2Put(`${slug}.jpg`, buffer, 'image/jpeg')

    return NextResponse.json({ ok: true, path: getBirdImageUrl(scientificName) })
  } catch (err) {
    console.error('Crop error:', err)
    const message = err instanceof Error ? err.message : 'Failed to save cropped image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Build check**

```
npm run build
```
Expected: compiles successfully.

- [ ] **Step 3: Commit**

```
git add src/app/api/admin/images/crop/route.ts
git commit -m "feat: admin crop route uses R2 instead of Supabase Storage"
```

---

### Task 6: Update admin restore route

**Files:**
- Modify: `src/app/api/admin/images/restore/route.ts`

- [ ] **Step 1: Rewrite `src/app/api/admin/images/restore/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { r2Get, r2Put } from '@/lib/r2'
import { toSlug, getBirdImageUrl } from '@/lib/images'

const SALT = 'dansk-fugleviden-admin-2026'

function verifyAdmin(request: NextRequest): { ok: boolean; reason?: string } {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return { ok: false, reason: 'no ADMIN_PASSWORD env var' }
  const token = request.cookies.get('admin_auth')?.value
  if (!token) return { ok: false, reason: 'no admin_auth cookie' }
  const hash = createHash('sha256').update(expected + SALT).digest('hex')
  if (token !== hash) return { ok: false, reason: 'cookie mismatch' }
  return { ok: true }
}

export async function POST(request: NextRequest) {
  const auth = verifyAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
  }

  try {
    const { scientificName } = await request.json()
    if (!scientificName) {
      return NextResponse.json({ error: 'Missing scientificName' }, { status: 400 })
    }

    const slug = toSlug(scientificName)

    // Download backup from R2
    const backupBuffer = await r2Get(`originals/${slug}.jpg`)
    if (!backupBuffer) {
      return NextResponse.json({ error: 'No backup found' }, { status: 404 })
    }

    // Upload backup as current image
    await r2Put(`${slug}.jpg`, backupBuffer, 'image/jpeg')

    return NextResponse.json({ ok: true, path: getBirdImageUrl(scientificName) })
  } catch (err) {
    console.error('Restore error:', err)
    const message = err instanceof Error ? err.message : 'Failed to restore image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Build check**

```
npm run build
```
Expected: compiles successfully.

- [ ] **Step 3: Commit**

```
git add src/app/api/admin/images/restore/route.ts
git commit -m "feat: admin restore route uses R2 instead of Supabase Storage"
```

---

### Task 7: Update admin credit + approve routes (manifest)

**Files:**
- Modify: `src/app/api/admin/images/credit/route.ts`
- Modify: `src/app/api/admin/images/approve/route.ts`

Both routes download and upload `manifest.json`. Swap for `r2Get`/`r2Put`.

- [ ] **Step 1: Rewrite `src/app/api/admin/images/credit/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { r2Get, r2Put } from '@/lib/r2'

const SALT = 'dansk-fugleviden-admin-2026'
const BUCKET = 'bird-images'

function verifyAdmin(request: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  const token = request.cookies.get('admin_auth')?.value
  if (!token) return false
  const hash = createHash('sha256').update(expected + SALT).digest('hex')
  return token === hash
}

interface ManifestEntry {
  file: string
  source: string
  attribution?: string
  license?: string
}

async function getManifest() {
  const data = await r2Get('manifest.json')
  if (!data) return {}
  return JSON.parse(data.toString()) as Record<string, ManifestEntry>
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scientificName = request.nextUrl.searchParams.get('bird')
  if (!scientificName) {
    return NextResponse.json({ error: 'Missing bird parameter' }, { status: 400 })
  }

  const manifest = await getManifest()
  const entry = manifest[scientificName]

  return NextResponse.json({
    attribution: entry?.attribution || null,
    source: entry?.source || null,
    license: entry?.license || null,
  })
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { scientificName, attribution, license } = await request.json()
    if (!scientificName) {
      return NextResponse.json({ error: 'Missing scientificName' }, { status: 400 })
    }

    const manifest = await getManifest()

    if (!manifest[scientificName]) {
      const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
      manifest[scientificName] = { file: `${slug}.jpg`, source: 'unknown' }
    }

    if (attribution !== undefined) {
      if (attribution) {
        manifest[scientificName].attribution = attribution
      } else {
        delete manifest[scientificName].attribution
      }
    }

    if (license !== undefined) {
      if (license) {
        manifest[scientificName].license = license
      } else {
        delete manifest[scientificName].license
      }
    }

    const buffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
    await r2Put('manifest.json', buffer, 'application/json')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Credit error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update credit'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Rewrite `src/app/api/admin/images/approve/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { r2Get, r2Put } from '@/lib/r2'

const SALT = 'dansk-fugleviden-admin-2026'

function verifyAdmin(request: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  const token = request.cookies.get('admin_auth')?.value
  if (!token) return false
  const hash = createHash('sha256').update(expected + SALT).digest('hex')
  return token === hash
}

interface ManifestEntry {
  file: string
  source: string
  attribution?: string
  license?: string
  needsReview?: boolean
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { scientificName } = await request.json()
    if (!scientificName) {
      return NextResponse.json({ error: 'Missing scientificName' }, { status: 400 })
    }

    const data = await r2Get('manifest.json')
    if (!data) {
      return NextResponse.json({ error: 'Failed to load manifest' }, { status: 500 })
    }

    const manifest: Record<string, ManifestEntry> = JSON.parse(data.toString())

    if (manifest[scientificName]) {
      delete manifest[scientificName].needsReview
    }

    const buffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
    await r2Put('manifest.json', buffer, 'application/json')

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Approve error:', err)
    const message = err instanceof Error ? err.message : 'Failed to approve image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Build check**

```
npm run build
```
Expected: compiles successfully.

- [ ] **Step 4: Commit**

```
git add src/app/api/admin/images/credit/route.ts src/app/api/admin/images/approve/route.ts
git commit -m "feat: admin manifest routes use R2 instead of Supabase Storage"
```

---

### Task 8: Update client-side manifest fetch

**Files:**
- Modify: `src/lib/data/manifest.ts`

The manifest now lives in R2. Serve it through the API proxy by fetching `/api/images/manifest.json` instead of the Supabase Storage URL.

- [ ] **Step 1: Edit `src/lib/data/manifest.ts`**

Replace the `MANIFEST_URL` construction with a direct API proxy path:

```typescript
export interface ManifestEntry {
  file: string
  source?: string
  attribution?: string
  license?: string
  source_url?: string
}

export type Manifest = Map<string, ManifestEntry>

const MANIFEST_URL = '/api/images/manifest.json'

let cached: Manifest | null = null
let inflight: Promise<Manifest> | null = null

export async function fetchManifest(): Promise<Manifest> {
  if (cached) return cached
  if (inflight) return inflight

  inflight = fetch(MANIFEST_URL, { cache: 'force-cache' })
    .then(async (res) => {
      if (!res.ok) return new Map<string, ManifestEntry>()
      const json = (await res.json()) as Record<string, ManifestEntry>
      return new Map(Object.entries(json))
    })
    .catch(() => new Map<string, ManifestEntry>())
    .then((map) => {
      cached = map
      inflight = null
      return map
    })

  return inflight
}
```

- [ ] **Step 2: Verify tests pass**

```
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```
git add src/lib/data/manifest.ts
git commit -m "feat: fetch manifest from API proxy instead of Supabase Storage URL"
```

---

### Task 9: Update ImageCropEditor backup check

**Files:**
- Modify: `src/components/admin/ImageCropEditor.tsx`

The backup existence check currently uses a range-GET workaround (because Supabase Storage doesn't support HEAD). R2 supports HEAD natively via `r2Head` — but since this runs client-side, call a lightweight endpoint instead.

- [ ] **Step 1: Edit `src/components/admin/ImageCropEditor.tsx`**

Replace the range-GET fetch block (lines 30-38) with a call to the restore endpoint status, or simply use the API proxy with a HEAD-friendly approach:

Remove lines 30-38 (the backup check with range GET) and replace with a fetch to a status endpoint. The simplest approach: let the restore handler tell us if a backup exists by calling `/api/admin/images/restore` with a `check` mode. But that adds API complexity.

A simpler approach: just check via HEAD to the API proxy for `originals/{slug}.jpg`. Since the API proxy is our own endpoint, we can add HEAD support or use a simpler GET-with-range trick.

Actually the cleanest approach: add a `?check` query param to the existing restore endpoint that just checks if backup exists without restoring. But that's scope creep.

Simplest practical change: the ImageCropEditor already handles the case where `hasBackup` is false (the restore button is hidden). So we can just default to `hasBackup = false` and let the user find out when they click restore. Or we check via fetching the API proxy with a range request.

Actually the simplest: just change the backup URL check to point at the API proxy for the originals path:

```typescript
const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
const backupUrl = `/api/images/originals/${slug}.jpg`
if (hasBackup === null) {
  fetch(backupUrl, { method: 'HEAD', headers: { Range: 'bytes=0-0' } })
    .then(res => setHasBackup(res.ok || res.status === 206))
    .catch(() => setHasBackup(false))
}
```

Wait, but the API proxy only handles GET requests. It returns images, not HEAD responses. Let me think...

Actually the simplest: just remove the backup check entirely. The restore button can show up always and fail gracefully if no backup exists. Or we can just try to fetch the first byte via a range request to the API proxy route.

Actually the absolute simplest: just use a range GET against `/api/images/originals/${slug}.jpg`. The API proxy will download from R2 and return the bytes. With `Range: bytes=0-0`, R2 will return 206 and the image bytes. That's barely any bandwidth and works.

Let me just keep the pattern but change the URL:

```typescript
const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
const backupUrl = `/api/images/originals/${slug}.jpg`
if (hasBackup === null) {
  fetch(backupUrl, { headers: { Range: 'bytes=0-0' } })
    .then(res => setHasBackup(res.ok || res.status === 206))
    .catch(() => setHasBackup(false))
}
```

This is the minimal change. The API proxy already handles the slug with or without `.jpg`, so this will work.

- [ ] **Step 1: Edit the backup URL in `ImageCropEditor.tsx`**

Change lines 31-33 from:

```typescript
const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
const backupUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bird-images/originals/${slug}.jpg`
if (hasBackup === null) {
```

To:

```typescript
const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
const backupUrl = `/api/images/originals/${slug}.jpg`
if (hasBackup === null) {
```

- [ ] **Step 2: Remove the comment about Supabase Storage not supporting HEAD**

Delete the comment on line 31: `// Supabase Storage doesn't support HEAD — use a range GET to minimize bandwidth`

- [ ] **Step 3: Build check**

```
npm run build
```
Expected: compiles successfully.

- [ ] **Step 4: Commit**

```
git add src/components/admin/ImageCropEditor.tsx
git commit -m "fix: update ImageCropEditor backup check to use API proxy instead of Supabase URL"
```

---

### Task 10: Migration script

**Files:**
- Create: `scripts/migrate-to-r2.ts`

A one-time script that copies all files from Supabase Storage to R2. Uses service role key for Supabase.

- [ ] **Step 1: Create `scripts/migrate-to-r2.ts`**

```typescript
/**
 * Migration script: Copy bird-images from Supabase Storage to Cloudflare R2.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-r2.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 */

import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'bird-images'

const required = { SUPABASE_URL, SUPABASE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY }
for (const [name, val] of Object.entries(required)) {
  if (!val) throw new Error(`Missing env var: ${name}`)
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! },
})

async function migrateFile(key: string): Promise<void> {
  console.log(`Downloading ${key} from Supabase...`)
  const { data, error } = await supabase.storage.from('bird-images').download(key)
  if (error || !data) {
    console.error(`  FAILED to download ${key}:`, error?.message)
    return
  }

  const buffer = Buffer.from(await data.arrayBuffer())

  console.log(`  Uploading ${key} to R2 (${buffer.length} bytes)...`)
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: key.endsWith('.json') ? 'application/json' : 'image/jpeg',
  }))

  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 12)
  console.log(`  Done: ${key} (sha256:${hash})`)
}

async function main() {
  console.log('Starting migration from Supabase Storage to Cloudflare R2...')
  console.log(`Bucket: ${R2_BUCKET}`)

  // List all files in Supabase Storage
  const { data: files, error } = await supabase.storage.from('bird-images').list()
  if (error) {
    throw new Error(`Failed to list files: ${error.message}`)
  }

  console.log(`Found ${files.length} files in Supabase Storage`)

  // First migrate manifest.json
  const manifestFile = files.find(f => f.name === 'manifest.json')
  if (manifestFile) {
    await migrateFile('manifest.json')
  }

  // Migrate originals
  const { data: originals } = await supabase.storage.from('bird-images').list('originals')
  if (originals) {
    for (const file of originals) {
      await migrateFile(`originals/${file.name}`)
    }
  }

  // Migrate regular bird images
  for (const file of files) {
    if (file.name === 'manifest.json') continue
    await migrateFile(file.name)
  }

  console.log('Migration complete!')
  console.log('')
  console.log('Next steps:')
  console.log('  1. Verify images load via /api/images/{slug} on the live site')
  console.log('  2. Check admin image tools work (replace, crop, restore)')
  console.log('  3. Optionally clean up Supabase Storage bucket')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Verify the script parses correctly**

```
npx tsx --no-warnings --check scripts/migrate-to-r2.ts
```
Expected: no type errors.

- [ ] **Step 3: Commit**

```
git add scripts/migrate-to-r2.ts
git commit -m "feat: add migration script for copying Supabase images to R2"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run full test suite**

```
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 2: Type check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Production build**

```
npm run build
```
Expected: builds successfully.

- [ ] **Step 4: Lint**

```
npm run lint
```
Expected: no errors in app code (only pre-existing Netlify vendor warnings).

- [ ] **Step 5: Final commit if anything changed**

```
git add -A && git commit -m "chore: final cleanup after R2 migration"
```

---

### Verification Checklist

After deployment, confirm:

- [ ] `GET /api/images/turdus-merula` returns the image (not a 404)
- [ ] `GET /api/images/manifest.json` returns the manifest JSON
- [ ] Admin → Images page loads and shows all birds
- [ ] Admin → Replace image (upload + remote URL both work)
- [ ] Admin → Crop image works
- [ ] Admin → Restore original works
- [ ] Admin → Update credit/license works
- [ ] Admin → Approve image works
- [ ] Quiz questions display images correctly
- [ ] Supabase Storage bucket shows 0 reads in dashboard (after cache warm)
