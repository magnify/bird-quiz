'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { STATIC_BIRDS } from '@/lib/data/birds-static'
import { DEFAULT_RANGE, rangeDaysFor, type AdminStats, type SessionRow } from '@/lib/admin/analytics'

const ACTIVE_WINDOW_MIN = 15
const MAX_TREND_DAYS = 30
// Single selects are capped ~1000 rows by PostgREST; headline totals use exact
// COUNT queries, the rest aggregate over these recent samples. Move to a SQL
// view/RPC if the tables grow past this.
const SESSION_SAMPLE = 1000
const ANSWER_SAMPLE = 10000

const birdById = new Map(STATIC_BIRDS.map(b => [b.id, b]))

function breakdown(rows: { key: string }[]): { key: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.key, (counts.get(r.key) ?? 0) + 1)
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}

function offlineStats(error: string): AdminStats {
  return {
    healthy: false, error,
    totalSessions: 0, completedSessions: 0, activeSessions: 0, completionRate: 0,
    totalPlayers: 0, returningPlayers: 0,
    avgScore: null, avgPoints: null, avgQuestions: null, avgDurationMs: null,
    sessionsPerDay: [], difficultyBreakdown: [], modeBreakdown: [],
    topCountries: [], deviceBreakdown: [], hourly: [],
    recentSessions: [], topSessions: [], hardestBirds: [], confusions: [],
  }
}

export async function getAdminStats(rangeDays: number | null = rangeDaysFor(DEFAULT_RANGE)): Promise<AdminStats> {
  const supabase = createServiceClient()
  const since = rangeDays ? new Date(Date.now() - rangeDays * 86_400_000).toISOString() : null
  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MIN * 60_000).toISOString()

  // --- Headline totals + health probe (exact counts, range-scoped) ---
  let totalSessions: number | null = 0
  let completedSessions: number | null = 0
  let activeSessions: number | null = 0
  try {
    let totalQ = supabase.from('quiz_sessions').select('*', { count: 'exact', head: true })
    let completedQ = supabase.from('quiz_sessions').select('*', { count: 'exact', head: true }).eq('completed', true)
    if (since) { totalQ = totalQ.gte('created_at', since); completedQ = completedQ.gte('created_at', since) }
    const activeQ = supabase
      .from('quiz_sessions').select('*', { count: 'exact', head: true })
      .eq('completed', false).gt('created_at', activeSince)
    const [t, c, a] = await Promise.all([totalQ, completedQ, activeQ])
    if (t.error) return offlineStats(t.error.message)
    totalSessions = t.count
    completedSessions = c.count
    activeSessions = a.count
  } catch (e) {
    return offlineStats(e instanceof Error ? e.message : 'Databasen kan ikke nås')
  }

  // --- Session sample for JS aggregates ---
  let sampleQ = supabase
    .from('quiz_sessions')
    .select('id, guest_id, guest_name, difficulty, mode, question_count, duration_ms, score, points, completed, created_at, completed_at, country, device_type')
    .order('created_at', { ascending: false })
    .limit(SESSION_SAMPLE)
  if (since) sampleQ = sampleQ.gte('created_at', since)
  const { data: sample, error: sampleErr } = await sampleQ
  if (sampleErr) console.error('Session sample query failed:', sampleErr.message)
  const rows = sample ?? []
  const completed = rows.filter(r => r.completed)

  const guestCounts = new Map<string, number>()
  for (const r of rows) if (r.guest_id) guestCounts.set(r.guest_id, (guestCounts.get(r.guest_id) ?? 0) + 1)
  const totalPlayers = guestCounts.size
  const returningPlayers = [...guestCounts.values()].filter(c => c >= 2).length

  const scorePcts = completed.filter(s => s.score !== null && s.question_count > 0).map(s => (s.score! / s.question_count) * 100)
  const avgScore = scorePcts.length ? Math.round(scorePcts.reduce((a, b) => a + b, 0) / scorePcts.length) : null
  const pts = completed.filter(s => s.points !== null).map(s => s.points!)
  const avgPoints = pts.length ? Math.round(pts.reduce((a, b) => a + b, 0) / pts.length) : null
  const avgQuestions = rows.length ? Math.round(rows.reduce((a, b) => a + b.question_count, 0) / rows.length) : null
  const durations = completed.filter(s => s.duration_ms !== null).map(s => s.duration_ms!)
  const avgDurationMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null

  // Sessions per day, length scaled to the range (capped)
  const trendDays = Math.min(rangeDays ?? MAX_TREND_DAYS, MAX_TREND_DAYS)
  const dayCounts = new Map<string, number>()
  for (const r of rows) dayCounts.set(r.created_at.slice(0, 10), (dayCounts.get(r.created_at.slice(0, 10)) ?? 0) + 1)
  const sessionsPerDay: { date: string; count: number }[] = []
  for (let i = trendDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
    sessionsPerDay.push({ date: d, count: dayCounts.get(d) ?? 0 })
  }

  const difficultyBreakdown = breakdown(rows.map(r => ({ key: r.difficulty })))
  const modeBreakdown = breakdown(rows.map(r => ({ key: r.mode })))

  const topCountries = breakdown(rows.filter(r => r.country).map(r => ({ key: r.country as string })))
    .map(({ key, count }) => ({ country: key, count }))
    .slice(0, 8)
  const deviceBreakdown = breakdown(rows.filter(r => r.device_type).map(r => ({ key: r.device_type as string })))

  // Hour-of-day histogram in Europe/Copenhagen (audience is Danish; created_at is UTC)
  const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', hour: '2-digit', hour12: false })
  const hourCounts = new Array(24).fill(0)
  for (const r of rows) {
    const h = Number(hourFmt.format(new Date(r.created_at))) % 24
    if (!Number.isNaN(h)) hourCounts[h]++
  }
  const hourly = hourCounts.map((count, hour) => ({ hour, count }))

  const toRow = (s: typeof rows[number]): SessionRow => ({
    id: s.id, guest_name: s.guest_name, guest_id: s.guest_id, difficulty: s.difficulty, mode: s.mode,
    score: s.score, points: s.points, question_count: s.question_count,
    completed_at: s.completed_at, created_at: s.created_at,
  })
  const recentSessions = completed.slice(0, 10).map(toRow)
  const topSessions = [...completed]
    .filter(s => s.points !== null)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, 10).map(toRow)

  // --- Hardest birds + confusions, computed from in-range answers ---
  let answersQ = supabase
    .from('quiz_answers')
    .select('bird_id, chosen_bird_id, is_correct')
    .order('created_at', { ascending: false })
    .limit(ANSWER_SAMPLE)
  if (since) answersQ = answersQ.gte('created_at', since)
  const { data: answers } = await answersQ

  const perBird = new Map<string, { shown: number; correct: number }>()
  const pairCounts = new Map<string, number>()
  for (const a of answers ?? []) {
    const stat = perBird.get(a.bird_id) ?? { shown: 0, correct: 0 }
    stat.shown++
    if (a.is_correct) stat.correct++
    perBird.set(a.bird_id, stat)
    if (!a.is_correct && a.chosen_bird_id) {
      const k = `${a.bird_id}|${a.chosen_bird_id}`
      pairCounts.set(k, (pairCounts.get(k) ?? 0) + 1)
    }
  }

  const hardestBirds = [...perBird.entries()]
    .filter(([, s]) => s.shown >= 5)
    .map(([bird_id, s]) => {
      const bird = birdById.get(bird_id)
      if (!bird) return null
      return {
        bird_id, bird_name_da: bird.name_da, scientific_name: bird.scientific_name,
        times_shown: s.shown, times_correct: s.correct,
        accuracy: Math.round((s.correct / s.shown) * 100),
      }
    })
    .filter((b): b is NonNullable<typeof b> => b !== null)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 10)

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
    healthy: true,
    totalSessions: totalSessions ?? 0,
    completedSessions: completedSessions ?? 0,
    activeSessions: activeSessions ?? 0,
    completionRate: totalSessions ? Math.round(((completedSessions ?? 0) / totalSessions) * 100) : 0,
    totalPlayers,
    returningPlayers,
    avgScore, avgPoints, avgQuestions, avgDurationMs,
    sessionsPerDay, difficultyBreakdown, modeBreakdown,
    topCountries, deviceBreakdown, hourly,
    recentSessions, topSessions, hardestBirds, confusions,
  }
}
