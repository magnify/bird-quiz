/**
 * Points scoring system for quiz answers.
 *
 * Per correct answer:
 *   base = 100
 *   time_bonus = 50 (<3s), 30 (<5s), 10 (<8s), 0 (else)
 *   difficulty_mult = easy: 1.0, common: 1.5, hard: 2.0, all: 2.0
 *   streak_mult = 0-2: 1.0, 3-5: 1.2, 6-9: 1.5, 10+: 2.0
 *   total = (base + time_bonus) * difficulty_mult * streak_mult
 *
 * Wrong answer = 0 points
 */

import type { Difficulty } from './engine'

export function calculateQuestionScore(params: {
  isCorrect: boolean
  responseTimeMs: number | null
  difficulty: Difficulty
  currentStreak: number
}): number {
  if (!params.isCorrect) return 0

  const base = 100

  let timeBonus = 0
  if (params.responseTimeMs !== null) {
    const seconds = params.responseTimeMs / 1000
    if (seconds < 3) timeBonus = 50
    else if (seconds < 5) timeBonus = 30
    else if (seconds < 8) timeBonus = 10
  }

  let difficultyMult = 1.0
  if (params.difficulty === 'common') difficultyMult = 1.5
  else if (params.difficulty === 'hard' || params.difficulty === 'all') difficultyMult = 2.0

  let streakMult = 1.0
  if (params.currentStreak >= 10) streakMult = 2.0
  else if (params.currentStreak >= 6) streakMult = 1.5
  else if (params.currentStreak >= 3) streakMult = 1.2

  return Math.round((base + timeBonus) * difficultyMult * streakMult)
}
