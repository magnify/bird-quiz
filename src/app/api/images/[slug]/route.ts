import { NextRequest, NextResponse } from 'next/server'
import { r2Get } from '@/lib/r2'

const ONE_YEAR = 31536000

interface RouteContext {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params

  if (slug === 'manifest.json') {
    try {
      const buffer = await r2Get('manifest.json')
      if (!buffer) {
        return NextResponse.json({ error: 'Manifest not found' }, { status: 404 })
      }
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${ONE_YEAR}`,
          'X-Source': 'r2',
        },
      })
    } catch (error) {
      console.error('Error fetching manifest:', error)
      return NextResponse.json({ error: 'Failed to fetch manifest' }, { status: 500 })
    }
  }

  const fileName = slug.endsWith('.jpg') ? slug : `${slug}.jpg`

  try {
    const buffer = await r2Get(fileName)

    if (!buffer) {
      console.error(`Image not found in R2: ${fileName}`)
      return NextResponse.json(
        { error: 'Image not found', file: fileName },
        { status: 404 }
      )
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': `public, max-age=${ONE_YEAR}`,
        'X-Source': 'r2',
      },
    })
  } catch (error) {
    console.error(`Error fetching image ${fileName}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch image', file: fileName },
      { status: 500 }
    )
  }
}
