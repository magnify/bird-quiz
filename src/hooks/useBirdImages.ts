'use client'

import { useState, useCallback, useRef } from 'react'
import type { Bird, BirdImage } from '@/lib/supabase/types'
import { getImageUrl } from '@/lib/images/storage'
import { fetchBirdImageFromWikipedia } from '@/lib/images/storage'

/**
 * Hook for managing bird image URLs.
 * Resolves images from database (BirdImage records) or falls back
 * to Wikipedia/Commons for birds without stored images.
 */
export function useBirdImages(birdImages: BirdImage[]) {
  const [imageUrls, setImageUrls] = useState<Map<string, string | null>>(() => {
    // Pre-populate from database images
    const map = new Map<string, string | null>()
    for (const img of birdImages) {
      if (img.is_primary && (img.status === 'approved' || img.status === 'pending')) {
        const url = getImageUrl(img)
        if (url) map.set(img.bird_id, url)
      }
    }
    return map
  })

  const fetchingRef = useRef(new Set<string>())

  /**
   * Ensure image URLs are loaded for a set of birds.
   * If a bird has no database image, fetches from Wikipedia.
   */
  const ensureImages = useCallback(async (birds: Bird[]) => {
    const toFetch: Bird[] = []
    for (const bird of birds) {
      if (!imageUrls.has(bird.id) && !fetchingRef.current.has(bird.id)) {
        toFetch.push(bird)
        fetchingRef.current.add(bird.id)
      }
    }

    if (toFetch.length === 0) return

    const results = await Promise.all(
      toFetch.map(async bird => {
        const url = await fetchBirdImageFromWikipedia(bird.scientific_name)
        return { birdId: bird.id, url }
      })
    )

    setImageUrls(prev => {
      const next = new Map(prev)
      for (const { birdId, url } of results) {
        next.set(birdId, url)
        fetchingRef.current.delete(birdId)
      }
      return next
    })
  }, [imageUrls])

  return { imageUrls, ensureImages }
}
