'use client'

import { LogoSvg } from './Logo'

interface QuizHeaderProps {
  centerContent?: React.ReactNode
  showProgress?: boolean
  progress?: number
  currentQuestion?: number
  totalQuestions?: number
  activePage?: 'quiz' | 'resultater'
  onLogoClick?: () => void
  logoLabel?: string
  isQuizActive?: boolean
  onNavClick?: (href: string) => void
  hideLogo?: boolean
  alignToForm?: boolean
}

export default function QuizHeader({
  centerContent,
  showProgress = false,
  progress = 0,
  currentQuestion,
  totalQuestions,
  activePage = 'quiz',
  onLogoClick,
  logoLabel = 'Fugle Quiz',
  isQuizActive = false,
  onNavClick,
  hideLogo = false,
  alignToForm = false,
}: QuizHeaderProps) {
  const LogoElement = onLogoClick ? 'button' : 'a'
  const logoProps = onLogoClick
    ? { onClick: onLogoClick, type: 'button' as const }
    : { href: '/' }

  return (
    <div className="app-header" {...(alignToForm ? { 'data-align': 'form' } : {})}>
      <div className="app-header-inner">
        {!hideLogo && (
          <LogoElement
            className="app-header-left"
            aria-label={logoLabel}
            {...logoProps}
          >
            <span className="app-header-logo">
              <LogoSvg />
            </span>
            <span className="app-header-title">Fugle Quiz</span>
          </LogoElement>
        )}

        <div className="app-header-center">
          {centerContent ? (
            centerContent
          ) : (
            <div className="secondary-nav-tabs">
              <a
                href="/"
                className={`secondary-nav-link ${activePage === 'quiz' ? 'active' : ''}`}
                onClick={(e) => {
                  if (isQuizActive && onNavClick) {
                    e.preventDefault()
                    onNavClick('/')
                  }
                }}
              >
                Quiz
              </a>
              <a
                href="/resultater"
                className={`secondary-nav-link ${activePage === 'resultater' ? 'active' : ''}`}
                onClick={(e) => {
                  if (isQuizActive && onNavClick) {
                    e.preventDefault()
                    onNavClick('/resultater')
                  }
                }}
              >
                Resultater
              </a>
            </div>
          )}
        </div>

        <div className="app-header-right" aria-hidden="true" />

      </div>
      {showProgress && (
        <div
          className="progress-bar-container"
          role="progressbar"
          aria-valuenow={currentQuestion}
          aria-valuemin={1}
          aria-valuemax={totalQuestions}
          aria-label={`Spørgsmål ${currentQuestion} af ${totalQuestions}`}
        >
          <div className="progress-bar" style={/* dynamic */ { width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}
