'use client'

import { useState, useEffect, useRef } from 'react'
import type { Bird } from '@/lib/supabase/types'
import type { QuizQuestion as QuizQuestionType } from '@/lib/quiz/engine'
import { useImageErrorHandler } from '@/lib/error-tracking/image-error-handler'

interface QuizQuestionProps {
  question: QuizQuestionType
  questionNumber: number
  totalQuestions: number
  answered: boolean
  selectedOption: Bird | null
  imageUrls: Map<string, string | null>
  onAnswer: (bird: Bird) => void
}

/**
 * Photo option card component - used in name mode
 */
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
  const [failed, setFailed] = useState(false)
  const handleImageError = useImageErrorHandler('QuizQuestion')

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
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
        {failed ? (
          <span style={{ color: 'var(--quiz-text-muted)', fontSize: '0.75rem' }}>Fejl</span>
        ) : imageUrl ? (
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
          onError={(e) => {
            setFailed(true)
            handleImageError(e)
          }}
        />
      )}
      {(isCorrect || (isSelected && !isCorrect)) && (
        <div className="photo-option-badge">{isCorrect ? '✓' : '✗'}</div>
      )}
      <div className="photo-option-label">{bird.name_da}</div>
    </div>
  )
}

/**
 * Unified quiz question component - renders both photo and name modes
 */
export default function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  answered,
  selectedOption,
  imageUrls,
  onAnswer,
}: QuizQuestionProps) {
  const isPhotoMode = question.mode === 'photo'
  const isCorrectAnswer = selectedOption?.id === question.bird.id

  // Photo mode state
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const loadedRef = useRef(false)
  const handleImageError = useImageErrorHandler('QuizQuestion')

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

  function getButtonState(opt: Bird): { className: string; icon: string | null } {
    const classes = ['option-btn']
    let icon: string | null = null
    if (answered) {
      classes.push('disabled')
      if (opt.id === question.bird.id) {
        classes.push('correct')
        icon = '✓'
      } else if (selectedOption && opt.id === selectedOption.id) {
        classes.push('wrong')
        icon = '✗'
      } else {
        classes.push('dimmed')
      }
    }
    return { className: classes.join(' '), icon }
  }

  return (
    <div id="quiz-screen" className="screen active">
      <div className={`quiz-body quiz-body--immersive ${isPhotoMode ? 'quiz-body--photo' : 'quiz-body--name'}`}>
        {isPhotoMode ? (
          // PHOTO MODE: Text options (left) | Bird image (right)
          <>
            <div className="options-area">
              <div className="question-text">Hvad er dette for en fugl?</div>
              <div className="options-grid">
                {question.options.map(opt => {
                  const { className, icon } = getButtonState(opt)
                  return (
                    <button
                      key={opt.id}
                      className={className}
                      onClick={() => onAnswer(opt)}
                      disabled={answered}
                    >
                      <span className="option-indicator">{icon || ''}</span>
                      <span>{opt.name_da}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="photo-stage">
              <div className="photo-stage-inner">
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
                {imageUrls.get(question.bird.id) && (
                  <img
                    className={`bird-photo ${imageLoaded ? 'loaded' : ''} ${answered ? (isCorrectAnswer ? 'correct' : 'wrong') : ''}`}
                    src={imageUrls.get(question.bird.id)!}
                    alt="Fuglebillede"
                    onLoad={() => { loadedRef.current = true; setImageLoaded(true) }}
                    onError={(e) => {
                      setImageFailed(true)
                      handleImageError(e)
                    }}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          // NAME MODE: Bird name question (left) | Photo grid (right)
          <>
            <div className="options-area">
              <div className="question-text">Find billedet af</div>
              <div className="name-display">
                <h2 className="bird-name-text">{question.bird.name_da}</h2>
                <p className="bird-sci-text">{question.bird.scientific_name}</p>
              </div>
            </div>

            <div className="photo-stage">
              <div className="photo-stage-inner">
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
            </div>
          </>
        )}
      </div>
    </div>
  )
}
