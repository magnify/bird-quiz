'use client'

import '../quiz/quiz.css'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { loadResults, clearResults, type QuizResult } from '@/lib/quiz/result-history'
import { getBirdImageUrl } from '@/lib/images'
import { ConfirmModal } from './ConfirmModal'
import { MissedBirdsCarousel } from './MissedBirdsCarousel'

function difficultyLabel(d: string): string {
  if (d === 'easy') return 'Lette'
  if (d === 'common') return 'Alm.'
  if (d === 'hard') return 'Svære'
  return 'Alle'
}

function modeLabel(m: string): string {
  if (m === 'photo') return 'Foto'
  if (m === 'name') return 'Navn'
  return 'Blandet'
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min === 0) return `${sec}s`
  return `${min}m ${sec}s`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
}

export default function MyResults() {
  const [results, setResults] = useState<QuizResult[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    setResults(loadResults())
    setLoaded(true)
  }, [])

  const handleClearConfirm = () => {
    clearResults()
    setResults([])
    setShowClearConfirm(false)
  }

  // Aggregate stats
  const totalGames = results.length
  const totalCorrect = results.reduce((s, r) => s + r.score, 0)
  const totalQuestions = results.reduce((s, r) => s + r.totalQuestions, 0)
  const totalPoints = results.reduce((s, r) => s + r.points, 0)
  const bestStreak = results.reduce((s, r) => Math.max(s, r.bestStreak), 0)
  const avgPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  // Weak birds: birds missed 2+ times across all sessions, sorted by miss count
  const weakBirds = useMemo(() => {
    const counts = new Map<string, { nameDa: string; nameEn: string; scientificName: string; count: number }>()
    for (const r of results) {
      for (const b of r.missed) {
        const entry = counts.get(b.scientificName)
        if (entry) {
          entry.count++
        } else {
          counts.set(b.scientificName, { nameDa: b.nameDa, nameEn: b.nameEn, scientificName: b.scientificName, count: 1 })
        }
      }
    }
    return [...counts.values()]
      .filter(b => b.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [results])

  return (
    <>
      {showClearConfirm && (
        <ConfirmModal
          title="Slet al historik?"
          text="Dine quizresultater fjernes permanent fra denne enhed."
          confirmLabel="Slet"
          variant="danger"
          onConfirm={handleClearConfirm}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
      <div id="my-results-screen" className="screen active">
        <div className="secondary-page-content">

        <div>
          <h1 className="page-title">Dine resultater</h1>
          {loaded && totalGames > 0 && (
            <p className="page-subtitle">
              Baseret på {totalGames} {totalGames === 1 ? 'quiz' : 'quizzer'} på denne enhed.
            </p>
          )}
        </div>

        {!loaded ? (
          <div className="leaderboard-loading">Indlæser...</div>
        ) : totalGames === 0 ? (
          <div className="my-results-empty">
            <svg
              className="my-results-empty-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
            <h2 className="my-results-empty-title">Ingen resultater endnu</h2>
            <p className="my-results-empty-text">
              Tag din første quiz for at følge din score, dine svage fugle og din historik.
            </p>
            <div className="my-results-empty-actions">
              <Link href="/" className="btn btn--accent start-quiz-link">Spil en quiz &rarr;</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="my-results-summary">
              <div className="summary-stat">
                <span className="summary-value">{totalGames}</span>
                <span className="summary-label">Spil</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">{avgPct}%</span>
                <span className="summary-label">Gns. score</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">{totalPoints.toLocaleString('da-DK')}</span>
                <span className="summary-label">Point i alt</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">{bestStreak}</span>
                <span className="summary-label">Bedste stime</span>
              </div>
            </div>

            {weakBirds.length > 0 && (
              <div className="result-card result-card--padded">
                <p className="setting-label setting-label--spaced">
                  Fugle du missede
                </p>
                <MissedBirdsCarousel
                  items={weakBirds.map(b => ({
                    key: b.scientificName,
                    nameDa: b.nameDa,
                    nameEn: b.nameEn,
                    imageUrl: getBirdImageUrl(b.scientificName),
                    count: b.count,
                  }))}
                />
              </div>
            )}

            <div className="my-results-list">
              {results.map(r => {
                const pct = Math.round((r.score / r.totalQuestions) * 100)
                const isExpanded = expanded === r.id
                return (
                  <div key={r.id} className="result-card">
                    <button
                      className="result-card-header"
                      onClick={() => setExpanded(isExpanded ? null : r.id)}
                    >
                      <div className="result-card-main">
                        <span className="result-card-date">
                          {formatDate(r.date)} {formatTime(r.date)}
                        </span>
                        <span className="result-card-score">
                          {r.score}/{r.totalQuestions} ({pct}%)
                        </span>
                      </div>
                      <div className="result-card-meta">
                        <span className="result-card-tag">{difficultyLabel(r.difficulty)}</span>
                        <span className="result-card-tag">{modeLabel(r.mode)}</span>
                        <span className="result-card-tag">{formatDuration(r.durationMs)}</span>
                        <span className="result-card-points">
                          {r.points.toLocaleString('da-DK')} pt
                        </span>
                      </div>
                      <span className="result-card-chevron">{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {isExpanded && (
                      <div className="result-card-details">
                        <div className="result-detail-row">
                          <span>Bedste stime</span>
                          <span>{r.bestStreak}</span>
                        </div>
                        {r.missed.length > 0 && (
                          <div className="result-detail-missed">
                            <span className="result-detail-missed-title">
                              Forkerte ({r.missed.length})
                            </span>
                            <div className="result-detail-missed-list">
                              {r.missed.map((m, i) => (
                                <span key={i} className="result-missed-bird">
                                  {m.nameDa}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="my-results-footer">
              <Link href="/" className="btn btn--accent start-quiz-link">Ny quiz &rarr;</Link>
              <button className="btn btn--secondary btn--block" onClick={() => setShowClearConfirm(true)}>
                Slet historik
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  )
}
