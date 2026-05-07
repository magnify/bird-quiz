'use client'

interface MobileBottomNavProps {
  activePage?: 'home' | 'resultater' | 'om'
  isQuizActive?: boolean
  onNavClick?: (href: string) => void
}

export default function MobileBottomNav({ activePage, isQuizActive = false, onNavClick }: MobileBottomNavProps) {
  return (
    <nav className="mobile-bottom-nav">
      <a
        href="/"
        className={`mobile-nav-item ${activePage === 'home' ? 'active' : ''}`}
        onClick={(e) => {
          if (isQuizActive && onNavClick) {
            e.preventDefault()
            onNavClick('/')
          }
        }}
      >
        <svg className="mobile-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3-8 3 8"/>
          <path d="M5 14c0-2 2-4 7-4s7 2 7 4-2 6-7 6-7-4-7-6z"/>
          <circle cx="14" cy="13" r="0.5" fill="currentColor"/>
        </svg>
        <span className="mobile-nav-label">Quiz</span>
      </a>
      <a
        href="/resultater"
        className={`mobile-nav-item ${activePage === 'resultater' ? 'active' : ''}`}
        onClick={(e) => {
          if (isQuizActive && onNavClick) {
            e.preventDefault()
            onNavClick('/resultater')
          }
        }}
      >
        <svg className="mobile-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18"/>
          <path d="M18 17V9"/>
          <path d="M13 17V5"/>
          <path d="M8 17v-3"/>
        </svg>
        <span className="mobile-nav-label">Resultater</span>
      </a>
      <a
        href="/om"
        className={`mobile-nav-item ${activePage === 'om' ? 'active' : ''}`}
        onClick={(e) => {
          if (isQuizActive && onNavClick) {
            e.preventDefault()
            onNavClick('/om')
          }
        }}
      >
        <svg className="mobile-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
        <span className="mobile-nav-label">Om</span>
      </a>
    </nav>
  )
}
