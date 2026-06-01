import { NextRequest, NextResponse } from 'next/server'
import { r2Get } from '@/lib/r2'

const ONE_YEAR = 31536000

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params

  if (slug.includes('/') || slug.includes('\\') || slug.startsWith('.')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isManifest = slug === 'manifest.json'
  // Admin requests pass ?nocache so they always see the current image (no 1-year
  // CDN/browser cache fighting crop/replace). The public quiz omits it and caches.
  const noCache = isManifest || request.nextUrl.searchParams.has('nocache')
  const key = isManifest ? 'manifest.json' : (slug.endsWith('.jpg') ? slug : `${slug}.jpg`)
  const contentType = isManifest ? 'application/json' : 'image/jpeg'

  try {
    const buffer = await r2Get(key)
    if (!buffer) {
      return NextResponse.json({ error: 'Not found', file: key }, { status: 404 })
    }
    const cacheControl = noCache
      ? 'no-store, max-age=0'
      : `public, max-age=${ONE_YEAR}`
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'Netlify-CDN-Cache-Control': cacheControl,
        'Access-Control-Allow-Origin': '*',
        'X-Source': 'r2',
      },
    })
  } catch (error) {
    console.error(`Error fetching ${key}:`, error)
    return NextResponse.json({ error: 'Failed to fetch', file: key }, { status: 500 })
  }
}
