const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

/**
 * Get the public Supabase Storage URL for a bird image.
 * Public bucket = no auth needed for reads.
 */
export function getBirdImageUrl(scientificName: string): string {
  const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
  return `${SUPABASE_URL}/storage/v1/object/public/bird-images/${slug}.jpg`
}

/**
 * Convert a scientific name to its image slug.
 */
export function toSlug(scientificName: string): string {
  return scientificName.toLowerCase().replace(/\s+/g, '-')
}
