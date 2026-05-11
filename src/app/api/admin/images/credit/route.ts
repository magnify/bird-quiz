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
