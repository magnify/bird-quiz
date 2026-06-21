'use client'

import { useEffect, useRef } from 'react'
import type { Bird } from '@/lib/supabase/types'
import { getBirdImageUrl } from '@/lib/images'
import { BRAND } from '@/lib/brand'
import { MissedBirdsCarousel } from './MissedBirdsCarousel'

interface QuizResultsProps {
  score: number
  totalQuestions: number
  bestStreak: number
  points: number
  missed: Bird[]
  imageUrls: Map<string, string | null>
  onRetry: () => void
  onGoHome: () => void
}

export default function QuizResults({
  score,
  totalQuestions,
  bestStreak,
  points,
  missed,
  imageUrls,
  onRetry,
  onGoHome,
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
  if (pct >= 70) ringColor = 'var(--quiz-correct)'
  else if (pct >= 40) ringColor = 'var(--quiz-warning)'
  else ringColor = 'var(--quiz-wrong)'

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

  const missedCounts = new Map<string, { bird: Bird; count: number }>()
  for (const b of missed) {
    const entry = missedCounts.get(b.id)
    if (entry) {
      entry.count++
    } else {
      missedCounts.set(b.id, { bird: b, count: 1 })
    }
  }
  const uniqueMissed = [...missedCounts.values()]

  const handleShare = async () => {
    const text = `${BRAND.name}: ${score}/${totalQuestions} (${pct}%) — ${points.toLocaleString('da-DK')} point! Kan du slå mig? ${BRAND.domain}`
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <div id="results-screen" className="screen active">
      <div className="results-content">
        <div className="results-header">
          <div className="results-icon">{icon}</div>
          <h2 className="results-title">{title}</h2>
          <p className="results-subtitle">{subtitle}</p>
        </div>

        <div className="results-score-ring" role="img" aria-label={`Score: ${pct} procent`}>
          <svg viewBox="0 0 120 120" className="score-ring-svg" aria-hidden="true">
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

        {points > 0 && (
          <div className="results-points">
            <span className="points-value">{points.toLocaleString('da-DK')}</span>
            <span className="points-label">point</span>
          </div>
        )}

        <div className="results-actions">
          <button className="btn btn--primary btn--block" onClick={onGoHome}>
            <span>Ny quiz</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10"/>
            </svg>
          </button>
          <button className="btn btn--secondary btn--block" onClick={onRetry}>
            <span>Prøv igen</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
          </button>
          <button className="btn btn--secondary btn--block" onClick={handleShare}>
            <span>Del</span>
          </button>
        </div>

        {uniqueMissed.length > 0 && (
          <div className="results-missed">
            <p className="setting-label setting-label--spaced">
              Fugle du missede ({uniqueMissed.length})
            </p>
            <MissedBirdsCarousel
              items={uniqueMissed.map(({ bird, count }) => ({
                key: bird.id,
                nameDa: bird.name_da,
                nameEn: bird.name_en,
                imageUrl: imageUrls.get(bird.id) ?? getBirdImageUrl(bird.scientific_name),
                count,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  )
}
