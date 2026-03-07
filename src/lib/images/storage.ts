/**
 * Image URL resolution for bird photos.
 *
 * Priority:
 * 1. Supabase Storage path (if available)
 * 2. Original image URL (Wikipedia/Commons override)
 * 3. Live Wikipedia/Commons fetch (fallback)
 */

import type { BirdImage } from '@/lib/supabase/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

/**
 * Get the display URL for a bird image.
 * If stored in Supabase Storage, constructs the public URL.
 * Otherwise falls back to the original image_url.
 */
export function getImageUrl(image: BirdImage | null | undefined): string | null {
  if (!image) return null

  // Prefer Supabase Storage path
  if (image.storage_path && SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/bird-images/${image.storage_path}`
  }

  // Fall back to original URL
  return image.image_url || null
}

/**
 * Get the primary image for a bird from a list of images.
 */
export function getPrimaryImage(images: BirdImage[]): BirdImage | null {
  return images.find(img => img.is_primary && img.status === 'approved') || images[0] || null
}

/**
 * Bad filename keywords — these are never good bird photos.
 * Used for filtering Wikipedia/Commons search results.
 */
const BAD_TITLE_WORDS = [
  'icon', 'logo', 'map', 'range', 'distribution', 'egg', 'eggs',
  'skull', 'skeleton', 'specimen', 'skin', 'museum', 'mwnh',
  'dead', 'taxiderm', 'feather', 'stamp', 'drawing', 'illustration',
  'diagram', 'chart', 'track', 'footprint', 'nest', 'call', 'song',
  'mhnt', 'mnhn', 'naturalis', 'clutch', 'oolog',
]

export function isBadImageTitle(title: string): boolean {
  const t = (title || '').toLowerCase()
  if (!t.endsWith('.jpg') && !t.endsWith('.jpeg') && !t.endsWith('.png')) return true
  return BAD_TITLE_WORDS.some(w => t.includes(w))
}

/**
 * Species whose Wikipedia page image is badly framed — skip to Commons.
 */
const SKIP_WIKIPEDIA_IMAGE = new Set([
  'Falco subbuteo',
  'Milvus migrans',
  'Uria aalge',
  'Tringa glareola',
])

/**
 * Fetch a bird image URL from Wikipedia/Commons.
 * This is the fallback when no image exists in the database.
 */
export async function fetchBirdImageFromWikipedia(
  scientificName: string
): Promise<string | null> {
  // Strategy 1: Wikipedia page image
  if (!SKIP_WIKIPEDIA_IMAGE.has(scientificName)) {
    try {
      const wpUrl =
        `https://en.wikipedia.org/w/api.php?` +
        `action=query&titles=${encodeURIComponent(scientificName)}` +
        `&prop=pageimages&piprop=thumbnail&pithumbsize=800` +
        `&format=json&origin=*&redirects=1`

      const resp = await fetch(wpUrl)
      if (resp.ok) {
        const data = await resp.json()
        if (data.query?.pages) {
          const page = Object.values(data.query.pages)[0] as any
          if (page?.thumbnail?.source) {
            const src = page.thumbnail.source
            const fname = decodeURIComponent(src.split('/').pop() || '').toLowerCase()
            if (!BAD_TITLE_WORDS.some(w => fname.includes(w))) {
              return src
            }
          }
        }
      }
    } catch {
      // fall through to Commons
    }
  }

  // Strategy 2: Wikimedia Commons search
  const searchQueries = [scientificName, `${scientificName} bird`]

  for (const query of searchQueries) {
    try {
      const url =
        `https://commons.wikimedia.org/w/api.php?` +
        `action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}` +
        `&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=800` +
        `&format=json&origin=*`

      const resp = await fetch(url)
      if (!resp.ok) continue
      const data = await resp.json()
      if (!data.query?.pages) continue

      const pages = (Object.values(data.query.pages) as any[])
        .filter(p => !isBadImageTitle(p.title))
        .sort((a, b) => (a.index || 0) - (b.index || 0))

      if (pages.length > 0 && pages[0].imageinfo?.[0]) {
        return pages[0].imageinfo[0].thumburl || pages[0].imageinfo[0].url
      }
    } catch {
      // continue
    }
  }

  return null
}
