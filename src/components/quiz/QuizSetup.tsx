'use client'

import type { Difficulty, QuizMode } from '@/lib/quiz/engine'

interface QuizSetupProps {
  difficulty: Difficulty
  mode: QuizMode
  totalQuestions: number
  onSetDifficulty: (d: Difficulty) => void
  onSetMode: (m: QuizMode) => void
  onSetTotalQuestions: (n: number) => void
  onStart: () => void
}

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="setting-group">
      <label className="setting-label">{label}</label>
      <div className="toggle-group">
        {options.map(opt => (
          <button
            key={opt.value}
            className={`toggle-btn ${value === opt.value ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function QuizSetup({
  difficulty,
  mode,
  totalQuestions,
  onSetDifficulty,
  onSetMode,
  onSetTotalQuestions,
  onStart,
}: QuizSetupProps) {
  return (
    <div id="start-screen" className="screen active">
      <div className="start-content">
        <div className="logo-area">
          <div className="logo-icon">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 10C30 10 15 30 15 50C15 70 30 90 50 90C55 90 60 85 58 80C56 75 60 72 65 72C70 72 75 68 75 60C75 35 65 10 50 10Z" fill="currentColor" opacity="0.2"/>
              <path d="M25 45C25 45 35 25 55 20C55 20 45 35 50 50C55 65 40 75 30 65C20 55 25 45 25 45Z" fill="currentColor" opacity="0.4"/>
              <circle cx="38" cy="42" r="3" fill="currentColor"/>
              <path d="M20 48L10 45L22 50Z" fill="currentColor" opacity="0.6"/>
            </svg>
          </div>
          <h1 className="title">Dansk Fugleviden</h1>
          <p className="subtitle">Test din viden om Danmarks fugle</p>
        </div>

        <div className="settings-card">
          <ToggleGroup
            label="Sværhedsgrad"
            options={[
              { value: 'easy' as Difficulty, label: 'Lette fugle' },
              { value: 'common' as Difficulty, label: 'Almindelige fugle' },
              { value: 'all' as Difficulty, label: 'Alle fugle' },
            ]}
            value={difficulty}
            onChange={onSetDifficulty}
          />

          <ToggleGroup
            label="Quiz-type"
            options={[
              { value: 'photo' as QuizMode, label: 'Gæt fugl fra foto' },
              { value: 'name' as QuizMode, label: 'Gæt fra navn' },
              { value: 'mixed' as QuizMode, label: 'Blandet' },
            ]}
            value={mode}
            onChange={onSetMode}
          />

          <ToggleGroup
            label="Antal spørgsmål"
            options={[
              { value: '10', label: '10' },
              { value: '20', label: '20' },
              { value: '40', label: '40' },
            ]}
            value={String(totalQuestions)}
            onChange={(v) => onSetTotalQuestions(parseInt(v, 10))}
          />
        </div>

        <button className="start-btn" onClick={onStart}>
          <span>Start Quiz</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
