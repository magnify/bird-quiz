'use client'

interface MobileBottomNavProps {
  activePage?: 'home' | 'resultater' | 'rangliste' | 'om' | 'kaffe'
  isQuizActive?: boolean
  onNavClick?: (href: string) => void
}

export default function MobileBottomNav({ activePage, isQuizActive = false, onNavClick }: MobileBottomNavProps) {
  return (
    <nav className="mobile-bottom-nav">
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
        href="/rangliste"
        className={`mobile-nav-item ${activePage === 'rangliste' ? 'active' : ''}`}
        onClick={(e) => {
          if (isQuizActive && onNavClick) {
            e.preventDefault()
            onNavClick('/rangliste')
          }
        }}
      >
        <svg className="mobile-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
        </svg>
        <span className="mobile-nav-label">Rangliste</span>
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
        <svg className="mobile-nav-icon" viewBox="0 0 100 100" fill="currentColor">
          <path d="M50 10C30 10 15 30 15 50C15 70 30 90 50 90C55 90 60 85 58 80C56 75 60 72 65 72C70 72 75 68 75 60C75 35 65 10 50 10Z" opacity="0.2"/>
          <path d="M25 45C25 45 35 25 55 20C55 20 45 35 50 50C55 65 40 75 30 65C20 55 25 45 25 45Z" opacity="0.4"/>
          <circle cx="38" cy="42" r="3"/>
          <path d="M20 48L10 45L22 50Z" opacity="0.6"/>
        </svg>
        <span className="mobile-nav-label">Om</span>
      </a>
      <a
        href="/kaffe"
        className={`mobile-nav-item ${activePage === 'kaffe' ? 'active' : ''}`}
        onClick={(e) => {
          if (isQuizActive && onNavClick) {
            e.preventDefault()
            onNavClick('/kaffe')
          }
        }}
      >
        <svg className="mobile-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
          <line x1="6" y1="2" x2="6" y2="4"/>
          <line x1="10" y1="2" x2="10" y2="4"/>
          <line x1="14" y1="2" x2="14" y2="4"/>
        </svg>
        <span className="mobile-nav-label">Kaffe</span>
      </a>
    </nav>
  )
}
