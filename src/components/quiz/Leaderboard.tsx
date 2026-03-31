'use client'

import '../quiz/quiz.css'
import { useState, useEffect } from 'react'
import { getLeaderboard, type LeaderboardEntry } from '@/app/actions/leaderboard'
import QuizHeader from './QuizHeader'
import MobileBottomNav from './MobileBottomNav'

type Period = 'all' | 'week' | 'month'

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'easy', label: 'Lette' },
  { value: 'common', label: 'Almindelige' },
  { value: 'all-birds', label: 'Alle fugle' },
]

const PERIOD_OPTIONS = [
  { value: 'all' as Period, label: 'Altid' },
  { value: 'month' as Period, label: 'Måned' },
  { value: 'week' as Period, label: 'Uge' },
]

function difficultyLabel(d: string): string {
  if (d === 'easy') return 'Let'
  if (d === 'common') return 'Alm.'
  return 'Alle'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
}

export default function Leaderboard() {
  const [difficulty, setDifficulty] = useState('all')
  const [period, setPeriod] = useState<Period>('all')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getLeaderboard({
      difficulty: difficulty === 'all' ? null : (difficulty === 'all-birds' ? 'all' : difficulty),
      mode: null,
      period,
    }).then(data => {
      setEntries(data)
    }).catch(() => {
      setEntries([])
    }).finally(() => {
      setLoading(false)
    })
  }, [difficulty, period])

  return (
    <>
      <QuizHeader activePage="rangliste" />
      <div id="leaderboard-screen" className="screen active">
        <div className="secondary-page-content">

        <div className="leaderboard-filters">
          <div className="filter-group">
            {DIFFICULTY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`filter-btn ${difficulty === opt.value ? 'active' : ''}`}
                onClick={() => setDifficulty(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="filter-group">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`filter-btn ${period === opt.value ? 'active' : ''}`}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="leaderboard-loading">Indlæser...</div>
        ) : entries.length === 0 ? (
          <div className="leaderboard-empty">
            Ingen resultater endnu. Vær den første!
          </div>
        ) : (
          <div className="leaderboard-table">
            <div className="leaderboard-row leaderboard-row-header">
              <span className="lb-rank">#</span>
              <span className="lb-name">Navn</span>
              <span className="lb-score">Score</span>
              <span className="lb-points">Point</span>
              <span className="lb-diff">Niv.</span>
              <span className="lb-date">Dato</span>
            </div>
            {entries.map((entry, i) => (
              <div key={entry.id} className={`leaderboard-row ${i < 3 ? 'top-' + (i + 1) : ''}`}>
                <span className="lb-rank">{i + 1}</span>
                <span className="lb-name">{entry.guest_name || 'Anonym'}</span>
                <span className="lb-score">{entry.score}/{entry.question_count}</span>
                <span className="lb-points">{entry.points?.toLocaleString('da-DK') ?? '—'}</span>
                <span className="lb-diff">{difficultyLabel(entry.difficulty)}</span>
                <span className="lb-date">{formatDate(entry.completed_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
      <MobileBottomNav activePage="rangliste" />
    </>
  )
}
