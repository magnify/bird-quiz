import { NextRequest, NextResponse } from 'next/server'
import { r2Get } from '@/lib/r2'

const ONE_YEAR = 31536000

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params

  if (slug.includes('/') || slug.includes('\\') || slug.startsWith('.')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const key = `originals/${slug.endsWith('.jpg') ? slug : `${slug}.jpg`}`

  try {
    const buffer = await r2Get(key)
    if (!buffer) {
      return NextResponse.json({ error: 'Not found', file: key }, { status: 404 })
    }
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': `public, max-age=${ONE_YEAR}`,
        'Access-Control-Allow-Origin': '*',
        'X-Source': 'r2',
      },
    })
  } catch (error) {
    console.error(`Error fetching ${key}:`, error)
    return NextResponse.json({ error: 'Failed to fetch', file: key }, { status: 500 })
  }
}
