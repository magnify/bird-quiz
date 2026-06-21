// Shared analytics types + range options. Kept out of the 'use server'
// actions file (which may only export async functions).

export const RANGE_OPTIONS = [
  { key: '7d', label: '7 dage', days: 7 },
  { key: '14d', label: '14 dage', days: 14 },
  { key: '30d', label: '30 dage', days: 30 },
  { key: '90d', label: '90 dage', days: 90 },
  { key: 'all', label: 'Alt', days: null },
] as const

export type RangeKey = (typeof RANGE_OPTIONS)[number]['key']
export const DEFAULT_RANGE: RangeKey = '14d'

export function rangeDaysFor(key: string): number | null {
  return (RANGE_OPTIONS.find(r => r.key === key) ?? RANGE_OPTIONS[1]).days
}

export interface SessionRow {
  id: string
  guest_name: string | null
  guest_id: string | null
  difficulty: string
  mode: string
  score: number | null
  points: number | null
  question_count: number
  completed_at: string | null
  created_at: string
}

export interface AdminStats {
  healthy: boolean
  error?: string
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
  topCountries: { country: string; count: number }[]
  deviceBreakdown: { key: string; count: number }[]
  hourly: { hour: number; count: number }[]
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
