'use client'

import type { Bird } from '@/lib/supabase/types'
import type { QuizQuestion as QuizQuestionType } from '@/lib/quiz/engine'
import PhotoMode from './PhotoMode'
import NameMode from './NameMode'

interface QuizQuestionProps {
  question: QuizQuestionType
  questionNumber: number
  totalQuestions: number
  score: number
  answered: boolean
  selectedOption: Bird | null
  imageUrls: Map<string, string | null>
  onAnswer: (bird: Bird) => void
  onQuit: () => void
}

export default function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  score,
  answered,
  selectedOption,
  imageUrls,
  onAnswer,
  onQuit,
}: QuizQuestionProps) {
  const progress = (questionNumber / totalQuestions) * 100

  return (
    <div id="quiz-screen" className="screen active">
      <div className="quiz-header">
        <div className="quiz-header-top">
          <button className="back-btn" onClick={onQuit} aria-label="Afslut quiz">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="score-display">
            <span>{score} rigtige</span>
          </div>
          <div className="question-counter">
            <span>{questionNumber + 1} / {totalQuestions}</span>
          </div>
        </div>
        <div className="progress-bar-container" role="progressbar" aria-valuenow={questionNumber + 1} aria-valuemin={1} aria-valuemax={totalQuestions} aria-label={`Spørgsmål ${questionNumber + 1} af ${totalQuestions}`}>
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>

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
