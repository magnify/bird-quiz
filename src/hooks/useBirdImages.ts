'use client'

import { useState, useCallback } from 'react'
import type { Bird } from '@/lib/supabase/types'
import { getBirdImageUrl } from '@/lib/images'

/**
 * Hook for managing bird image URLs.
 * All 221 birds have images in Supabase Storage (public bucket).
 */
export function useBirdImages() {
  const [imageUrls, setImageUrls] = useState<Map<string, string | null>>(
    () => new Map()
  )

  /**
   * Ensure image URLs are populated for a set of birds.
   */
  const ensureImages = useCallback((birds: Bird[]) => {
    setImageUrls(prev => {
      let changed = false
      const next = new Map(prev)
      for (const bird of birds) {
        if (!next.has(bird.id)) {
          next.set(bird.id, getBirdImageUrl(bird.scientific_name))
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [])

  return { imageUrls, ensureImages }
}
