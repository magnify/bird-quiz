const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

/**
 * Get the URL for a bird image served from Netlify's public directory.
 * Images are cached by Netlify CDN for fast, reliable delivery.
 */
export function getBirdImageUrl(scientificName: string): string {
  const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
  return `/images/birds/${slug}.jpg`
}

/**
 * Convert a scientific name to its image slug.
 */
export function toSlug(scientificName: string): string {
  return scientificName.toLowerCase().replace(/\s+/g, '-')
}
