'use client'

import type { Bird } from '@/lib/supabase/types'
import type { QuizQuestion as QuizQuestionType } from '@/lib/quiz/engine'
import PhotoMode from './PhotoMode'
import NameMode from './NameMode'

interface QuizQuestionProps {
  question: QuizQuestionType
  questionNumber: number
  totalQuestions: number
  answered: boolean
  selectedOption: Bird | null
  imageUrls: Map<string, string | null>
  onAnswer: (bird: Bird) => void
}

export default function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  answered,
  selectedOption,
  imageUrls,
  onAnswer,
}: QuizQuestionProps) {
  return (
    <div id="quiz-screen" className="screen active">
      {question.mode === 'photo' ? (
        <PhotoMode
          question={question}
          answered={answered}
          selectedOption={selectedOption}
          imageUrl={imageUrls.get(question.bird.id) ?? null}
          onAnswer={onAnswer}
        />
      ) : (
        <NameMode
          question={question}
          answered={answered}
          selectedOption={selectedOption}
          imageUrls={imageUrls}
          onAnswer={onAnswer}
        />
      )}
    </div>
  )
}
