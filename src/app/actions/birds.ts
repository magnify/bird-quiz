'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function flagBirdImage(birdId: string, reason: string): Promise<void> {
  try {
    const supabase = createServiceClient()
    // Check if bird_images row exists
    const { data: existing } = await supabase
      .from('bird_images')
      .select('id')
      .eq('bird_id', birdId)
      .eq('is_primary', true)
      .single()

    if (existing) {
      await supabase
        .from('bird_images')
        .update({ flag_reason: reason, status: 'flagged' })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('bird_images')
        .insert({
          bird_id: birdId,
          source: 'inaturalist',
          status: 'flagged',
          is_primary: true,
          flag_reason: reason,
        })
    }
  } catch {
    // Non-blocking
  }
}

export async function unflagBirdImage(birdId: string): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase
      .from('bird_images')
      .update({ flag_reason: null, status: 'approved' })
      .eq('bird_id', birdId)
      .eq('is_primary', true)
  } catch {
    // Non-blocking
  }
}

export async function getFlaggedBirdIds(): Promise<Set<string>> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('bird_images')
      .select('bird_id')
      .eq('status', 'flagged')

    return new Set(data?.map(r => r.bird_id) || [])
  } catch {
    return new Set()
  }
}
