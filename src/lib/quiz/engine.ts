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
  if (pool.length <= count) return [...pool]

  const picked: Bird[] = []
  const usedIndices = new Set<number>()

  const totalWeight = pool.reduce(
    (sum, b) => sum + getWeight(b.scientific_name, weights),
    0
  )

  while (picked.length < count) {
    let r = Math.random() * totalWeight
    let pickedOne = false
    for (let i = 0; i < pool.length; i++) {
      if (usedIndices.has(i)) continue
      r -= getWeight(pool[i].scientific_name, weights)
      if (r <= 0) {
        picked.push(pool[i])
        usedIndices.add(i)
        pickedOne = true
        break
      }
    }
    // Safety: if rounding prevents a pick, grab the first available
    if (!pickedOne) {
      for (let i = 0; i < pool.length; i++) {
        if (!usedIndices.has(i)) {
          picked.push(pool[i])
          usedIndices.add(i)
          break
        }
      }
    }
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

  // For mixed mode: generate BOTH photo AND name questions for each bird
  // For other modes: generate the requested number of questions
  const isMixed = mode === 'mixed'
  const numBirds = isMixed ? Math.min(Math.floor(questionCount / 2), pool.length) : Math.min(questionCount, pool.length)
  const picked = weightedPick(pool, weights, numBirds)

  const questions: QuizQuestion[] = []

  picked.forEach(bird => {
    const distractors = pickDistractors(bird, pool, birds, birdGroups, groupMembers)
    const options = shuffle([bird, ...distractors])

    if (isMixed) {
      // Generate BOTH photo and name questions for this bird
      questions.push({
        bird,
        distractors,
        options: shuffle([bird, ...distractors]), // Fresh shuffle for photo
        mode: 'photo',
      })
      questions.push({
        bird,
        distractors,
        options: shuffle([bird, ...distractors]), // Fresh shuffle for name
        mode: 'name',
      })
    } else {
      // Single question with the requested mode
      const qMode: 'photo' | 'name' = mode === 'name' ? 'name' : 'photo'
      questions.push({
        bird,
        distractors,
        options,
        mode: qMode,
      })
    }
  })

  // For mixed mode, shuffle the questions so photo/name don't always alternate predictably
  return isMixed ? shuffle(questions) : questions
}
