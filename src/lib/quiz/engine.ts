/**
 * Quiz engine: generates questions with weighted random selection.
 *
 * Ported from legacy app.js lines 327-386.
 */

import type { Bird } from '@/lib/supabase/types'
import { getWeight, type Weights } from './spaced-repetition'
import { pickDistractors, buildGroupIndex } from './distractor-selection'

export type Difficulty = 'easy' | 'common' | 'hard' | 'all'
export type QuizMode = 'photo' | 'name' | 'mixed'

export interface QuizQuestion {
  bird: Bird
  distractors: Bird[]
  options: Bird[]
  mode: 'photo' | 'name'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Weighted random selection — birds with higher weights (from wrong answers)
 * are more likely to be picked.
 */
function weightedPick(
  pool: Bird[],
  weights: Weights,
  count: number
): Bird[] {
  if (pool.length <= count) return shuffle(pool)

  const remaining = [...pool]
  const picked: Bird[] = []

  while (picked.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce(
      (sum, b) => sum + getWeight(b.scientific_name, weights),
      0,
    )
    let r = Math.random() * totalWeight
    let idx = remaining.length - 1
    for (let i = 0; i < remaining.length; i++) {
      r -= getWeight(remaining[i].scientific_name, weights)
      if (r <= 0) {
        idx = i
        break
      }
    }
    picked.push(remaining[idx])
    remaining.splice(idx, 1)
  }

  return picked
}

/**
 * Filter the bird pool based on difficulty setting.
 */
export function filterPool(birds: Bird[], difficulty: Difficulty): Bird[] {
  switch (difficulty) {
    case 'easy':
      return birds.filter(b => b.is_easy)
    case 'common':
      return birds.filter(b => b.is_common)
    case 'hard':
      return birds.filter(b => !b.is_easy && !b.is_common)
    case 'all':
    default:
      return [...birds]
  }
}

/**
 * Generate quiz questions.
 */
export function generateQuestions(
  birds: Bird[],
  memberships: { bird_id: string; group_id: string }[],
  difficulty: Difficulty,
  mode: QuizMode,
  questionCount: number,
  weights: Weights
): QuizQuestion[] {
  const pool = filterPool(birds, difficulty)
  const { birdGroups, groupMembers } = buildGroupIndex(birds, memberships)

  const isMixed = mode === 'mixed'
  const numBirds = isMixed ? Math.min(Math.floor(questionCount / 2), pool.length) : Math.min(questionCount, pool.length)
  const picked = weightedPick(pool, weights, numBirds)

  const photoQuestions: QuizQuestion[] = []
  const nameQuestions: QuizQuestion[] = []
  const questions: QuizQuestion[] = []

  picked.forEach(bird => {
    const distractors = pickDistractors(bird, pool, birds, birdGroups, groupMembers)

    if (isMixed) {
      photoQuestions.push({
        bird,
        distractors,
        options: shuffle([bird, ...distractors]),
        mode: 'photo',
      })
      nameQuestions.push({
        bird,
        distractors,
        options: shuffle([bird, ...distractors]),
        mode: 'name',
      })
    } else {
      const qMode: 'photo' | 'name' = mode === 'name' ? 'name' : 'photo'
      questions.push({
        bird,
        distractors,
        options: shuffle([bird, ...distractors]),
        mode: qMode,
      })
    }
  })

  if (isMixed) {
    // Shuffle each group independently so the same bird's photo and name
    // questions are guaranteed to be ≥ numBirds positions apart.
    return [...shuffle(photoQuestions), ...shuffle(nameQuestions)]
  }

  return questions
}
