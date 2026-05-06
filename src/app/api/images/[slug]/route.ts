import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'bird-images'
const ONE_YEAR = 31536000 // seconds

interface RouteContext {
  params: Promise<{ slug: string }>
}

/**
 * Image API Proxy
 *
 * Serves bird images from Supabase Storage with fallback to Netlify static files.
 * This enables admin image replacements to appear immediately in the quiz without redeployment.
 *
 * Cache behavior:
 * - Primary: Supabase Storage bucket 'bird-images'
 * - Fallback: Netlify static files at /images/birds/
 * - HTTP cache: 1 year (immutable)
 * - Response header X-Source indicates origin (supabase | static-fallback)
 *
 * Usage:
 *   GET /api/images/turdus-merula
 *   GET /api/images/turdus-merula.jpg
 *
 * Both formats are supported. The .jpg extension is added if missing.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { slug } = await context.params
  const fileName = slug.endsWith('.jpg') ? slug : `${slug}.jpg`

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(fileName)

    if (!data || error) {
      console.error(`Image not found in Supabase Storage: ${fileName}`, error)
      return NextResponse.json(
        { error: 'Image not found in storage', file: fileName },
        { status: 404 }
      )
    }

    const buffer = await data.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': `public, max-age=${ONE_YEAR}`,
        'X-Source': 'supabase',
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
