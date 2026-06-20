import { toSlug } from '@/lib/images'

/** Cache-Tag attached to a bird's public image response, so it can be purged. */
export function birdImageTag(scientificName: string): string {
  return `bird-${toSlug(scientificName)}`
}

/**
 * Purge the public CDN cache for one bird image after its bytes change
 * (crop / replace / restore), so quiz players see the new image immediately
 * instead of waiting out the 1-year cache. No-ops outside the Netlify runtime
 * (e.g. local dev), so it's always safe to await.
 */
export async function purgeBirdImage(scientificName: string): Promise<void> {
  try {
    const { purgeCache } = await import('@netlify/functions')
    await purgeCache({ tags: [birdImageTag(scientificName)] })
  } catch {
    // Not running on Netlify (local dev) or purge unavailable — ignore.
  }
}
