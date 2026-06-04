import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin/auth'
import { r2Get, r2Put } from '@/lib/r2'

interface ManifestEntry {
  file: string
  source: string
  attribution?: string
  license?: string
  needsReview?: boolean
  flagged?: boolean
  flag_reason?: string
}

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request).ok) {
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
      delete manifest[scientificName].flagged
      delete manifest[scientificName].flag_reason
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
