const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const CDN_URL = process.env.NEXT_PUBLIC_IMAGE_CDN_URL

export function getBirdImageUrl(scientificName: string): string {
  const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
  if (CDN_URL) return `${CDN_URL}/${slug}.jpg`
  return `/api/images/${slug}`
}

/**
 * Get the image URL for admin tools.
 * Uses the API proxy (which reads from R2) with a cache-bust parameter.
 */
export function getSupabaseImageUrl(scientificName: string): string {
  const slug = toSlug(scientificName)
  return `/api/images/${slug}`
}

/**
 * Convert a scientific name to its image slug.
 */
export function toSlug(scientificName: string): string {
  return scientificName.toLowerCase().replace(/\s+/g, '-')
}
