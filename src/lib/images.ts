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
 * Image URL for admin tools. Always hits the API proxy with `nocache=1`, which
 * makes the route respond `no-store` so admins never see a stale image after a
 * crop/replace. An optional `version` token forces the <img> to refetch when the
 * underlying image changes (the browser only re-requests when the src changes).
 */
export function getAdminImageUrl(scientificName: string, version?: string | number): string {
  const slug = toSlug(scientificName)
  const v = version === undefined ? '' : `&v=${version}`
  return `/api/images/${slug}?nocache=1${v}`
}

/**
 * Convert a scientific name to its image slug.
 */
export function toSlug(scientificName: string): string {
  return scientificName.toLowerCase().replace(/\s+/g, '-')
}
