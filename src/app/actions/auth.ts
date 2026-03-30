'use server'

import { createServiceClient } from '@/lib/supabase/server'

/**
 * Migrate guest quiz data to an authenticated user.
 * Updates quiz_sessions with matching guest_id to the new user_id.
 */
export async function migrateGuestData(guestId: string, userId: string): Promise<{ migrated: number }> {
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('quiz_sessions')
      .update({ user_id: userId })
      .eq('guest_id', guestId)
      .is('user_id', null)
      .select('id')

    if (error) {
      console.error('Guest migration failed:', error.message)
      return { migrated: 0 }
    }

    return { migrated: data?.length ?? 0 }
  } catch {
    return { migrated: 0 }
  }
}

/**
 * Sync localStorage weights to user_bird_weights table.
 */
export async function syncWeights(
  userId: string,
  weights: Record<string, number>,
  birdIdBySci: Record<string, string>
): Promise<void> {
  try {
    const supabase = createServiceClient()

    const rows = Object.entries(weights)
      .filter(([sci]) => birdIdBySci[sci])
      .map(([sci, weight]) => ({
        user_id: userId,
        bird_id: birdIdBySci[sci],
        weight,
      }))

    if (rows.length === 0) return

    await supabase
      .from('user_bird_weights')
      .upsert(rows, { onConflict: 'user_id,bird_id' })
  } catch {
    // Non-blocking
  }
}
