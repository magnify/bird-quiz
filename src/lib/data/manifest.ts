export interface ManifestEntry {
  file: string
  source?: string
  attribution?: string
  license?: string
  source_url?: string
  needsReview?: boolean
}

export type Manifest = Map<string, ManifestEntry>

/**
 * Build a display credit string from a manifest entry: "Attribution · LICENSE".
 * Returns null when there's nothing to show. Deliberately omits the bird name —
 * callers render this over photos where the name would be a quiz spoiler.
 */
export function formatAttribution(entry: ManifestEntry | undefined): string | null {
  if (!entry) return null
  const parts: string[] = []
  if (entry.attribution) parts.push(entry.attribution)
  if (entry.license) parts.push(entry.license.toUpperCase())
  return parts.length ? parts.join(' · ') : null
}

const MANIFEST_URL = '/api/images/manifest.json'

let cached: Manifest | null = null
let inflight: Promise<Manifest> | null = null

export async function fetchManifest(): Promise<Manifest> {
  if (cached) return cached
  if (inflight) return inflight

  inflight = fetch(MANIFEST_URL, { cache: 'force-cache' })
    .then(async (res) => {
      if (!res.ok) return new Map<string, ManifestEntry>()
      const json = (await res.json()) as Record<string, ManifestEntry>
      return new Map(Object.entries(json))
    })
    .catch(() => new Map<string, ManifestEntry>())
    .then((map) => {
      cached = map
      inflight = null
      return map
    })

  return inflight
}
