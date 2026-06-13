'use client'

import Link from 'next/link'
import { LogoSvg } from './Logo'
import { BRAND } from '@/lib/brand'

interface QuizHeaderProps {
  centerContent?: React.ReactNode
  showProgress?: boolean
  progress?: number
  currentQuestion?: number
  totalQuestions?: number
  activePage?: 'quiz' | 'resultater' | 'om'
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
  logoLabel = BRAND.name,
  isQuizActive = false,
  onNavClick,
  hideLogo = false,
  alignToForm = false,
}: QuizHeaderProps) {
  const logoInner = (
    <>
      <span className="app-header-logo">
        <LogoSvg />
      </span>
      <span className="app-header-title">{BRAND.name}</span>
    </>
  )

  return (
    <div className="app-header" {...(alignToForm ? { 'data-align': 'form' } : {})}>
      <div className="app-header-inner">
        {!hideLogo &&
          (onLogoClick ? (
            <button
              type="button"
              className="app-header-left"
              aria-label={logoLabel}
              onClick={onLogoClick}
            >
              {logoInner}
            </button>
          ) : (
            <Link href="/" className="app-header-left" aria-label={logoLabel}>
              {logoInner}
            </Link>
          ))}

        <div className="app-header-center">
          {centerContent ? (
            centerContent
          ) : (
            <div className="secondary-nav-tabs">
              <Link
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
              </Link>
              <Link
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
              </Link>
              <Link
                href="/om"
                className={`secondary-nav-link ${activePage === 'om' ? 'active' : ''}`}
                onClick={(e) => {
                  if (isQuizActive && onNavClick) {
                    e.preventDefault()
                    onNavClick('/om')
                  }
                }}
              >
                Om
              </Link>
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
