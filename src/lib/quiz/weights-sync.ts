/**
 * Sync spaced-repetition weights between localStorage and Supabase
 * for authenticated users.
 */

import { createClient } from '@/lib/supabase/client'
import type { Weights } from './spaced-repetition'
import type { Bird } from '@/lib/supabase/types'

/**
 * Load weights from user_bird_weights table for an authenticated user.
 */
export async function loadWeightsFromDB(userId: string, birds: Bird[]): Promise<Weights> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_bird_weights')
      .select('bird_id, weight')
      .eq('user_id', userId)

    if (error || !data) return {}

    const birdById = new Map(birds.map(b => [b.id, b.scientific_name]))
    const weights: Weights = {}
    for (const row of data) {
      const sci = birdById.get(row.bird_id)
      if (sci) weights[sci] = row.weight
    }
    return weights
  } catch {
    return {}
  }
}
