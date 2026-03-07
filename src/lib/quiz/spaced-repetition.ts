/**
 * Spaced repetition weight system.
 * Birds answered wrong get higher weight (more likely to appear).
 * Birds answered correctly get lower weight.
 *
 * Ported from legacy app.js lines 118-185.
 */

const STORAGE_KEY = 'dansk_fugleviden_weights'

export type Weights = Record<string, number>

export function loadWeights(): Weights {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveWeights(weights: Weights): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights))
  } catch {
    // storage full or unavailable
  }
}

export function getWeight(scientificName: string, weights: Weights): number {
  return weights[scientificName] || 1
}

export function recordCorrect(scientificName: string, weights: Weights): void {
  weights[scientificName] = Math.max(0.5, (weights[scientificName] || 1) - 0.3)
  saveWeights(weights)
}

export function recordWrong(scientificName: string, weights: Weights): void {
  weights[scientificName] = Math.min(5, (weights[scientificName] || 1) + 1.2)
  saveWeights(weights)
}
