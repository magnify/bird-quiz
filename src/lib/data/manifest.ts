export interface ManifestEntry {
  file: string
  source?: string
  attribution?: string
  license?: string
  source_url?: string
}

export type Manifest = Map<string, ManifestEntry>

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const MANIFEST_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/bird-images/manifest.json`
  : null

let cached: Manifest | null = null
let inflight: Promise<Manifest> | null = null

export async function fetchManifest(): Promise<Manifest> {
  if (cached) return cached
  if (inflight) return inflight

  if (!MANIFEST_URL) {
    cached = new Map()
    return cached
  }

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
