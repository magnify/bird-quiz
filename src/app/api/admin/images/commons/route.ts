import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin/auth'
import { BRAND } from '@/lib/brand'

interface CommonsImageInfo {
  url: string
  thumburl?: string
  thumbwidth?: number
  thumbheight?: number
  width: number
  height: number
  descriptionurl: string
  mime?: string
  extmetadata: Record<string, { value: string }>
}

interface CommonsPage {
  title: string
  imageinfo?: CommonsImageInfo[]
}

interface CommonsResult {
  title: string
  thumbnailUrl: string
  fullUrl: string
  descriptionUrl: string
  width: number
  height: number
  attribution: string
  license: string
  licenseUrl?: string
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

export async function GET(request: NextRequest) {
  const auth = verifyAdminRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
  }

  const query = request.nextUrl.searchParams.get('query')
  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
  }

  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6', // File: namespace
      gsrlimit: '30',
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata|mime',
      iiurlwidth: '400',
    })

    const url = `https://commons.wikimedia.org/w/api.php?${params}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': BRAND.userAgent,
      },
    })

    if (!res.ok) {
      throw new Error(`Commons API error: ${res.status}`)
    }

    const data = await res.json()
    const pages: Record<string, CommonsPage> = data.query?.pages || {}

    const results: CommonsResult[] = Object.values(pages)
      .map((page): CommonsResult | null => {
        const info = page.imageinfo?.[0]
        if (!info) return null
        // Only raster images (skip SVG, PDF, audio, video)
        if (info.mime && !['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) return null

        const meta = info.extmetadata || {}
        const licenseShort = meta.LicenseShortName?.value || ''
        const artist = stripHtml(meta.Artist?.value || '') || 'Unknown'
        const credit = stripHtml(meta.Credit?.value || '')
        const licenseUrl = meta.LicenseUrl?.value

        const attribution = credit && credit !== artist
          ? `${artist} — ${credit} (Wikimedia Commons)`
          : `${artist} (Wikimedia Commons)`

        return {
          title: page.title.replace(/^File:/, ''),
          thumbnailUrl: info.thumburl || info.url,
          fullUrl: info.url,
          descriptionUrl: info.descriptionurl,
          width: info.width,
          height: info.height,
          attribution,
          license: licenseShort.toLowerCase().replace(/\s+/g, '-') || 'unknown',
          licenseUrl,
        }
      })
      .filter((r): r is CommonsResult => r !== null)
      // Filter out non-permissive licenses
      .filter(r => {
        const l = r.license.toLowerCase()
        return l.startsWith('cc') || l === 'public-domain' || l === 'pd' || l.includes('pd-')
      })
      // Sort by size (prefer bigger)
      .sort((a, b) => b.width * b.height - a.width * a.height)

    return NextResponse.json({ results })
  } catch (err) {
    console.error('Commons API error:', err)
    const message = err instanceof Error ? err.message : 'Commons search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
