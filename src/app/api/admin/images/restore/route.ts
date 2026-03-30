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
    const supabase = createServiceClient()
    const storage = supabase.storage.from(BUCKET)

    // Download backup
    const { data: backupData, error: backupError } = await storage.download(`originals/${slug}.jpg`)
    if (backupError || !backupData) {
      return NextResponse.json({ error: 'No backup found' }, { status: 404 })
    }

    // Upload backup as current image
    const buffer = Buffer.from(await backupData.arrayBuffer())
    const { error: uploadError } = await storage.upload(`${slug}.jpg`, buffer, {
      upsert: true,
      contentType: 'image/jpeg',
    })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    return NextResponse.json({ ok: true, path: getBirdImageUrl(scientificName) })
  } catch (err) {
    console.error('Restore error:', err)
    const message = err instanceof Error ? err.message : 'Failed to restore image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
