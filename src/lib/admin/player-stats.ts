// Types for the admin "Spillere" surfaces. Kept out of the 'use server' actions
// file (which may only export async functions).

import type { HardestBird, Confusion } from '@/lib/admin/aggregate'

export interface PlayerSummary {
  guestId: string
  guestName: string | null
  sessions: number
  completed: number
  totalPoints: number
  bestScorePct: number | null
  lastSeen: string
  country: string | null
  device: string | null
}

export interface PlayerDetail {
  found: boolean
  guestId: string
  guestName: string | null
  // Activity
  firstSeen: string | null
  lastSeen: string | null
  daysActive: number
  longestStreak: number
  totalSessions: number
  completedSessions: number
  completionRate: number
  sessionsPerDay: { date: string; count: number }[]
  // Performance
  avgScore: number | null
  bestScore: number | null
  totalPoints: number
  avgPoints: number | null
  avgResponseMs: number | null
  // Birds
  hardestBirds: HardestBird[]
  missedBirds: { bird_id: string; bird_name_da: string; count: number }[]
  confusions: Confusion[]
  // Context
  country: string | null
  devices: { key: string; count: number }[]
  difficultyBreakdown: { key: string; count: number }[]
  modeBreakdown: { key: string; count: number }[]
  hourly: { hour: number; count: number }[]
}
