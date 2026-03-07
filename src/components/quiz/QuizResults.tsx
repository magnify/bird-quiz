'use client'

import { useEffect, useRef } from 'react'
import type { Bird } from '@/lib/supabase/types'

interface QuizResultsProps {
  score: number
  totalQuestions: number
  bestStreak: number
  missed: Bird[]
  imageUrls: Map<string, string | null>
  onRetry: () => void
  onHome: () => void
}

export default function QuizResults({
  score,
  totalQuestions,
  bestStreak,
  missed,
  imageUrls,
  onRetry,
  onHome,
}: QuizResultsProps) {
  const ringRef = useRef<SVGCircleElement>(null)
  const pct = Math.round((score / totalQuestions) * 100)
  const circumference = 2 * Math.PI * 52

  let icon: string
  let title: string
  let subtitle: string

  if (pct >= 90) {
    icon = '\u{1F3C6}'
    title = 'Fantastisk!'
    subtitle = 'Du er en sand fugleekspert!'
  } else if (pct >= 70) {
    icon = '\u{1F31F}'
    title = 'Flot klaret!'
    subtitle = 'Du kender dine fugle godt.'
  } else if (pct >= 50) {
    icon = '\u{1F44D}'
    title = 'Godt gået!'
    subtitle = 'Der er stadig lidt at lære.'
  } else {
    icon = '\u{1F331}'
    title = 'Øvelse gør mester'
    subtitle = 'Prøv igen og bliv bedre!'
  }

  let ringColor = 'var(--accent)'
  if (pct >= 70) ringColor = 'var(--correct)'
  else if (pct >= 40) ringColor = 'var(--warning)'
  else ringColor = 'var(--wrong)'

  useEffect(() => {
    const ring = ringRef.current
    if (ring) {
      ring.style.strokeDasharray = String(circumference)
      ring.style.strokeDashoffset = String(circumference)
      requestAnimationFrame(() => {
        ring.style.strokeDashoffset = String(
          circumference - (pct / 100) * circumference
        )
        ring.style.stroke = ringColor
      })
    }
  }, [pct, circumference, ringColor])

  // Deduplicate missed birds
  const uniqueMissed = [
    ...new Map(missed.map(b => [b.id, b])).values(),
  ]

  return (
    <div id="results-screen" className="screen active">
      <div className="results-content">
        <div className="results-header">
          <div className="results-icon">{icon}</div>
          <h2 className="results-title">{title}</h2>
          <p className="results-subtitle">{subtitle}</p>
        </div>

        <div className="results-score-ring">
          <svg viewBox="0 0 120 120" className="score-ring-svg">
            <circle cx="60" cy="60" r="52" className="score-ring-bg" />
            <circle
              ref={ringRef}
              cx="60"
              cy="60"
              r="52"
              className="score-ring-fill"
            />
          </svg>
          <div className="score-ring-text">
            <span className="score-ring-pct">{pct}%</span>
          </div>
        </div>

        <div className="results-stats">
          <div className="stat-item correct">
            <span className="stat-number">{score}</span>
            <span className="stat-label">Rigtige</span>
          </div>
          <div className="stat-item wrong">
            <span className="stat-number">{totalQuestions - score}</span>
            <span className="stat-label">Forkerte</span>
          </div>
          <div className="stat-item streak">
            <span className="stat-number">{bestStreak}</span>
            <span className="stat-label">Bedste stime</span>
          </div>
        </div>

        {uniqueMissed.length > 0 && (
          <div className="results-missed">
            <h3>Fugle at øve mere på:</h3>
            <div className="missed-list">
              {uniqueMissed.map(bird => (
                <div key={bird.id} className="missed-item">
                  {imageUrls.get(bird.id) && (
                    <img
                      className="missed-item-thumb"
                      src={imageUrls.get(bird.id)!}
                      alt={bird.name_da}
                    />
                  )}
                  <div className="missed-item-info">
                    <div className="missed-item-da">{bird.name_da}</div>
                    <div className="missed-item-en">{bird.name_en}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="results-actions">
          <button className="start-btn" onClick={onRetry}>
            <span>Prøv igen</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
          </button>
          <button className="secondary-btn" onClick={onHome}>
            <span>Til forsiden</span>
          </button>
        </div>
      </div>
    </div>
  )
}
