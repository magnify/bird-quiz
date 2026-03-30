'use client'

import { useState, useEffect } from 'react'
import type { Bird } from '@/lib/supabase/types'
import type { QuizQuestion } from '@/lib/quiz/engine'

interface NameModeProps {
  question: QuizQuestion
  answered: boolean
  selectedOption: Bird | null
  imageUrls: Map<string, string | null>
  onAnswer: (bird: Bird) => void
}

function PhotoOptionCard({
  bird,
  imageUrl,
  isCorrect,
  isSelected,
  isDimmed,
  answered,
  onClick,
}: {
  bird: Bird
  imageUrl: string | null
  isCorrect: boolean
  isSelected: boolean
  isDimmed: boolean
  answered: boolean
  onClick: () => void
}) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
  }, [bird.id])

  const classes = [
    'photo-option',
    answered ? 'disabled answered' : '',
    isCorrect ? 'correct' : '',
    isSelected && !isCorrect ? 'wrong' : '',
    isDimmed ? 'dimmed' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      onClick={answered ? undefined : onClick}
      onKeyDown={answered ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      role="button"
      tabIndex={answered ? -1 : 0}
      aria-label={bird.name_da}
      aria-disabled={answered}
    >
      <div className={`photo-option-loading ${loaded ? 'hidden' : ''}`}>
        {imageUrl ? (
          <div className="spinner" />
        ) : (
          <span style={{ color: 'var(--quiz-text-muted)', fontSize: '0.75rem' }}>Intet foto</span>
        )}
      </div>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={bird.name_da}
          className={loaded ? 'loaded' : ''}
          onLoad={() => setLoaded(true)}
        />
      )}
      {(isCorrect || (isSelected && !isCorrect)) && (
        <div className="photo-option-badge">{isCorrect ? '✓' : '✗'}</div>
      )}
      <div className="photo-option-label">{bird.name_da}</div>
    </div>
  )
}

export default function NameMode({
  question,
  answered,
  selectedOption,
  imageUrls,
  onAnswer,
}: NameModeProps) {
  return (
    <div id="name-mode" className="quiz-body">
      <div className="name-display">
        <h2 className="bird-name-text">{question.bird.name_da}</h2>
        <p className="bird-sci-text">{question.bird.scientific_name}</p>
      </div>
      <div className="question-text">Hvilken fugl er det?</div>
      <div className="photo-options-grid">
        {question.options.map(opt => (
          <PhotoOptionCard
            key={opt.id}
            bird={opt}
            imageUrl={imageUrls.get(opt.id) ?? null}
            isCorrect={answered && opt.id === question.bird.id}
            isSelected={selectedOption?.id === opt.id}
            isDimmed={answered && opt.id !== question.bird.id && opt.id !== selectedOption?.id}
            answered={answered}
            onClick={() => onAnswer(opt)}
          />
        ))}
      </div>
    </div>
  )
}
