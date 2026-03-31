'use client'

import { useEffect, useRef, useState } from 'react'
import type { Bird } from '@/lib/supabase/types'
import { getGuestName, setGuestName } from '@/lib/identity/guest'
import { updateSessionName } from '@/app/actions/quiz'

interface QuizResultsProps {
  score: number
  totalQuestions: number
  bestStreak: number
  points: number
  missed: Bird[]
  imageUrls: Map<string, string | null>
  onRetry: () => void
  onGoHome: () => void
  sessionId: string | null
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
  sessionId,
}: QuizResultsProps) {
  const ringRef = useRef<SVGCircleElement>(null)
  const pct = Math.round((score / totalQuestions) * 100)
  const circumference = 2 * Math.PI * 52
  const [name, setName] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  // Load existing name and sync to DB
  useEffect(() => {
    const existing = getGuestName()
    if (existing) {
      setName(existing)
      setNameSaved(true)
      // Always sync saved name to this session
      if (sessionId) {
        updateSessionName(sessionId, existing)
      }
    }
  }, [sessionId])

  const handleSaveName = () => {
    if (name.trim()) {
      setGuestName(name.trim())
      setNameSaved(true)
      if (sessionId) {
        updateSessionName(sessionId, name.trim())
      }
    }
  }

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

  // Deduplicate missed birds
  const uniqueMissed = [
    ...new Map(missed.map(b => [b.id, b])).values(),
  ]

  // Share score
  const handleShare = async () => {
    const text = `Fugle Quiz: ${score}/${totalQuestions} (${pct}%) — ${points.toLocaleString('da-DK')} point! Kan du slå mig? bird-quiz.magnify.dk`
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

        {!nameSaved && sessionId && (
          <div className="results-name-prompt">
            <p className="name-prompt-text">Gem dit navn til ranglisten:</p>
            <div className="name-input-row">
              <input
                type="text"
                className="name-input"
                placeholder="Dit navn"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                maxLength={30}
              />
              <button className="name-save-btn" onClick={handleSaveName} disabled={!name.trim()}>
                Gem
              </button>
            </div>
          </div>
        )}

        <div className="results-actions">
          <button className="start-btn" onClick={onGoHome}>
            <span>Ny quiz</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10"/>
            </svg>
          </button>
          <button className="secondary-btn" onClick={onRetry}>
            <span>Prøv igen</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
          </button>
          <button className="secondary-btn" onClick={handleShare}>
            <span>Del</span>
          </button>
        </div>

        {uniqueMissed.length > 0 && (
          <details className="results-missed">
            <summary className="missed-summary">
              Fugle at øve mere på ({uniqueMissed.length})
            </summary>
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
          </details>
        )}
      </div>
    </div>
  )
}
