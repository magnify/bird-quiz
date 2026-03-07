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

export type Screen = 'start' | 'quiz' | 'results'

export interface QuizState {
  screen: Screen
  difficulty: Difficulty
  mode: QuizMode
  totalQuestions: number
  currentQuestion: number
  score: number
  streak: number
  bestStreak: number
  questions: QuizQuestion[]
  missed: Bird[]
  answered: boolean
  selectedOption: Bird | null
  weights: Weights
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
    questions: [],
    missed: [],
    answered: false,
    selectedOption: null,
    weights: {},
  })

  // Load weights from localStorage on mount
  useEffect(() => {
    setState(prev => ({ ...prev, weights: loadWeights() }))
  }, [])

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setDifficulty = useCallback((d: Difficulty) => {
    setState(prev => ({ ...prev, difficulty: d }))
  }, [])

  const setMode = useCallback((m: QuizMode) => {
    setState(prev => ({ ...prev, mode: m }))
  }, [])

  const setTotalQuestions = useCallback((n: number) => {
    setState(prev => ({ ...prev, totalQuestions: n }))
  }, [])

  const startQuiz = useCallback(() => {
    setState(prev => {
      const questions = generateQuestions(
        birds,
        memberships,
        prev.difficulty,
        prev.mode,
        prev.totalQuestions,
        prev.weights
      )
      return {
        ...prev,
        screen: 'quiz',
        currentQuestion: 0,
        score: 0,
        streak: 0,
        bestStreak: 0,
        missed: [],
        answered: false,
        selectedOption: null,
        questions,
      }
    })
  }, [birds, memberships])

  const handleAnswer = useCallback((chosen: Bird) => {
    setState(prev => {
      if (prev.answered) return prev

      const q = prev.questions[prev.currentQuestion]
      if (!q) return prev

      const isCorrect = chosen.id === q.bird.id
      const newScore = isCorrect ? prev.score + 1 : prev.score
      const newStreak = isCorrect ? prev.streak + 1 : 0
      const newBestStreak = Math.max(prev.bestStreak, newStreak)
      const newMissed = isCorrect ? prev.missed : [...prev.missed, q.bird]

      // Update weights
      if (isCorrect) {
        recordCorrect(q.bird.scientific_name, prev.weights)
      } else {
        recordWrong(q.bird.scientific_name, prev.weights)
      }

      return {
        ...prev,
        score: newScore,
        streak: newStreak,
        bestStreak: newBestStreak,
        missed: newMissed,
        answered: true,
        selectedOption: chosen,
      }
    })

    // Auto-advance after delay
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(() => {
      setState(prev => {
        const nextQ = prev.currentQuestion + 1
        if (nextQ >= prev.questions.length) {
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
    setState(prev => {
      if (prev.currentQuestion > 0) {
        return { ...prev, screen: 'results' }
      }
      return { ...prev, screen: 'start' }
    })
  }, [])

  const goHome = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
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
    setDifficulty,
    setMode,
    setTotalQuestions,
    startQuiz,
    handleAnswer,
    quitQuiz,
    goHome,
  }
}
