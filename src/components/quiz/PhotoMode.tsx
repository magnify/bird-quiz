'use client'

import { useState, useEffect, useRef } from 'react'
import type { Bird } from '@/lib/supabase/types'
import type { QuizQuestion } from '@/lib/quiz/engine'

interface PhotoModeProps {
  question: QuizQuestion
  answered: boolean
  selectedOption: Bird | null
  imageUrl: string | null
  onAnswer: (bird: Bird) => void
}

export default function PhotoMode({
  question,
  answered,
  selectedOption,
  imageUrl,
  onAnswer,
}: PhotoModeProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const loadedRef = useRef(false)

  // Reset image state when question changes
  useEffect(() => {
    setImageLoaded(false)
    setImageFailed(false)
    loadedRef.current = false

    // Timeout: if image doesn't load within 10s, show failure
    const timer = setTimeout(() => {
      if (!loadedRef.current) setImageFailed(true)
    }, 10000)
    return () => clearTimeout(timer)
  }, [question.bird.id])

  const isCorrectAnswer = selectedOption?.id === question.bird.id

  function getButtonClass(opt: Bird): string {
    const classes = ['option-btn']
    if (answered) {
      classes.push('disabled')
      if (opt.id === question.bird.id) {
        classes.push('correct')
      } else if (selectedOption && opt.id === selectedOption.id) {
        classes.push('wrong')
      } else {
        classes.push('dimmed')
      }
    }
    return classes.join(' ')
  }

  return (
    <div id="photo-mode" className="quiz-body">
      <div className="photo-container">
        <div className="photo-wrapper">
          <div className={`photo-loading ${imageLoaded ? 'hidden' : ''}`}>
            {imageFailed ? (
              <span style={{ color: 'var(--quiz-text-muted)' }}>Billede ikke tilgængeligt</span>
            ) : (
              <>
                <div className="spinner" />
                <span>Henter billede...</span>
              </>
            )}
          </div>
          {imageUrl && (
            <img
              className={`bird-photo ${imageLoaded ? 'loaded' : ''}`}
              src={imageUrl}
              alt="Fuglebillede"
              onLoad={() => { loadedRef.current = true; setImageLoaded(true) }}
              onError={() => setImageFailed(true)}
            />
          )}
          <div className={`photo-overlay ${answered ? (isCorrectAnswer ? 'correct' : 'wrong') : ''}`} />
        </div>
      </div>
      <div className="question-text">Hvad er dette for en fugl?</div>
      <div className="options-grid">
        {question.options.map(opt => (
          <button
            key={opt.id}
            className={getButtonClass(opt)}
            onClick={() => onAnswer(opt)}
            disabled={answered}
          >
            {opt.name_da}
          </button>
        ))}
      </div>
    </div>
  )
}
