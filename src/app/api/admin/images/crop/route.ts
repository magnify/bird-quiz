import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin/auth'
import { r2Get, r2Put } from '@/lib/r2'
import { toSlug, getBirdImageUrl } from '@/lib/images'
import { jpegSize } from '@/lib/admin/image-dimensions'

export async function POST(request: NextRequest) {
  const auth = verifyAdminRequest(request)
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

    // A re-cropped image needs human review again; record its new dimensions so
    // the portrait/Billedproblemer check reflects the crop. Preserve everything else.
    const dims = jpegSize(buffer)
    const manifestData = await r2Get('manifest.json')
    if (manifestData) {
      const manifest: Record<string, Record<string, unknown>> = JSON.parse(manifestData.toString())
      if (manifest[scientificName]) {
        manifest[scientificName].needsReview = true
        manifest[scientificName].updatedAt = Date.now()
        if (dims) {
          manifest[scientificName].width = dims.width
          manifest[scientificName].height = dims.height
        }
        const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
        await r2Put('manifest.json', manifestBuffer, 'application/json')
      }
    }

    return NextResponse.json({ ok: true, path: getBirdImageUrl(scientificName) })
  } catch (err) {
    console.error('Crop error:', err)
    const message = err instanceof Error ? err.message : 'Failed to save cropped image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
