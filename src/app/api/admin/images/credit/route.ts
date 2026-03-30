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
}

async function getManifest(storage: ReturnType<ReturnType<typeof createServiceClient>['storage']['from']>) {
  const { data } = await storage.download('manifest.json')
  if (!data) return {}
  const text = await data.text()
  return JSON.parse(text) as Record<string, ManifestEntry>
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scientificName = request.nextUrl.searchParams.get('bird')
  if (!scientificName) {
    return NextResponse.json({ error: 'Missing bird parameter' }, { status: 400 })
  }

  const storage = createServiceClient().storage.from(BUCKET)
  const manifest = await getManifest(storage)
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
    const { scientificName, attribution } = await request.json()
    if (!scientificName) {
      return NextResponse.json({ error: 'Missing scientificName' }, { status: 400 })
    }

    const storage = createServiceClient().storage.from(BUCKET)
    const manifest = await getManifest(storage)

    if (!manifest[scientificName]) {
      const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
      manifest[scientificName] = { file: `${slug}.jpg`, source: 'unknown' }
    }

    if (attribution) {
      manifest[scientificName].attribution = attribution
    } else {
      delete manifest[scientificName].attribution
    }

    const buffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n')
    await storage.upload('manifest.json', buffer, {
      upsert: true,
      contentType: 'application/json',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Credit error:', err)
    const message = err instanceof Error ? err.message : 'Failed to update credit'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
