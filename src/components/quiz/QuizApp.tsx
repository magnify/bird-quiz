'use client'

import './quiz.css'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { Bird } from '@/lib/supabase/types'
import { useQuiz } from '@/hooks/useQuiz'
import { useBirdImages } from '@/hooks/useBirdImages'
import { AuthProvider, useAuth } from '@/lib/auth/AuthProvider'
import { migrateGuestData } from '@/app/actions/auth'
import { getGuestId } from '@/lib/identity/guest'
import { getBirdImageUrl } from '@/lib/images'
import QuizSetup from './QuizSetup'
import QuizQuestion from './QuizQuestion'
import QuizResults from './QuizResults'
import AuthModal from './AuthModal'

interface QuizAppProps {
  birds: Bird[]
  memberships: { bird_id: string; group_id: string }[]
}

const LogoSvg = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 10C30 10 15 30 15 50C15 70 30 90 50 90C55 90 60 85 58 80C56 75 60 72 65 72C70 72 75 68 75 60C75 35 65 10 50 10Z" fill="currentColor" opacity="0.2"/>
    <path d="M25 45C25 45 35 25 55 20C55 20 45 35 50 50C55 65 40 75 30 65C20 55 25 45 25 45Z" fill="currentColor" opacity="0.4"/>
    <circle cx="38" cy="42" r="3" fill="currentColor"/>
    <path d="M20 48L10 45L22 50Z" fill="currentColor" opacity="0.6"/>
  </svg>
)

function QuizAppInner({ birds, memberships }: QuizAppProps) {
  const {
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
  } = useQuiz(birds, memberships)

  const { imageUrls, ensureImages } = useBirdImages()
  const { user } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  // Zoom transition state
  const tileRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [transitionData, setTransitionData] = useState<{
    imageUrl: string
    startRect: DOMRect
  } | null>(null)
  const [zoomPhase, setZoomPhase] = useState<'start' | 'end'>('start')

  const handleTileRef = useCallback((birdId: string, el: HTMLElement | null) => {
    if (el) {
      tileRefs.current.set(birdId, el)
    } else {
      tileRefs.current.delete(birdId)
    }
  }, [])

  // Migrate guest data when user signs in
  useEffect(() => {
    if (user) {
      const guestId = getGuestId()
      if (guestId) {
        migrateGuestData(guestId, user.id)
      }
    }
  }, [user])

  // When a question is displayed, ensure images are loaded for all options
  useEffect(() => {
    if (state.screen === 'quiz' && currentQ) {
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

  // Handle transition: when entering transitioning state, start zoom animation
  useEffect(() => {
    if (state.screen === 'transitioning') {
      const firstQ = state.questions[0]
      if (!firstQ) {
        completeTransition()
        return
      }

      // Ensure images for first two questions
      ensureImages(firstQ.options)
      const secondQ = state.questions[1]
      if (secondQ) ensureImages(secondQ.options)

      // Get the tile rect for the first bird
      const tileEl = tileRefs.current.get(firstQ.bird.id)
      if (tileEl) {
        const rect = tileEl.getBoundingClientRect()
        const imageUrl = getBirdImageUrl(firstQ.bird.scientific_name)
        setTransitionData({ imageUrl, startRect: rect })
        setZoomPhase('start')

        // Start the zoom animation
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setZoomPhase('end')
          })
        })

        // Complete transition after animation
        const timer = setTimeout(() => {
          completeTransition()
          setTransitionData(null)
          setZoomPhase('start')
        }, 550)

        return () => clearTimeout(timer)
      } else {
        // No tile ref — skip animation
        completeTransition()
      }
    }
  }, [state.screen, state.questions, completeTransition, ensureImages])

  // Handle logo click
  const handleLogoClick = useCallback(() => {
    if (state.screen === 'quiz') {
      setShowLeaveModal(true)
    } else if (state.screen === 'results') {
      goHome()
    }
  }, [state.screen, goHome])

  const handleLeaveConfirm = useCallback(() => {
    setShowLeaveModal(false)
    quitQuiz()
  }, [quitQuiz])

  const isStart = state.screen === 'start' || state.screen === 'transitioning'

  const progress = state.screen === 'quiz' && state.questions.length > 0
    ? (state.currentQuestion / state.questions.length) * 100
    : 0

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {showLeaveModal && (
        <div className="leave-modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="leave-modal" onClick={e => e.stopPropagation()}>
            <div className="leave-modal-title">Afslut quiz?</div>
            <div className="leave-modal-text">Din fremgang gemmes ikke.</div>
            <div className="leave-modal-actions">
              <button className="leave-modal-continue" onClick={() => setShowLeaveModal(false)}>
                Fortsæt
              </button>
              <button className="leave-modal-quit" onClick={handleLeaveConfirm}>
                Afslut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent header — transparent on start screen, logo hidden on start */}
      <div className={`app-header ${isStart ? 'app-header--transparent' : ''}`}>
        <div className="app-header-inner">
          {!isStart ? (
            <button
              className="app-header-left"
              onClick={handleLogoClick}
              aria-label={state.screen === 'quiz' ? 'Afslut quiz' : 'Fugle Quiz'}
            >
              <span className="app-header-logo">
                <LogoSvg />
              </span>
              <span className="app-header-title">Fugle Quiz</span>
            </button>
          ) : (
            <div className="app-header-left" />
          )}

          <div className="app-header-center">
            {state.screen === 'quiz' && (
              <>
                <span className="question-counter">
                  {state.currentQuestion + 1}/{state.questions.length}
                </span>
                <span className="header-dot">&middot;</span>
                <span className="score-display-item score-display-score">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {state.score}
                </span>
                <span className="header-dot">&middot;</span>
                <span className="score-display-item score-display-points">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  {state.points}
                </span>
              </>
            )}
            {state.screen === 'results' && (
              <span className="score-display-item score-display-points">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                {state.points} point
              </span>
            )}
          </div>

          <div className="app-header-right">
            <a className="app-header-link" href="/resultater">Resultater</a>
            <a className="app-header-link" href="/rangliste">Rangliste</a>
          </div>
        </div>
        {state.screen === 'quiz' && (
          <div
            className="progress-bar-container"
            role="progressbar"
            aria-valuenow={state.currentQuestion + 1}
            aria-valuemin={1}
            aria-valuemax={state.questions.length}
            aria-label={`Spørgsmål ${state.currentQuestion + 1} af ${state.questions.length}`}
          >
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Screens */}
      {(state.screen === 'start' || state.screen === 'transitioning') && (
        <QuizSetup
          difficulty={state.difficulty}
          mode={state.mode}
          totalQuestions={state.totalQuestions}
          onSetDifficulty={setDifficulty}
          onSetMode={setMode}
          onSetTotalQuestions={setTotalQuestions}
          onStart={startQuiz}
          birds={birds}
          firstBirdId={firstBirdId}
          onTileRef={handleTileRef}
          isTransitioning={state.screen === 'transitioning'}
        />
      )}

      {state.screen === 'quiz' && currentQ && (
        <QuizQuestion
          question={currentQ}
          questionNumber={state.currentQuestion}
          totalQuestions={state.questions.length}
          answered={state.answered}
          selectedOption={state.selectedOption}
          imageUrls={imageUrls}
          onAnswer={handleAnswer}
        />
      )}

      {state.screen === 'results' && (
        <QuizResults
          score={state.score}
          totalQuestions={state.questions.length}
          bestStreak={state.bestStreak}
          points={state.points}
          missed={state.missed}
          imageUrls={imageUrls}
          onRetry={startQuiz}
          sessionId={state.sessionId}
        />
      )}

      {/* Zoom transition overlay */}
      {transitionData && (
        <div className="mosaic-zoom-overlay">
          <img
            className={`mosaic-zoom-image ${zoomPhase === 'end' ? 'zoom-end' : ''}`}
            src={transitionData.imageUrl}
            alt=""
            style={
              zoomPhase === 'start'
                ? {
                    top: transitionData.startRect.top,
                    left: transitionData.startRect.left,
                    width: transitionData.startRect.width,
                    height: transitionData.startRect.height,
                  }
                : {
                    top: '50%',
                    left: '50%',
                    width: Math.min(window.innerWidth * 0.5, 600),
                    height: Math.min(window.innerWidth * 0.5, 600) * 0.75,
                    transform: 'translate(-50%, -50%)',
                  }
            }
          />
        </div>
      )}
    </>
  )
}

export default function QuizApp({ birds, memberships }: QuizAppProps) {
  return (
    <AuthProvider>
      <QuizAppInner birds={birds} memberships={memberships} />
    </AuthProvider>
  )
}
