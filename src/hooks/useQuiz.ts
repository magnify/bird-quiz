'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Bird } from '@/lib/supabase/types'
import {
  generateQuestions,
  type Difficulty,
  type QuizMode,
  type QuizQuestion,
} from '@/lib/quiz/engine'
import {
  loadWeights,
  recordCorrect,
  recordWrong,
  type Weights,
} from '@/lib/quiz/spaced-repetition'
import { calculateQuestionScore } from '@/lib/quiz/scoring'
import { saveResult, setQuizActive } from '@/lib/quiz/result-history'
import { getGuestId, getGuestName } from '@/lib/identity/guest'
import { createQuizSession, recordQuizAnswer, completeQuizSession } from '@/app/actions/quiz'

export type Screen = 'start' | 'transitioning' | 'quiz' | 'results'

export interface QuizState {
  screen: Screen
  difficulty: Difficulty
  mode: QuizMode
  totalQuestions: number
  currentQuestion: number
  score: number
  streak: number
  bestStreak: number
  points: number
  questions: QuizQuestion[]
  missed: Bird[]
  answered: boolean
  selectedOption: Bird | null
  weights: Weights
  sessionId: string | null
}

export function useQuiz(
  birds: Bird[],
  memberships: { bird_id: string; group_id: string }[]
) {
  const [state, setState] = useState<QuizState>({
    screen: 'start',
    difficulty: 'common',
    mode: 'photo',
    totalQuestions: 20,
    currentQuestion: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    points: 0,
    questions: [],
    missed: [],
    answered: false,
    selectedOption: null,
    weights: {},
    sessionId: null,
  })

  // Load weights from localStorage on mount; clear stale quiz_active flag
  useEffect(() => {
    setQuizActive(false)
    setState(prev => ({ ...prev, weights: loadWeights() }))
  }, [])

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const questionStartTime = useRef<number>(0)
  const quizStartTime = useRef<number>(0)

  const setDifficulty = useCallback((d: Difficulty) => {
    setState(prev => ({ ...prev, difficulty: d }))
  }, [])

  const setMode = useCallback((m: QuizMode) => {
    setState(prev => ({ ...prev, mode: m }))
  }, [])

  const setTotalQuestions = useCallback((n: number) => {
    setState(prev => ({ ...prev, totalQuestions: n }))
  }, [])

  // Pre-generate questions whenever settings change so the mosaic can show the first bird
  const pendingQuestions = useRef<QuizQuestion[]>([])
  const [firstBirdId, setFirstBirdId] = useState<string | null>(null)

  // Regenerate pending questions when settings change
  useEffect(() => {
    const questions = generateQuestions(
      birds,
      memberships,
      state.difficulty,
      state.mode,
      state.totalQuestions,
      state.weights
    )
    pendingQuestions.current = questions
    setFirstBirdId(questions[0]?.bird.id ?? null)
  }, [birds, memberships, state.difficulty, state.mode, state.totalQuestions, state.weights])

  const startQuiz = useCallback(() => {
    setState(prev => {
      // Use pre-generated questions or generate fresh ones
      const questions = pendingQuestions.current.length > 0
        ? pendingQuestions.current
        : generateQuestions(
            birds,
            memberships,
            prev.difficulty,
            prev.mode,
            prev.totalQuestions,
            prev.weights
          )
      return {
        ...prev,
        screen: 'transitioning',
        currentQuestion: 0,
        score: 0,
        streak: 0,
        bestStreak: 0,
        points: 0,
        missed: [],
        answered: false,
        selectedOption: null,
        questions,
        sessionId: null,
      }
    })
  }, [birds, memberships])

  const completeTransition = useCallback(() => {
    setState(prev => {
      if (prev.screen !== 'transitioning') return prev
      return { ...prev, screen: 'quiz' }
    })

    // Create session in DB (fire-and-forget)
    quizStartTime.current = Date.now()
    questionStartTime.current = Date.now()
    setQuizActive(true)

    // Use a ref-like approach to read current state for the async call
    setState(prev => {
      createQuizSession({
        guestId: getGuestId(),
        guestName: getGuestName(),
        difficulty: prev.difficulty,
        mode: prev.mode,
        questionCount: prev.totalQuestions,
      }).then(id => {
        if (id) {
          setState(p => ({ ...p, sessionId: id }))
        }
      })
      return prev
    })

    // Pre-generate new questions for next time
    const nextQuestions = generateQuestions(
      birds,
      memberships,
      state.difficulty,
      state.mode,
      state.totalQuestions,
      state.weights
    )
    pendingQuestions.current = nextQuestions
    setFirstBirdId(nextQuestions[0]?.bird.id ?? null)
  }, [birds, memberships, state.difficulty, state.mode, state.totalQuestions, state.weights])

  const handleAnswer = useCallback((chosen: Bird) => {
    const responseTimeMs = Date.now() - questionStartTime.current

    setState(prev => {
      if (prev.answered) return prev

      const q = prev.questions[prev.currentQuestion]
      if (!q) return prev

      const isCorrect = chosen.id === q.bird.id
      const newStreak = isCorrect ? prev.streak + 1 : 0
      const newBestStreak = Math.max(prev.bestStreak, newStreak)
      const newScore = isCorrect ? prev.score + 1 : prev.score
      const newMissed = isCorrect ? prev.missed : [...prev.missed, q.bird]

      const questionPoints = calculateQuestionScore({
        isCorrect,
        responseTimeMs,
        difficulty: prev.difficulty,
        currentStreak: isCorrect ? prev.streak : 0, // streak before increment for multiplier
      })
      const newPoints = prev.points + questionPoints

      // Update weights
      if (isCorrect) {
        recordCorrect(q.bird.scientific_name, prev.weights)
      } else {
        recordWrong(q.bird.scientific_name, prev.weights)
      }

      // Record answer in DB (fire-and-forget)
      if (prev.sessionId) {
        recordQuizAnswer({
          sessionId: prev.sessionId,
          questionNumber: prev.currentQuestion + 1,
          birdId: q.bird.id,
          chosenBirdId: chosen.id,
          isCorrect,
          responseTimeMs,
          mode: q.mode,
        })
      }

      return {
        ...prev,
        score: newScore,
        streak: newStreak,
        bestStreak: newBestStreak,
        points: newPoints,
        missed: newMissed,
        answered: true,
        selectedOption: chosen,
      }
    })

    // Auto-advance after delay
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(() => {
      questionStartTime.current = Date.now()
      setState(prev => {
        const nextQ = prev.currentQuestion + 1
        if (nextQ >= prev.questions.length) {
          const durationMs = Date.now() - quizStartTime.current
          // Complete session in DB
          if (prev.sessionId) {
            completeQuizSession({
              sessionId: prev.sessionId,
              score: prev.score,
              points: prev.points,
              durationMs,
              guestName: getGuestName(),
            })
          }
          // Save to local history
          saveResult({
            score: prev.score,
            totalQuestions: prev.questions.length,
            points: prev.points,
            bestStreak: prev.bestStreak,
            difficulty: prev.difficulty,
            mode: prev.mode,
            durationMs,
            missed: prev.missed.map(b => ({
              nameDa: b.name_da,
              nameEn: b.name_en,
              scientificName: b.scientific_name,
            })),
          })
          setQuizActive(false)
          return { ...prev, screen: 'results' }
        }
        return {
          ...prev,
          currentQuestion: nextQ,
          answered: false,
          selectedOption: null,
        }
      })
    }, 1400)
  }, [])

  const quitQuiz = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setQuizActive(false)
    setState(prev => {
      if (prev.currentQuestion > 0) {
        const durationMs = Date.now() - quizStartTime.current
        // Complete the session with current score
        if (prev.sessionId) {
          completeQuizSession({
            sessionId: prev.sessionId,
            score: prev.score,
            points: prev.points,
            durationMs,
            guestName: getGuestName(),
          })
        }
        // Save to local history
        saveResult({
          score: prev.score,
          totalQuestions: prev.questions.length,
          points: prev.points,
          bestStreak: prev.bestStreak,
          difficulty: prev.difficulty,
          mode: prev.mode,
          durationMs,
          missed: prev.missed.map(b => ({
            nameDa: b.name_da,
            nameEn: b.name_en,
            scientificName: b.scientific_name,
          })),
        })
        return { ...prev, screen: 'results' }
      }
      return { ...prev, screen: 'start' }
    })
  }, [])

  const goHome = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setQuizActive(false)
    setState(prev => ({
      ...prev,
      screen: 'start',
      answered: false,
      selectedOption: null,
    }))
  }, [])

  const currentQ = state.questions[state.currentQuestion] || null

  return {
    state,
    currentQ,
    firstBirdId,
    setDifficulty,
    setMode,
    setTotalQuestions,
    startQuiz,
    completeTransition,
    handleAnswer,
    quitQuiz,
    goHome,
  }
}
