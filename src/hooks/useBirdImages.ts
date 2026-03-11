'use client'

import { useState, useCallback } from 'react'
import type { Bird } from '@/lib/supabase/types'

/**
 * Resolve a local image path for a bird.
 * Images are stored at /images/birds/{slug}.jpg where slug is the
 * lowercased scientific name with spaces replaced by hyphens.
 */
function getLocalImageUrl(scientificName: string): string {
  const slug = scientificName.toLowerCase().replace(/\s+/g, '-')
  return `/images/birds/${slug}.jpg`
}

/**
 * Hook for managing bird image URLs.
 * All 221 birds have local images downloaded from iNaturalist (CC-licensed).
 * Resolves instantly from /images/birds/ — no network fetches needed.
 */
export function useBirdImages() {
  const [imageUrls, setImageUrls] = useState<Map<string, string | null>>(
    () => new Map()
  )

  /**
   * Ensure image URLs are populated for a set of birds.
   * Resolves from local files — instant, no async needed.
   */
  const ensureImages = useCallback((birds: Bird[]) => {
    setImageUrls(prev => {
      let changed = false
      const next = new Map(prev)
      for (const bird of birds) {
        if (!next.has(bird.id)) {
          next.set(bird.id, getLocalImageUrl(bird.scientific_name))
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [])

  return { imageUrls, ensureImages }
}
