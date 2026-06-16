import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin/auth'
import { r2Get, r2Put } from '@/lib/r2'
import { toSlug, getBirdImageUrl } from '@/lib/images'
import { jpegSize } from '@/lib/admin/image-dimensions'
import { BRAND } from '@/lib/brand'

interface ManifestEntry {
  file: string
  source: string
  attribution?: string
  license?: string
  source_url?: string
  needsReview?: boolean
  width?: number
  height?: number
  updatedAt?: number
}

export async function POST(request: NextRequest) {
  const auth = verifyAdminRequest(request)
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
        headers: source === 'wikimedia-commons' ? { 'User-Agent': BRAND.userAgent } : {},
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

    // A freshly replaced image needs human review before it counts as approved.
    // Record dimensions so the portrait/Billedproblemer check reflects the new image.
    const dims = jpegSize(imageBuffer)
    manifest[scientificName] = {
      file: `${slug}.jpg`,
      source,
      needsReview: true,
      updatedAt: Date.now(),
      ...(attribution && { attribution }),
      ...(license && { license }),
      ...(sourceUrl && { source_url: sourceUrl }),
      ...(dims && { width: dims.width, height: dims.height }),
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
