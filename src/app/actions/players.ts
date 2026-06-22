'use server'

import { createServiceClient } from '@/lib/supabase/server'
import {
  breakdown, sessionsPerDay as dailyCounts, hourly as hourlyCounts,
  birdStatsFromAnswers, missedBirds,
} from '@/lib/admin/aggregate'
import type { PlayerSummary, PlayerDetail } from '@/lib/admin/player-stats'

const SESSION_SAMPLE = 1000
const ANSWER_SAMPLE = 5000
// PostgREST `in` filters live in the URL; cap session ids joined to answers so
// the request stays well under URL-length limits for very active players.
const ANSWER_SESSION_CAP = 300
const TREND_DAYS = 30

/** Ranked list of the most active players in the window (grouped by guest_id). */
export async function getActivePlayers(rangeDays: number | null): Promise<PlayerSummary[]> {
  try {
    const supabase = createServiceClient()
    const since = rangeDays ? new Date(Date.now() - rangeDays * 86_400_000).toISOString() : null
    let q = supabase
      .from('quiz_sessions')
      .select('guest_id, guest_name, score, points, question_count, completed, created_at, country, device_type')
      .not('guest_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(SESSION_SAMPLE)
    if (since) q = q.gte('created_at', since)
    const { data, error } = await q
    if (error) {
      console.error('getActivePlayers failed:', error.message)
      return []
    }

    const byGuest = new Map<string, PlayerSummary>()
    for (const s of data ?? []) {
      const id = s.guest_id as string
      const p = byGuest.get(id) ?? {
        guestId: id, guestName: null, sessions: 0, completed: 0,
        totalPoints: 0, bestScorePct: null, lastSeen: s.created_at, country: null, device: null,
      }
      p.sessions++
      if (s.completed) p.completed++
      if (s.points) p.totalPoints += s.points
      if (s.guest_name && !p.guestName) p.guestName = s.guest_name
      const pct = s.score !== null && s.question_count > 0 ? Math.round((s.score / s.question_count) * 100) : null
      if (pct !== null && (p.bestScorePct === null || pct > p.bestScorePct)) p.bestScorePct = pct
      if (s.created_at > p.lastSeen) p.lastSeen = s.created_at
      if (!p.country && s.country) p.country = s.country
      if (!p.device && s.device_type) p.device = s.device_type
      byGuest.set(id, p)
    }

    return [...byGuest.values()]
      .sort((a, b) => b.sessions - a.sessions || b.totalPoints - a.totalPoints)
      .slice(0, 50)
  } catch (e) {
    console.error('getActivePlayers failed:', e)
    return []
  }
}

function emptyDetail(guestId: string): PlayerDetail {
  return {
    found: false, guestId, guestName: null,
    firstSeen: null, lastSeen: null, daysActive: 0, longestStreak: 0,
    totalSessions: 0, completedSessions: 0, completionRate: 0, sessionsPerDay: [],
    avgScore: null, bestScore: null, totalPoints: 0, avgPoints: null, avgResponseMs: null,
    hardestBirds: [], missedBirds: [], confusions: [],
    country: null, devices: [], difficultyBreakdown: [], modeBreakdown: [], hourly: [],
  }
}

/** Longest run of consecutive calendar days from a set of YYYY-MM-DD strings. */
function longestStreak(days: string[]): number {
  if (days.length === 0) return 0
  const sorted = [...days].sort()
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T00:00:00Z`).getTime()
    const cur = new Date(`${sorted[i]}T00:00:00Z`).getTime()
    if (cur - prev === 86_400_000) {
      run++
      longest = Math.max(longest, run)
    } else {
      run = 1
    }
  }
  return longest
}

/** Full per-player breakdown across activity, performance, birds and context. */
export async function getPlayerDetail(guestId: string): Promise<PlayerDetail> {
  try {
    const supabase = createServiceClient()
    const { data: sessions, error } = await supabase
      .from('quiz_sessions')
      .select('id, guest_name, difficulty, mode, score, points, question_count, duration_ms, completed, created_at, country, device_type')
      .eq('guest_id', guestId)
      .order('created_at', { ascending: false })
      .limit(SESSION_SAMPLE)
    if (error) {
      console.error('getPlayerDetail sessions failed:', error.message)
      return emptyDetail(guestId)
    }
    if (!sessions || sessions.length === 0) return emptyDetail(guestId)

    const completed = sessions.filter(s => s.completed)
    const created = sessions.map(s => s.created_at)
    const firstSeen = created.reduce((a, b) => (a < b ? a : b))
    const lastSeen = created.reduce((a, b) => (a > b ? a : b))
    const days = [...new Set(created.map(c => c.slice(0, 10)))]

    const scorePcts = completed
      .filter(s => s.score !== null && s.question_count > 0)
      .map(s => (s.score! / s.question_count) * 100)
    const avgScore = scorePcts.length ? Math.round(scorePcts.reduce((a, b) => a + b, 0) / scorePcts.length) : null
    const bestScore = scorePcts.length ? Math.round(Math.max(...scorePcts)) : null
    const pts = completed.filter(s => s.points !== null).map(s => s.points!)
    const totalPoints = pts.reduce((a, b) => a + b, 0)
    const avgPoints = pts.length ? Math.round(totalPoints / pts.length) : null

    // Answers across this player's (recent) sessions
    const ids = sessions.slice(0, ANSWER_SESSION_CAP).map(s => s.id)
    const { data: answers } = await supabase
      .from('quiz_answers')
      .select('bird_id, chosen_bird_id, is_correct, response_time_ms')
      .in('session_id', ids)
      .limit(ANSWER_SAMPLE)
    const ans = answers ?? []
    const { hardestBirds, confusions } = birdStatsFromAnswers(ans, { minShown: 2, limit: 8 })
    const rts = ans.filter(a => a.response_time_ms !== null).map(a => a.response_time_ms!)
    const avgResponseMs = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : null

    return {
      found: true,
      guestId,
      guestName: sessions.find(s => s.guest_name)?.guest_name ?? null,
      firstSeen,
      lastSeen,
      daysActive: days.length,
      longestStreak: longestStreak(days),
      totalSessions: sessions.length,
      completedSessions: completed.length,
      completionRate: sessions.length ? Math.round((completed.length / sessions.length) * 100) : 0,
      sessionsPerDay: dailyCounts(created, TREND_DAYS),
      avgScore,
      bestScore,
      totalPoints,
      avgPoints,
      avgResponseMs,
      hardestBirds,
      missedBirds: missedBirds(ans, 8),
      confusions,
      country: sessions.find(s => s.country)?.country ?? null,
      devices: breakdown(sessions.filter(s => s.device_type).map(s => s.device_type as string)),
      difficultyBreakdown: breakdown(sessions.map(s => s.difficulty)),
      modeBreakdown: breakdown(sessions.map(s => s.mode)),
      hourly: hourlyCounts(created),
    }
  } catch (e) {
    console.error('getPlayerDetail failed:', e)
    return emptyDetail(guestId)
  }
}
