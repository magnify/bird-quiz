const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const CDN_URL = process.env.NEXT_PUBLIC_IMAGE_CDN_URL

export function getBirdImageUrl(scientificName: string): string {
  const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
  if (CDN_URL) return `${CDN_URL}/${slug}.jpg`
  return `/api/images/${slug}`
}

/**
 * Get the direct Supabase Storage URL for a bird image.
 * Used by admin tools to display images immediately after upload/replacement.
 */
export function getSupabaseImageUrl(scientificName: string): string {
  const slug = toSlug(scientificName)
  return `${SUPABASE_URL}/storage/v1/object/public/bird-images/${slug}.jpg`
}

/**
 * Convert a scientific name to its image slug.
 */
export function toSlug(scientificName: string): string {
  return scientificName.toLowerCase().replace(/\s+/g, '-')
}
