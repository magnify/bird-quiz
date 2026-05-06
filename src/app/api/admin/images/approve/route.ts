import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

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

    const storage = createServiceClient().storage.from(BUCKET)

    // Download manifest
    const { data } = await storage.download('manifest.json')
    if (!data) {
      return NextResponse.json({ error: 'Failed to load manifest' }, { status: 500 })
    }

    const text = await data.text()
    const manifest: Record<string, ManifestEntry> = JSON.parse(text)

    // Remove needsReview flag
    if (manifest[scientificName]) {
      delete manifest[scientificName].needsReview
    }

    // Upload updated manifest
    const buffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
    await storage.upload('manifest.json', buffer, {
      upsert: true,
      contentType: 'application/json',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Approve error:', err)
    const message = err instanceof Error ? err.message : 'Failed to approve image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
