'use client'

import '../quiz/quiz.css'
import { useState, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link, type Locale } from '@/i18n/routing'
import { loadResults, clearResults, type QuizResult } from '@/lib/quiz/result-history'
import { getBirdImageUrl } from '@/lib/images'
import { ConfirmModal } from './ConfirmModal'
import { MissedBirdsCarousel } from './MissedBirdsCarousel'

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min === 0) return `${sec}s`
  return `${min}m ${sec}s`
}

function dateLocale(locale: Locale): string {
  return locale === 'en' ? 'en-GB' : 'da-DK'
}

function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(dateLocale(locale), { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(dateLocale(locale), { hour: '2-digit', minute: '2-digit' })
}

function dedupeWithCount(
  missed: { nameDa: string; nameEn: string; scientificName: string }[]
): { nameDa: string; nameEn: string; scientificName: string; count: number }[] {
  const counts = new Map<string, { nameDa: string; nameEn: string; scientificName: string; count: number }>()
  for (const b of missed) {
    const entry = counts.get(b.scientificName)
    if (entry) {
      entry.count++
    } else {
      counts.set(b.scientificName, { ...b, count: 1 })
    }
  }
  return [...counts.values()]
}

export default function MyResults() {
  const t = useTranslations('myResults')
  const locale = useLocale() as Locale
  const diffLabel = (d: string) => t(d === 'easy' ? 'diffEasy' : d === 'common' ? 'diffCommon' : d === 'hard' ? 'diffHard' : 'diffAll')
  const modeLabel = (m: string) => t(m === 'photo' ? 'modePhoto' : m === 'name' ? 'modeName' : 'modeMixed')

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

  const [missedTab, setMissedTab] = useState<'most-missed' | 'latest'>('latest')

  const latestMissed = useMemo(() => {
    if (results.length === 0) return []
    return dedupeWithCount(results[0].missed)
  }, [results])

  return (
    <>
      {showClearConfirm && (
        <ConfirmModal
          title={t('clearTitle')}
          text={t('clearText')}
          confirmLabel={t('clearConfirm')}
          variant="danger"
          onConfirm={handleClearConfirm}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
      <div id="my-results-screen" className="screen active">
        <div className="secondary-page-content">

        {!loaded ? (
          <div className="leaderboard-loading">{t('loading')}</div>
        ) : totalGames === 0 ? (
          <div className="my-results-empty">
            <div className="state-card">
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
              <h2 className="my-results-empty-title">{t('emptyTitle')}</h2>
              <p className="my-results-empty-text">
                {t('emptyText')}
              </p>
              <div className="my-results-empty-actions">
                <Link href="/" className="btn btn--accent start-quiz-link">{t('playOne')} &rarr;</Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h1 className="page-title">{t('title')}</h1>
              <p className="page-subtitle">
                {t('subtitle', { count: totalGames })}
              </p>
            </div>
            <div className="my-results-summary">
              <div className="summary-stat">
                <span className="summary-value">{totalGames}</span>
                <span className="summary-label">{t('games')}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">{avgPct}%</span>
                <span className="summary-label">{t('avgScore')}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">{totalPoints.toLocaleString('da-DK')}</span>
                <span className="summary-label">{t('totalPoints')}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">{bestStreak}</span>
                <span className="summary-label">{t('bestStreak')}</span>
              </div>
            </div>

            {results.length > 0 && (
              <div className="result-card result-card--padded">
                <div className="my-results-missed-tabs">
                  <button
                    className={`my-results-missed-tab ${missedTab === 'latest' ? 'active' : ''}`}
                    onClick={() => setMissedTab('latest')}
                  >
                    {t('tabLatest')}
                  </button>
                  <button
                    className={`my-results-missed-tab ${missedTab === 'most-missed' ? 'active' : ''}`}
                    onClick={() => setMissedTab('most-missed')}
                  >
                    {t('tabMostMissed')}
                  </button>
                </div>

                {missedTab === 'most-missed' && weakBirds.length > 0 && (
                  <>
                    <p className="setting-label setting-label--spaced">
                      {t('missed')}
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
                  </>
                )}

                {missedTab === 'latest' && latestMissed.length > 0 && (
                  <>
                    <p className="setting-label setting-label--spaced">
                      {t('missedLatest', { count: latestMissed.length })}
                    </p>
                    <MissedBirdsCarousel
                      items={latestMissed.map(b => ({
                        key: b.scientificName,
                        nameDa: b.nameDa,
                        nameEn: b.nameEn,
                        imageUrl: getBirdImageUrl(b.scientificName),
                        count: b.count,
                      }))}
                    />
                  </>
                )}
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
                          {formatDate(r.date, locale)} {formatTime(r.date, locale)}
                        </span>
                        <span className="result-card-score">
                          {r.score}/{r.totalQuestions} ({pct}%)
                        </span>
                      </div>
                      <div className="result-card-meta">
                        <span className="result-card-tag">{diffLabel(r.difficulty)}</span>
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
                          <span>{t('bestStreak')}</span>
                          <span>{r.bestStreak}</span>
                        </div>
                        {r.missed.length > 0 && (
                          <div className="result-detail-missed">
                            <span className="result-detail-missed-title">
                              {t('wrong', { count: r.missed.length })}
                            </span>
                            <MissedBirdsCarousel
                              items={dedupeWithCount(r.missed).map(b => ({
                                key: b.scientificName,
                                nameDa: b.nameDa,
                                nameEn: b.nameEn,
                                imageUrl: getBirdImageUrl(b.scientificName),
                                count: b.count,
                              }))}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="my-results-footer">
              <button className="btn btn--secondary" onClick={() => setShowClearConfirm(true)}>
                {t('clearHistory')}
              </button>
              <Link href="/" className="btn btn--accent start-quiz-link">{t('newQuiz')} &rarr;</Link>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  )
}
