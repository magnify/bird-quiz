import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { toSlug, getBirdImageUrl } from '@/lib/images'

const SALT = 'dansk-fugleviden-admin-2026'
const BUCKET = 'bird-images'

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

    if (contentType.includes('multipart/form-data')) {
      // Upload mode: FormData with file + scientificName
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
      // iNaturalist mode: JSON with url + scientificName + attribution + license
      const body = await request.json()
      scientificName = body.scientificName
      const url = body.url as string
      attribution = body.attribution as string | undefined
      license = body.license as string | undefined

      if (!url || !scientificName) {
        return NextResponse.json({ error: 'Missing url or scientificName' }, { status: 400 })
      }

      // Download image server-side (avoids CORS)
      const res = await fetch(url)
      if (!res.ok) {
        return NextResponse.json({ error: `Failed to download image: ${res.status}` }, { status: 502 })
      }
      imageBuffer = Buffer.from(await res.arrayBuffer())
      source = 'inaturalist'
    }

    const slug = toSlug(scientificName)
    const supabase = createServiceClient()
    const storage = supabase.storage.from(BUCKET)

    // Back up the original if no backup exists yet
    const { data: backupCheck } = await storage.download(`originals/${slug}.jpg`)
    if (!backupCheck) {
      const { data: currentData } = await storage.download(`${slug}.jpg`)
      if (currentData) {
        const buffer = Buffer.from(await currentData.arrayBuffer())
        await storage.upload(`originals/${slug}.jpg`, buffer, {
          upsert: true,
          contentType: 'image/jpeg',
        })
      }
    }

    // Upload the replacement image
    const { error: uploadError } = await storage.upload(`${slug}.jpg`, imageBuffer, {
      upsert: true,
      contentType: 'image/jpeg',
    })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    // Update manifest.json in storage
    let manifest: Record<string, ManifestEntry> = {}
    const { data: manifestData } = await storage.download('manifest.json')
    if (manifestData) {
      const text = await manifestData.text()
      manifest = JSON.parse(text)
    }

    manifest[scientificName] = {
      file: `${slug}.jpg`,
      source,
      ...(attribution && { attribution }),
      ...(license && { license }),
    }

    const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
    await storage.upload('manifest.json', manifestBuffer, {
      upsert: true,
      contentType: 'application/json',
    })

    return NextResponse.json({ ok: true, path: getBirdImageUrl(scientificName) })
  } catch (err) {
    console.error('Replace error:', err)
    const message = err instanceof Error ? err.message : 'Failed to replace image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
