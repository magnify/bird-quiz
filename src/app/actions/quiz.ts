'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function createQuizSession(params: {
  guestId: string
  guestName: string | null
  difficulty: string
  mode: string
  questionCount: number
}): Promise<string | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({
        guest_id: params.guestId,
        guest_name: params.guestName,
        difficulty: params.difficulty,
        mode: params.mode,
        question_count: params.questionCount,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to create quiz session:', error.message)
      return null
    }
    return data.id
  } catch (e) {
    console.error('Failed to create quiz session:', e)
    return null
  }
}

export async function recordQuizAnswer(params: {
  sessionId: string
  questionNumber: number
  birdId: string
  chosenBirdId: string | null
  isCorrect: boolean
  responseTimeMs: number | null
  mode: string
}): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('quiz_answers').insert({
      session_id: params.sessionId,
      question_number: params.questionNumber,
      bird_id: params.birdId,
      chosen_bird_id: params.chosenBirdId,
      is_correct: params.isCorrect,
      response_time_ms: params.responseTimeMs,
      mode: params.mode,
    })
  } catch {
    // Non-blocking: quiz continues even if write fails
  }
}

export async function updateSessionName(sessionId: string, guestName: string): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase
      .from('quiz_sessions')
      .update({ guest_name: guestName })
      .eq('id', sessionId)
  } catch {
    // Non-blocking
  }
}

export async function completeQuizSession(params: {
  sessionId: string
  score: number
  points: number
  durationMs: number
  guestName: string | null
}): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase
      .from('quiz_sessions')
      .update({
        score: params.score,
        points: params.points,
        duration_ms: params.durationMs,
        completed: true,
        completed_at: new Date().toISOString(),
        guest_name: params.guestName,
      })
      .eq('id', params.sessionId)
  } catch {
    // Non-blocking
  }
}
