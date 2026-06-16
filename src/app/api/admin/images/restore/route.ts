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

    // Reflect the revert in the manifest: the restored original was the approved
    // image, so clear needsReview, refresh its measured dimensions, and bump
    // updatedAt so the admin thumbnail refetches (#41).
    const manifestData = await r2Get('manifest.json')
    if (manifestData) {
      const manifest: Record<string, Record<string, unknown>> = JSON.parse(manifestData.toString())
      if (manifest[scientificName]) {
        manifest[scientificName].needsReview = false
        manifest[scientificName].updatedAt = Date.now()
        const dims = jpegSize(backupBuffer)
        if (dims) {
          manifest[scientificName].width = dims.width
          manifest[scientificName].height = dims.height
        }
        await r2Put('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'), 'application/json')
      }
    }

    return NextResponse.json({ ok: true, path: getBirdImageUrl(scientificName) })
  } catch (err) {
    console.error('Restore error:', err)
    const message = err instanceof Error ? err.message : 'Failed to restore image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
