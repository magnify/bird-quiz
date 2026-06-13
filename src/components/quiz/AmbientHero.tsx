'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchManifest, type Manifest } from '@/lib/data/manifest'
import { pickHeroNames } from '@/lib/quiz/hero-birds'
import { BirdHero } from './BirdHero'

const AMBIENT_POOL_SIZE = 5

/**
 * Self-contained ambient version of the photo backdrop for the content pages
 * (/om, /resultater). Picks hero names straight from the allowlist (no Bird[]
 * needed) and fetches the manifest for the corner credit. Rendered once by the
 * shared content layout so it persists across client-side navigations.
 */
export function AmbientHero() {
  const [manifest, setManifest] = useState<Manifest>(new Map())
  useEffect(() => {
    fetchManifest().then(setManifest)
  }, [])

  const heroNames = useMemo(() => pickHeroNames(AMBIENT_POOL_SIZE), [])

  return <BirdHero heroNames={heroNames} manifest={manifest} variant="ambient" />
}
