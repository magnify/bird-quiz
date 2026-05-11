export interface ManifestEntry {
  file: string
  source?: string
  attribution?: string
  license?: string
  source_url?: string
}

export type Manifest = Map<string, ManifestEntry>

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
