// Pure aggregation helpers shared by the admin analytics action (getAdminStats)
// and the per-player actions. Kept side-effect-free and unit-tested.

import { STATIC_BIRDS } from '@/lib/data/birds-static'

export const birdById = new Map(STATIC_BIRDS.map(b => [b.id, b]))

/** Count occurrences of each key, descending by count. */
export function breakdown(keys: string[]): { key: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1)
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}

/** Daily session counts for the last `days` days (oldest→newest, zero-filled). */
export function sessionsPerDay(isoDates: string[], days: number): { date: string; count: number }[] {
  const dayCounts = new Map<string, number>()
  for (const iso of isoDates) {
    const d = iso.slice(0, 10)
    dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1)
  }
  const out: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)
    out.push({ date: d, count: dayCounts.get(d) ?? 0 })
  }
  return out
}

const HOUR_FMT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', hour: '2-digit', hour12: false })

/** Sessions per hour-of-day (0–23), in Europe/Copenhagen (created_at is UTC). */
export function hourly(isoDates: string[]): { hour: number; count: number }[] {
  const counts = new Array(24).fill(0)
  for (const iso of isoDates) {
    const h = Number(HOUR_FMT.format(new Date(iso))) % 24
    if (!Number.isNaN(h)) counts[h]++
  }
  return counts.map((count, hour) => ({ hour, count }))
}

export interface AnswerRow {
  bird_id: string
  chosen_bird_id: string | null
  is_correct: boolean
}

export interface HardestBird {
  bird_id: string
  bird_name_da: string
  scientific_name: string
  times_shown: number
  times_correct: number
  accuracy: number
}

export interface Confusion {
  actualName: string
  chosenName: string
  count: number
}

/** Hardest birds (lowest accuracy among birds shown ≥ minShown) and the top
 *  wrong-answer confusions, from a set of answers. */
export function birdStatsFromAnswers(
  answers: AnswerRow[],
  opts: { minShown?: number; limit?: number } = {},
): { hardestBirds: HardestBird[]; confusions: Confusion[] } {
  const minShown = opts.minShown ?? 5
  const limit = opts.limit ?? 10

  const perBird = new Map<string, { shown: number; correct: number }>()
  const pairCounts = new Map<string, number>()
  for (const a of answers) {
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
    .filter(([, s]) => s.shown >= minShown)
    .map(([bird_id, s]) => {
      const bird = birdById.get(bird_id)
      if (!bird) return null
      return {
        bird_id, bird_name_da: bird.name_da, scientific_name: bird.scientific_name,
        times_shown: s.shown, times_correct: s.correct,
        accuracy: Math.round((s.correct / s.shown) * 100),
      }
    })
    .filter((b): b is HardestBird => b !== null)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit)

  const confusions = [...pairCounts.entries()]
    .map(([k, count]) => {
      const [actualId, chosenId] = k.split('|')
      const actual = birdById.get(actualId)
      const chosen = birdById.get(chosenId)
      if (!actual || !chosen) return null
      return { actualName: actual.name_da, chosenName: chosen.name_da, count }
    })
    .filter((c): c is Confusion => c !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  return { hardestBirds, confusions }
}

/** Most-missed birds by incorrect-answer count. */
export function missedBirds(answers: AnswerRow[], limit = 10): { bird_id: string; bird_name_da: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const a of answers) if (!a.is_correct) counts.set(a.bird_id, (counts.get(a.bird_id) ?? 0) + 1)
  return [...counts.entries()]
    .map(([bird_id, count]) => {
      const bird = birdById.get(bird_id)
      return bird ? { bird_id, bird_name_da: bird.name_da, count } : null
    })
    .filter((b): b is { bird_id: string; bird_name_da: string; count: number } => b !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
