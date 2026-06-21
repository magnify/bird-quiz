'use server'

import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'

/** Coarse, privacy-safe player context for analytics: country (country-level
 *  only, never the IP) from Netlify's geo headers, and device class from the
 *  user-agent. Best-effort — returns nulls if headers are unavailable. */
async function sessionContext(): Promise<{ country: string | null; device_type: string | null }> {
  try {
    const h = await headers()
    return { country: countryFromHeaders(h), device_type: deviceFromUA(h.get('user-agent')) }
  } catch {
    return { country: null, device_type: null }
  }
}

function countryFromHeaders(h: Headers): string | null {
  // Netlify edge sets `x-nf-geo` (base64 JSON) and a simpler `x-country`.
  const geo = h.get('x-nf-geo')
  if (geo) {
    try {
      const parsed = JSON.parse(Buffer.from(geo, 'base64').toString('utf8'))
      const code = parsed?.country?.code
      if (typeof code === 'string' && code) return code.toUpperCase()
    } catch {
      // fall through to x-country
    }
  }
  const code = h.get('x-country')
  return code ? code.toUpperCase() : null
}

function deviceFromUA(ua: string | null): string | null {
  if (!ua) return null
  if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua)) return 'tablet'
  if (/Mobi|iPhone|iPod|Android|Windows Phone|BlackBerry/i.test(ua)) return 'mobile'
  return 'desktop'
}

export async function createQuizSession(params: {
  guestId: string
  guestName: string | null
  difficulty: string
  mode: string
  questionCount: number
}): Promise<string | null> {
  try {
    const supabase = createServiceClient()
    const ctx = await sessionContext()
    const base = {
      guest_id: params.guestId,
      guest_name: params.guestName,
      difficulty: params.difficulty,
      mode: params.mode,
      question_count: params.questionCount,
    }

    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({ ...base, country: ctx.country, device_type: ctx.device_type })
      .select('id')
      .single()

    if (!error) return data.id

    // The geo/device columns may not be migrated yet — retry without them so
    // tracking never breaks on the critical path.
    console.error('Create session (with context) failed, retrying base:', error.message)
    const retry = await supabase.from('quiz_sessions').insert(base).select('id').single()
    if (retry.error) {
      console.error('Failed to create quiz session:', retry.error.message)
      return null
    }
    return retry.data.id
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
  } catch (e) {
    // Non-blocking: quiz continues even if write fails, but log so a broken/
    // paused DB is traceable instead of silently dropping data.
    console.error('Failed to record quiz answer:', e)
  }
}

export async function updateSessionName(sessionId: string, guestName: string): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase
      .from('quiz_sessions')
      .update({ guest_name: guestName })
      .eq('id', sessionId)
  } catch (e) {
    console.error('Failed to update session name:', e)
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
  } catch (e) {
    console.error('Failed to complete quiz session:', e)
  }
}
