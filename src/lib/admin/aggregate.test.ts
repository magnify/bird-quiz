import { describe, it, expect } from 'vitest'
import { STATIC_BIRDS } from '@/lib/data/birds-static'
import { breakdown, sessionsPerDay, hourly, birdStatsFromAnswers, missedBirds, type AnswerRow } from './aggregate'

const [birdA, birdB, birdC] = STATIC_BIRDS

describe('breakdown', () => {
  it('counts and sorts descending', () => {
    expect(breakdown(['a', 'b', 'a', 'a', 'b'])).toEqual([
      { key: 'a', count: 3 },
      { key: 'b', count: 2 },
    ])
  })
  it('returns [] for no input', () => {
    expect(breakdown([])).toEqual([])
  })
})

describe('sessionsPerDay', () => {
  it('zero-fills the window and ends today', () => {
    const today = new Date().toISOString().slice(0, 10)
    const out = sessionsPerDay([new Date().toISOString()], 7)
    expect(out).toHaveLength(7)
    expect(out.at(-1)).toEqual({ date: today, count: 1 })
    expect(out[0].count).toBe(0)
  })
  it('buckets multiple sessions on the same day', () => {
    const now = new Date().toISOString()
    const out = sessionsPerDay([now, now, now], 3)
    expect(out.at(-1)!.count).toBe(3)
  })
})

describe('hourly', () => {
  it('always returns 24 buckets', () => {
    const out = hourly([])
    expect(out).toHaveLength(24)
    expect(out.every(h => h.count === 0)).toBe(true)
    expect(out[0].hour).toBe(0)
    expect(out[23].hour).toBe(23)
  })
  it('counts a known UTC time into the Copenhagen hour', () => {
    // 2025-06-21T10:00:00Z → summer (CEST, UTC+2) → 12:00 local
    const out = hourly(['2025-06-21T10:00:00.000Z'])
    expect(out[12].count).toBe(1)
    expect(out.reduce((a, b) => a + b.count, 0)).toBe(1)
  })
})

describe('birdStatsFromAnswers', () => {
  const answers: AnswerRow[] = [
    ...Array(4).fill({ bird_id: birdA.id, chosen_bird_id: null, is_correct: true }),
    { bird_id: birdA.id, chosen_bird_id: birdB.id, is_correct: false },
    ...Array(5).fill({ bird_id: birdB.id, chosen_bird_id: birdC.id, is_correct: false }),
  ]

  it('computes accuracy and respects minShown', () => {
    const { hardestBirds } = birdStatsFromAnswers(answers, { minShown: 5 })
    // birdA shown 5 (4 correct = 80%), birdB shown 5 (0 correct = 0%)
    expect(hardestBirds.map(b => b.bird_id)).toEqual([birdB.id, birdA.id])
    expect(hardestBirds[0].accuracy).toBe(0)
    expect(hardestBirds[1].accuracy).toBe(80)
  })
  it('drops birds below minShown', () => {
    const { hardestBirds } = birdStatsFromAnswers(answers, { minShown: 6 })
    expect(hardestBirds).toEqual([])
  })
  it('ranks confusions by wrong-choice frequency', () => {
    const { confusions } = birdStatsFromAnswers(answers, { minShown: 1 })
    expect(confusions[0]).toMatchObject({ actualName: birdB.name_da, chosenName: birdC.name_da, count: 5 })
  })
})

describe('missedBirds', () => {
  it('counts only incorrect answers, descending', () => {
    const answers: AnswerRow[] = [
      { bird_id: birdA.id, chosen_bird_id: birdB.id, is_correct: false },
      { bird_id: birdA.id, chosen_bird_id: birdB.id, is_correct: false },
      { bird_id: birdB.id, chosen_bird_id: birdA.id, is_correct: false },
      { bird_id: birdA.id, chosen_bird_id: null, is_correct: true },
    ]
    const out = missedBirds(answers)
    expect(out[0]).toMatchObject({ bird_id: birdA.id, count: 2 })
    expect(out[1]).toMatchObject({ bird_id: birdB.id, count: 1 })
  })
})
