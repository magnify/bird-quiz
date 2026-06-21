'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { STATIC_BIRDS } from '@/lib/data/birds-static'

const ACTIVE_WINDOW_MIN = 15
const TREND_DAYS = 14
// Recent-session window the JS aggregates run over. Supabase caps a single
// select at ~1000 rows; headline totals use exact COUNT queries, while the
// breakdowns/averages/trend below are over the most recent SESSION_SAMPLE
// sessions. Move these to a SQL view/RPC if the table grows past that.
const SESSION_SAMPLE = 1000

export interface SessionRow {
  id: string
  guest_name: string | null
  difficulty: string
  mode: string
  score: number | null
  points: number | null
  question_count: number
  completed_at: string | null
  created_at: string
}

export interface AdminStats {
  totalSessions: number
  completedSessions: number
  activeSessions: number
  completionRate: number
  totalPlayers: number
  returningPlayers: number
  avgScore: number | null
  avgPoints: number | null
  avgQuestions: number | null
  avgDurationMs: number | null
  sessionsPerDay: { date: string; count: number }[]
  difficultyBreakdown: { key: string; count: number }[]
  modeBreakdown: { key: string; count: number }[]
  recentSessions: SessionRow[]
  topSessions: SessionRow[]
  hardestBirds: {
    bird_id: string
    bird_name_da: string
    scientific_name: string
    times_shown: number
    times_correct: number
    accuracy: number
  }[]
  confusions: { actualName: string; chosenName: string; count: number }[]
}

const birdById = new Map(STATIC_BIRDS.map(b => [b.id, b]))

function breakdown(rows: { key: string }[]): { key: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.key, (counts.get(r.key) ?? 0) + 1)
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createServiceClient()
  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MIN * 60_000).toISOString()

  // --- Headline totals (exact counts, unaffected by the row cap) ---
  const [{ count: totalSessions }, { count: completedSessions }, { count: activeSessions }] =
    await Promise.all([
      supabase.from('quiz_sessions').select('*', { count: 'exact', head: true }),
      supabase.from('quiz_sessions').select('*', { count: 'exact', head: true }).eq('completed', true),
      supabase
        .from('quiz_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('completed', false)
        .gt('created_at', activeSince),
    ])

  // --- Recent sessions sample for the JS aggregates ---
  const { data: sample } = await supabase
    .from('quiz_sessions')
    .select('id, guest_id, guest_name, difficulty, mode, question_count, duration_ms, score, points, completed, created_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(SESSION_SAMPLE)

  const rows = sample ?? []
  const completed = rows.filter(r => r.completed)

  // Players
  const guestCounts = new Map<string, number>()
  for (const r of rows) if (r.guest_id) guestCounts.set(r.guest_id, (guestCounts.get(r.guest_id) ?? 0) + 1)
  const totalPlayers = guestCounts.size
  const returningPlayers = [...guestCounts.values()].filter(c => c >= 2).length

  // Averages
  const scorePcts = completed
    .filter(s => s.score !== null && s.question_count > 0)
    .map(s => (s.score! / s.question_count) * 100)
  const avgScore = scorePcts.length ? Math.round(scorePcts.reduce((a, b) => a + b, 0) / scorePcts.length) : null
  const pts = completed.filter(s => s.points !== null).map(s => s.points!)
  const avgPoints = pts.length ? Math.round(pts.reduce((a, b) => a + b, 0) / pts.length) : null
  const avgQuestions = rows.length
    ? Math.round(rows.reduce((a, b) => a + b.question_count, 0) / rows.length)
    : null
  const durations = completed.filter(s => s.duration_ms !== null).map(s => s.duration_ms!)
  const avgDurationMs = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null

  // Sessions per day (last TREND_DAYS, incl. zero days)
  const dayCounts = new Map<string, number>()
  for (const r of rows) {
    const d = r.created_at.slice(0, 10)
    dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1)
  }
  const sessionsPerDay: { date: string; count: number }[] = []
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
    sessionsPerDay.push({ date: d, count: dayCounts.get(d) ?? 0 })
  }

  // Breakdowns
  const difficultyBreakdown = breakdown(rows.map(r => ({ key: r.difficulty })))
  const modeBreakdown = breakdown(rows.map(r => ({ key: r.mode })))

  const toRow = (s: typeof rows[number]): SessionRow => ({
    id: s.id,
    guest_name: s.guest_name,
    difficulty: s.difficulty,
    mode: s.mode,
    score: s.score,
    points: s.points,
    question_count: s.question_count,
    completed_at: s.completed_at,
    created_at: s.created_at,
  })
  const recentSessions = completed.slice(0, 10).map(toRow)
  const topSessions = [...completed]
    .filter(s => s.points !== null)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, 10)
    .map(toRow)

  // Hardest birds (materialized difficulty stats)
  const { data: statsData } = await supabase
    .from('bird_difficulty_stats')
    .select('bird_id, times_shown, times_correct')
    .gt('times_shown', 4)
    .order('difficulty_score', { ascending: false })
    .limit(10)

  const hardestBirds: AdminStats['hardestBirds'] = (statsData ?? [])
    .map(s => {
      const bird = birdById.get(s.bird_id)
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

  // Confusions: which bird people pick when wrong (actual → chosen)
  const { data: wrong } = await supabase
    .from('quiz_answers')
    .select('bird_id, chosen_bird_id')
    .eq('is_correct', false)
    .not('chosen_bird_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5000)

  const pairCounts = new Map<string, number>()
  for (const a of wrong ?? []) {
    if (!a.chosen_bird_id) continue
    const k = `${a.bird_id}|${a.chosen_bird_id}`
    pairCounts.set(k, (pairCounts.get(k) ?? 0) + 1)
  }
  const confusions = [...pairCounts.entries()]
    .map(([k, count]) => {
      const [actualId, chosenId] = k.split('|')
      const actual = birdById.get(actualId)
      const chosen = birdById.get(chosenId)
      if (!actual || !chosen) return null
      return { actualName: actual.name_da, chosenName: chosen.name_da, count }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalSessions: totalSessions ?? 0,
    completedSessions: completedSessions ?? 0,
    activeSessions: activeSessions ?? 0,
    completionRate: totalSessions ? Math.round(((completedSessions ?? 0) / totalSessions) * 100) : 0,
    totalPlayers,
    returningPlayers,
    avgScore,
    avgPoints,
    avgQuestions,
    avgDurationMs,
    sessionsPerDay,
    difficultyBreakdown,
    modeBreakdown,
    recentSessions,
    topSessions,
    hardestBirds,
    confusions,
  }
}
