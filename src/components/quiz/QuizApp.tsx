'use client'

import { useEffect } from 'react'
import type { Bird, BirdImage } from '@/lib/supabase/types'
import { useQuiz } from '@/hooks/useQuiz'
import { useBirdImages } from '@/hooks/useBirdImages'
import QuizSetup from './QuizSetup'
import QuizQuestion from './QuizQuestion'
import QuizResults from './QuizResults'

interface QuizAppProps {
  birds: Bird[]
  memberships: { bird_id: string; group_id: string }[]
  birdImages: BirdImage[]
}

export default function QuizApp({ birds, memberships, birdImages }: QuizAppProps) {
  const {
    state,
    currentQ,
    setDifficulty,
    setMode,
    setTotalQuestions,
    startQuiz,
    handleAnswer,
    quitQuiz,
    goHome,
  } = useQuiz(birds, memberships)

  const { imageUrls, ensureImages } = useBirdImages(birdImages)

  // When a question is displayed, ensure images are loaded for all options
  useEffect(() => {
    if (state.screen === 'quiz' && currentQ) {
      // Load images for all options (correct + distractors)
      ensureImages(currentQ.options)
    }
  }, [state.screen, state.currentQuestion, currentQ, ensureImages])

  // Preload images for the next question
  useEffect(() => {
    if (state.screen === 'quiz') {
      const nextQ = state.questions[state.currentQuestion + 1]
      if (nextQ) {
        ensureImages(nextQ.options)
      }
    }
  }, [state.screen, state.currentQuestion, state.questions, ensureImages])

  switch (state.screen) {
    case 'start':
      return (
        <QuizSetup
          difficulty={state.difficulty}
          mode={state.mode}
          totalQuestions={state.totalQuestions}
          onSetDifficulty={setDifficulty}
          onSetMode={setMode}
          onSetTotalQuestions={setTotalQuestions}
          onStart={startQuiz}
        />
      )

    case 'quiz':
      if (!currentQ) return null
      return (
        <QuizQuestion
          question={currentQ}
          questionNumber={state.currentQuestion}
          totalQuestions={state.questions.length}
          score={state.score}
          answered={state.answered}
          selectedOption={state.selectedOption}
          imageUrls={imageUrls}
          onAnswer={handleAnswer}
          onQuit={quitQuiz}
        />
      )

    case 'results':
      return (
        <QuizResults
          score={state.score}
          totalQuestions={state.questions.length}
          bestStreak={state.bestStreak}
          missed={state.missed}
          imageUrls={imageUrls}
          onRetry={startQuiz}
          onHome={goHome}
        />
      )
  }
}
