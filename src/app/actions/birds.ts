'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function flagBirdImage(birdId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceClient()
  const { data: existing, error: selErr } = await supabase
    .from('bird_images')
    .select('id')
    .eq('bird_id', birdId)
    .eq('is_primary', true)
    .maybeSingle()

  if (selErr) return { ok: false, error: selErr.message }

  if (existing) {
    const { error } = await supabase
      .from('bird_images')
      .update({ flag_reason: reason, status: 'flagged' })
      .eq('id', existing.id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('bird_images')
      .insert({
        bird_id: birdId,
        source: 'inaturalist',
        status: 'flagged',
        is_primary: true,
        flag_reason: reason,
      })
    if (error) return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function unflagBirdImage(birdId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('bird_images')
    .update({ flag_reason: null, status: 'approved' })
    .eq('bird_id', birdId)
    .eq('is_primary', true)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getFlaggedBirdIds(): Promise<Set<string>> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('bird_images')
    .select('bird_id')
    .eq('status', 'flagged')
  return new Set(data?.map(r => r.bird_id) || [])
}
