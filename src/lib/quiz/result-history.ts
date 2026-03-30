/**
 * Local quiz result history stored in localStorage.
 */

const STORAGE_KEY = 'quiz_result_history'
const MAX_RESULTS = 100

export interface QuizResult {
  id: string
  date: string // ISO string
  score: number
  totalQuestions: number
  points: number
  bestStreak: number
  difficulty: string
  mode: string
  durationMs: number
  missed: { nameDa: string; nameEn: string; scientificName: string }[]
}

export function loadResults(): QuizResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as QuizResult[]
  } catch {
    return []
  }
}

export function saveResult(result: Omit<QuizResult, 'id' | 'date'>): QuizResult {
  const entry: QuizResult = {
    ...result,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  }
  const results = loadResults()
  results.unshift(entry) // newest first
  if (results.length > MAX_RESULTS) results.length = MAX_RESULTS
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results))
  return entry
}

export function clearResults(): void {
  localStorage.removeItem(STORAGE_KEY)
}

const QUIZ_ACTIVE_KEY = 'quiz_active'

export function setQuizActive(active: boolean): void {
  if (typeof window === 'undefined') return
  if (active) {
    localStorage.setItem(QUIZ_ACTIVE_KEY, '1')
  } else {
    localStorage.removeItem(QUIZ_ACTIVE_KEY)
  }
}

export function isQuizActive(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(QUIZ_ACTIVE_KEY) === '1'
}
