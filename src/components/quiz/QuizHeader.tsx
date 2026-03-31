'use client'

const LogoSvg = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 10C30 10 15 30 15 50C15 70 30 90 50 90C55 90 60 85 58 80C56 75 60 72 65 72C70 72 75 68 75 60C75 35 65 10 50 10Z" fill="currentColor" opacity="0.2"/>
    <path d="M25 45C25 45 35 25 55 20C55 20 45 35 50 50C55 65 40 75 30 65C20 55 25 45 25 45Z" fill="currentColor" opacity="0.4"/>
    <circle cx="38" cy="42" r="3" fill="currentColor"/>
    <path d="M20 48L10 45L22 50Z" fill="currentColor" opacity="0.6"/>
  </svg>
)

interface QuizHeaderProps {
  transparent?: boolean
  centerContent?: React.ReactNode
  showProgress?: boolean
  progress?: number
  currentQuestion?: number
  totalQuestions?: number
  activePage?: 'quiz' | 'resultater' | 'rangliste'
  onLogoClick?: () => void
  logoLabel?: string
}

export default function QuizHeader({
  transparent = false,
  centerContent,
  showProgress = false,
  progress = 0,
  currentQuestion,
  totalQuestions,
  activePage = 'quiz',
  onLogoClick,
  logoLabel = 'Fugle Quiz',
}: QuizHeaderProps) {
  const LogoElement = onLogoClick ? 'button' : 'a'
  const logoProps = onLogoClick
    ? { onClick: onLogoClick, type: 'button' as const }
    : { href: '/' }

  return (
    <div className={`app-header ${transparent ? 'app-header--transparent' : ''}`}>
      <div className="app-header-inner">
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

        <div className="app-header-center">
          {centerContent}
        </div>

        <div className="app-header-right">
          <div className="secondary-nav-tabs">
            <a
              href="/resultater"
              className={`secondary-nav-link ${activePage === 'resultater' ? 'active' : ''}`}
            >
              Resultater
            </a>
            <a
              href="/rangliste"
              className={`secondary-nav-link ${activePage === 'rangliste' ? 'active' : ''}`}
            >
              Rangliste
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
