'use client'

import { useState, useEffect } from 'react'
import { isQuizActive } from '@/lib/quiz/result-history'

interface SecondaryNavProps {
  active: 'resultater' | 'rangliste'
}

export default function SecondaryNav({ active }: SecondaryNavProps) {
  const [quizActive, setQuizActive] = useState(false)

  useEffect(() => {
    setQuizActive(isQuizActive())
  }, [])

  return (
    <nav className="secondary-nav">
      <a href="/" className="secondary-nav-back">
        &larr; {quizActive ? 'Tilbage til quiz' : 'Fugle Quiz'}
      </a>
      <div className="secondary-nav-tabs">
        <a
          href="/resultater"
          className={`secondary-nav-tab ${active === 'resultater' ? 'active' : ''}`}
        >
          Resultater
        </a>
        <a
          href="/rangliste"
          className={`secondary-nav-tab ${active === 'rangliste' ? 'active' : ''}`}
        >
          Rangliste
        </a>
      </div>
    </nav>
  )
}
