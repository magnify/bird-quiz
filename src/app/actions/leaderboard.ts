'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface LeaderboardEntry {
  id: string
  guest_name: string | null
  points: number | null
  score: number | null
  question_count: number
  difficulty: string
  mode: string
  completed_at: string | null
}

export async function getLeaderboard(params: {
  difficulty: string | null
  mode: string | null
  period: 'all' | 'week' | 'month'
  limit?: number
}): Promise<LeaderboardEntry[]> {
  try {
    const supabase = createServiceClient()
    let query = supabase
      .from('quiz_sessions')
      .select('id, guest_name, points, score, question_count, difficulty, mode, completed_at')
      .eq('completed', true)
      .not('points', 'is', null)
      .order('points', { ascending: false })
      .limit(params.limit ?? 50)

    if (params.difficulty && params.difficulty !== 'all') {
      query = query.eq('difficulty', params.difficulty)
    }

    if (params.mode && params.mode !== 'all') {
      query = query.eq('mode', params.mode)
    }

    if (params.period === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('completed_at', weekAgo)
    } else if (params.period === 'month') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('completed_at', monthAgo)
    }

    const { data, error } = await query

    if (error) {
      console.error('Leaderboard query failed:', error.message)
      return []
    }

    return data || []
  } catch {
    return []
  }
}
