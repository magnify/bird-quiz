'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface AdminStats {
  totalSessions: number
  completedSessions: number
  totalPlayers: number
  avgScore: number | null
  avgPoints: number | null
  recentSessions: {
    id: string
    guest_name: string | null
    difficulty: string
    score: number | null
    points: number | null
    question_count: number
    completed_at: string | null
  }[]
  hardestBirds: {
    bird_id: string
    bird_name_da: string
    scientific_name: string
    times_shown: number
    times_correct: number
    accuracy: number
  }[]
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createServiceClient()

  // Total sessions
  const { count: totalSessions } = await supabase
    .from('quiz_sessions')
    .select('*', { count: 'exact', head: true })

  // Completed sessions
  const { count: completedSessions } = await supabase
    .from('quiz_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('completed', true)

  // Unique players (by guest_id)
  const { data: uniqueGuests } = await supabase
    .from('quiz_sessions')
    .select('guest_id')
    .not('guest_id', 'is', null)

  const uniqueGuestIds = new Set(uniqueGuests?.map(g => g.guest_id))

  // Average score and points for completed sessions
  const { data: completedData } = await supabase
    .from('quiz_sessions')
    .select('score, question_count, points')
    .eq('completed', true)

  let avgScore: number | null = null
  let avgPoints: number | null = null
  if (completedData?.length) {
    const scores = completedData
      .filter(s => s.score !== null && s.question_count > 0)
      .map(s => (s.score! / s.question_count) * 100)
    if (scores.length) avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

    const pts = completedData.filter(s => s.points !== null).map(s => s.points!)
    if (pts.length) avgPoints = Math.round(pts.reduce((a, b) => a + b, 0) / pts.length)
  }

  // Recent sessions
  const { data: recentSessions } = await supabase
    .from('quiz_sessions')
    .select('id, guest_name, difficulty, score, points, question_count, completed_at')
    .eq('completed', true)
    .order('completed_at', { ascending: false })
    .limit(10)

  // Hardest birds from bird_difficulty_stats
  const { data: statsData } = await supabase
    .from('bird_difficulty_stats')
    .select('bird_id, times_shown, times_correct')
    .gt('times_shown', 4) // only birds shown at least 5 times
    .order('difficulty_score', { ascending: false })
    .limit(10)

  let hardestBirds: AdminStats['hardestBirds'] = []
  if (statsData?.length) {
    const birdIds = statsData.map(s => s.bird_id)
    const { data: birds } = await supabase
      .from('birds')
      .select('id, name_da, scientific_name')
      .in('id', birdIds)

    const birdMap = new Map(birds?.map(b => [b.id, b]) || [])
    hardestBirds = statsData
      .map(s => {
        const bird = birdMap.get(s.bird_id)
        if (!bird) return null
        return {
          bird_id: s.bird_id,
          bird_name_da: bird.name_da,
          scientific_name: bird.scientific_name,
          times_shown: s.times_shown,
          times_correct: s.times_correct,
          accuracy: s.times_shown > 0 ? Math.round((s.times_correct / s.times_shown) * 100) : 0,
        }
      })
      .filter((b): b is NonNullable<typeof b> => b !== null)
  }

  return {
    totalSessions: totalSessions ?? 0,
    completedSessions: completedSessions ?? 0,
    totalPlayers: uniqueGuestIds.size,
    avgScore,
    avgPoints,
    recentSessions: recentSessions ?? [],
    hardestBirds,
  }
}
