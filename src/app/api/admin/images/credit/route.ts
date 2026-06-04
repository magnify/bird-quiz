import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin/auth'
import { r2Get, r2Put } from '@/lib/r2'

interface ManifestEntry {
  file: string
  source: string
  attribution?: string
  license?: string
  flagged?: boolean
  flag_reason?: string
}

async function getManifest() {
  const data = await r2Get('manifest.json')
  if (!data) return {}
  return JSON.parse(data.toString()) as Record<string, ManifestEntry>
}

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request).ok) {
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
