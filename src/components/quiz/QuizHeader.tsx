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
}: QuizHeaderProps) {
  const LogoElement = onLogoClick ? 'button' : 'a'
  const logoProps = onLogoClick
    ? { onClick: onLogoClick, type: 'button' as const }
    : { href: '/' }

  return (
    <div className="app-header">
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
          {centerContent}
        </div>

        <div className="app-header-right">
          <div className="secondary-nav-tabs">
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
        </div>
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
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}
